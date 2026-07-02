import { prisma } from '../config/prisma';
import cron from 'node-cron';

const POLL_INTERVAL_MS = 5000;

let pollTimer: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Promotes delayed/scheduled jobs whose runAt has passed to QUEUED status
 * so the worker can pick them up.
 */
async function promoteScheduledJobs(): Promise<void> {
    try {
        const result = await prisma.job.updateMany({
            where: {
                status: 'SCHEDULED',
                runAt: { lte: new Date() },
            },
            data: {
                status: 'QUEUED',
            },
        });

        if (result.count > 0) {
            console.log(`[Scheduler] Promoted ${result.count} scheduled job(s) to QUEUED`);
        }
    } catch (err) {
        console.error('[Scheduler] Failed to promote scheduled jobs:', err);
    }
}

/**
 * Processes recurring scheduled jobs (from the ScheduledJob table).
 * For each due ScheduledJob, creates a new Job row and advances nextRunAt.
 */
async function processRecurringJobs(): Promise<void> {
    try {
        const dueJobs = await prisma.scheduledJob.findMany({
            where: {
                isActive: true,
                nextRunAt: { lte: new Date() },
            },
            include: {
                queue: true,
            },
        });

        for (const scheduled of dueJobs) {
            // Don't create jobs for paused queues
            if (scheduled.queue.status === 'PAUSED') continue;

            // Calculate next run time from cron expression
            const nextRun = getNextCronDate(scheduled.cronExpr);
            if (!nextRun) {
                console.error(`[Scheduler] Invalid cron expression for ScheduledJob ${scheduled.id}: ${scheduled.cronExpr}`);
                continue;
            }

            await prisma.$transaction([
                // Create the job
                prisma.job.create({
                    data: {
                        queueId: scheduled.queueId,
                        type: 'RECURRING',
                        payload: scheduled.payload as any,
                        status: 'QUEUED',
                        runAt: new Date(),
                        cronExpr: scheduled.cronExpr,
                    },
                }),
                // Advance the schedule
                prisma.scheduledJob.update({
                    where: { id: scheduled.id },
                    data: {
                        nextRunAt: nextRun,
                        lastRunAt: new Date(),
                    },
                }),
            ]);

            console.log(`[Scheduler] Created recurring job from schedule ${scheduled.id}, next run at ${nextRun.toISOString()}`);
        }
    } catch (err) {
        console.error('[Scheduler] Failed to process recurring jobs:', err);
    }
}

/**
 * Computes the next occurrence of a cron expression from now.
 */
function getNextCronDate(cronExpr: string): Date | null {
    try {
        if (!cron.validate(cronExpr)) return null;

        // Calculate next run by iterating forward minute by minute up to 24 hours
        const now = new Date();
        const future = new Date(now);
        future.setSeconds(0, 0);
        future.setMinutes(future.getMinutes() + 1);

        for (let i = 0; i < 1440; i++) {
            const testDate = new Date(future.getTime() + i * 60000);
            if (matchesCron(cronExpr, testDate)) {
                return testDate;
            }
        }

        // Default: 1 hour from now
        return new Date(now.getTime() + 3600000);
    } catch {
        return null;
    }
}

/**
 * Checks if a given date matches a cron expression.
 */
function matchesCron(cronExpr: string, date: Date): boolean {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length < 5) return false;

    const [minExpr, hourExpr, domExpr, monExpr, dowExpr] = parts;

    return (
        fieldMatches(minExpr, date.getMinutes(), 0, 59) &&
        fieldMatches(hourExpr, date.getHours(), 0, 23) &&
        fieldMatches(domExpr, date.getDate(), 1, 31) &&
        fieldMatches(monExpr, date.getMonth() + 1, 1, 12) &&
        fieldMatches(dowExpr, date.getDay(), 0, 7)
    );
}

/**
 * Matches a single cron field (supports *, numbers, ranges, steps, and lists).
 */
function fieldMatches(expr: string, value: number, min: number, max: number): boolean {
    if (expr === '*') return true;

    const parts = expr.split(',');
    for (const part of parts) {
        if (part.includes('/')) {
            const [range, stepStr] = part.split('/');
            const step = parseInt(stepStr, 10);
            const start = range === '*' ? min : parseInt(range, 10);
            for (let i = start; i <= max; i += step) {
                if (i === value) return true;
            }
        } else if (part.includes('-')) {
            const [lo, hi] = part.split('-').map(Number);
            if (value >= lo && value <= hi) return true;
        } else {
            if (parseInt(part, 10) === value) return true;
        }
    }

    return false;
}

/**
 * Main scheduler poll loop.
 */
async function poll(): Promise<void> {
    if (isRunning) return;
    isRunning = true;

    try {
        await promoteScheduledJobs();
        await processRecurringJobs();
    } finally {
        isRunning = false;
    }
}

/**
 * Starts the scheduler service.
 */
export async function startScheduler(): Promise<void> {
    console.log('[Scheduler] Starting scheduler service...');

    // Run immediately on startup
    await poll();

    // Then poll every 5 seconds
    pollTimer = setInterval(poll, POLL_INTERVAL_MS);

    console.log('[Scheduler] Scheduler service started — polling every 5s');
}

/**
 * Stops the scheduler.
 */
export function stopScheduler(): void {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    console.log('[Scheduler] Scheduler stopped');
}
