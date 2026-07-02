import { prisma } from '../config/prisma';
import { Job } from '@prisma/client';
import { executeJob } from './jobExecutor';
import { handleJobFailure } from '../services/retryService';
import os from 'os';

const POLL_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_CONCURRENT_JOBS = 5;

let workerId: string | null = null;
let isShuttingDown = false;
let pollTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let activeJobs = 0;

/**
 * Registers this process as a worker in the database.
 */
async function registerWorker(): Promise<string> {
    const worker = await prisma.worker.create({
        data: {
            hostname: os.hostname(),
            status: 'ONLINE',
        },
    });
    console.log(`[Worker] Registered as ${worker.id} on ${worker.hostname}`);
    return worker.id;
}

/**
 * Sends a heartbeat to indicate the worker is still alive.
 */
async function sendHeartbeat(): Promise<void> {
    if (!workerId || isShuttingDown) return;

    try {
        await prisma.$transaction([
            prisma.worker.update({
                where: { id: workerId },
                data: { lastHeartbeat: new Date() },
            }),
            prisma.workerHeartbeat.create({
                data: {
                    workerId: workerId,
                    metrics: {
                        activeJobs,
                        hostname: os.hostname(),
                        uptime: process.uptime(),
                        memoryUsage: process.memoryUsage().heapUsed,
                    },
                },
            }),
        ]);
    } catch (err) {
        console.error('[Worker] Heartbeat failed:', err);
    }
}

/**
 * Atomically claims jobs from the database using SELECT ... FOR UPDATE SKIP LOCKED.
 * This prevents duplicate execution across multiple worker instances.
 */
async function claimJobs(): Promise<Job[]> {
    if (!workerId || isShuttingDown) return [];

    const slotsAvailable = MAX_CONCURRENT_JOBS - activeJobs;
    if (slotsAvailable <= 0) return [];

    try {
        // Use raw SQL for atomic job claiming with SKIP LOCKED
        const claimed = await prisma.$queryRaw<Job[]>`
            UPDATE "Job"
            SET
                status = 'CLAIMED'::"JobStatus",
                "workerId" = ${workerId},
                "claimedAt" = NOW()
            WHERE id IN (
                SELECT id FROM "Job"
                WHERE status = 'QUEUED'
                AND "runAt" <= NOW()
                ORDER BY priority DESC, "createdAt" ASC
                LIMIT ${slotsAvailable}
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *
        `;

        return claimed;
    } catch (err) {
        console.error('[Worker] Claim failed:', err);
        return [];
    }
}

/**
 * Processes a single claimed job through its full lifecycle.
 */
async function processJob(job: Job): Promise<void> {
    activeJobs++;

    try {
        // Transition to RUNNING
        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: 'RUNNING',
                startedAt: new Date(),
            },
        });

        // Create execution record
        const execution = await prisma.jobExecution.create({
            data: {
                jobId: job.id,
                workerId: workerId!,
                attemptNo: job.attempts + 1,
                status: 'RUNNING',
            },
        });

        // Execute the job
        const result = await executeJob(job);

        if (result.success) {
            // Job succeeded
            await prisma.$transaction([
                prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'COMPLETED',
                        finishedAt: new Date(),
                        attempts: job.attempts + 1,
                    },
                }),
                prisma.jobExecution.update({
                    where: { id: execution.id },
                    data: {
                        status: 'COMPLETED',
                        finishedAt: new Date(),
                    },
                }),
            ]);
            console.log(`[Worker] Job ${job.id} completed successfully`);
        } else {
            // Job failed — delegate to retry service
            await prisma.jobExecution.update({
                where: { id: execution.id },
                data: {
                    status: 'FAILED',
                    finishedAt: new Date(),
                    error: result.error,
                },
            });

            await handleJobFailure(job, result.error ?? 'Unknown error');
        }
    } catch (err: any) {
        console.error(`[Worker] Unexpected error processing job ${job.id}:`, err);

        // Mark as failed on unexpected errors
        try {
            await handleJobFailure(job, err.message ?? 'Unexpected worker error');
        } catch (retryErr) {
            console.error(`[Worker] Failed to handle failure for job ${job.id}:`, retryErr);
        }
    } finally {
        activeJobs--;
    }
}

/**
 * Main poll loop — claims and processes jobs.
 */
async function poll(): Promise<void> {
    if (isShuttingDown) return;

    const jobs = await claimJobs();

    if (jobs.length > 0) {
        console.log(`[Worker] Claimed ${jobs.length} job(s)`);
    }

    // Process all claimed jobs concurrently (non-blocking)
    for (const job of jobs) {
        processJob(job).catch((err) =>
            console.error(`[Worker] Unhandled error in processJob:`, err),
        );
    }
}

/**
 * Graceful shutdown handler.
 */
async function shutdown(): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('[Worker] Shutting down gracefully...');

    // Stop polling and heartbeats
    if (pollTimer) clearInterval(pollTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    // Wait for in-flight jobs to complete (max 30s)
    const maxWait = 30000;
    const start = Date.now();
    while (activeJobs > 0 && Date.now() - start < maxWait) {
        console.log(`[Worker] Waiting for ${activeJobs} active job(s) to finish...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Mark worker as offline
    if (workerId) {
        try {
            await prisma.worker.update({
                where: { id: workerId },
                data: { status: 'OFFLINE' },
            });
            console.log('[Worker] Marked as OFFLINE');
        } catch (err) {
            console.error('[Worker] Failed to mark as offline:', err);
        }
    }

    console.log('[Worker] Shutdown complete');
}

/**
 * Starts the worker service.
 */
export async function startWorker(): Promise<void> {
    console.log('[Worker] Starting worker service...');

    workerId = await registerWorker();

    // Start poll loop
    pollTimer = setInterval(poll, POLL_INTERVAL_MS);

    // Start heartbeat loop
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Send initial heartbeat
    await sendHeartbeat();

    // Register shutdown handlers
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    console.log('[Worker] Worker service started — polling every 2s');
}
