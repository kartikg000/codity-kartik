import { prisma } from '../config/prisma';

/**
 * Returns a high-level overview of the system: total counts by status,
 * active workers, etc.
 */
export async function getOverview() {
    const [
        totalJobs,
        queuedJobs,
        runningJobs,
        completedJobs,
        failedJobs,
        deadLetterJobs,
        totalQueues,
        activeQueues,
        pausedQueues,
        totalWorkers,
        onlineWorkers,
        totalDLQ,
    ] = await prisma.$transaction([
        prisma.job.count(),
        prisma.job.count({ where: { status: 'QUEUED' } }),
        prisma.job.count({ where: { status: 'RUNNING' } }),
        prisma.job.count({ where: { status: 'COMPLETED' } }),
        prisma.job.count({ where: { status: 'FAILED' } }),
        prisma.job.count({ where: { status: 'DEAD_LETTER' } }),
        prisma.queue.count(),
        prisma.queue.count({ where: { status: 'ACTIVE' } }),
        prisma.queue.count({ where: { status: 'PAUSED' } }),
        prisma.worker.count(),
        prisma.worker.count({ where: { status: 'ONLINE' } }),
        prisma.deadLetterQueue.count(),
    ]);

    const successRate = completedJobs + failedJobs > 0
        ? Math.round((completedJobs / (completedJobs + failedJobs)) * 10000) / 100
        : 0;

    return {
        jobs: {
            total: totalJobs,
            queued: queuedJobs,
            running: runningJobs,
            completed: completedJobs,
            failed: failedJobs,
            deadLetter: deadLetterJobs,
            successRate,
        },
        queues: {
            total: totalQueues,
            active: activeQueues,
            paused: pausedQueues,
        },
        workers: {
            total: totalWorkers,
            online: onlineWorkers,
        },
        dlq: {
            total: totalDLQ,
        },
    };
}

/**
 * Returns per-queue statistics: depth (queued + scheduled count), running,
 * completed, failed.
 */
export async function getQueueStats() {
    const queues = await prisma.queue.findMany({
        include: {
            _count: {
                select: {
                    jobs: true,
                },
            },
            project: {
                select: { id: true, name: true },
            },
        },
    });

    const stats = await Promise.all(
        queues.map(async (queue) => {
            const [depth, running, completed, failed] = await prisma.$transaction([
                prisma.job.count({
                    where: { queueId: queue.id, status: { in: ['QUEUED', 'SCHEDULED'] } },
                }),
                prisma.job.count({
                    where: { queueId: queue.id, status: 'RUNNING' },
                }),
                prisma.job.count({
                    where: { queueId: queue.id, status: 'COMPLETED' },
                }),
                prisma.job.count({
                    where: { queueId: queue.id, status: 'FAILED' },
                }),
            ]);

            return {
                id: queue.id,
                name: queue.name,
                status: queue.status,
                project: queue.project,
                concurrencyLimit: queue.concurrencyLimit,
                priority: queue.priority,
                depth,
                running,
                completed,
                failed,
                totalJobs: queue._count.jobs,
            };
        }),
    );

    return stats;
}

/**
 * Returns all workers with their status and last heartbeat.
 */
export async function getWorkerStats() {
    const workers = await prisma.worker.findMany({
        include: {
            _count: {
                select: {
                    jobs: true,
                    executions: true,
                },
            },
            heartbeats: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return workers.map((w) => ({
        id: w.id,
        hostname: w.hostname,
        status: w.status,
        lastHeartbeat: w.lastHeartbeat,
        createdAt: w.createdAt,
        activeJobs: w._count.jobs,
        totalExecutions: w._count.executions,
        latestMetrics: w.heartbeats[0]?.metrics ?? null,
    }));
}

/**
 * Returns job throughput as a time-series of jobs created per minute
 * over the last 60 minutes.
 */
export async function getThroughput() {
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get completed and failed jobs over the last 60 min for throughput
    const jobs = await prisma.job.findMany({
        where: {
            finishedAt: { gte: sixtyMinutesAgo },
            status: { in: ['COMPLETED', 'FAILED'] },
        },
        select: {
            status: true,
            finishedAt: true,
        },
        orderBy: { finishedAt: 'asc' },
    });

    // Bucket into 1-minute windows
    const buckets: Record<string, { completed: number; failed: number }> = {};

    // Pre-fill all 60 minute buckets
    for (let i = 0; i < 60; i++) {
        const bucketTime = new Date(Date.now() - (59 - i) * 60 * 1000);
        const key = `${bucketTime.getHours().toString().padStart(2, '0')}:${bucketTime.getMinutes().toString().padStart(2, '0')}`;
        buckets[key] = { completed: 0, failed: 0 };
    }

    for (const job of jobs) {
        if (!job.finishedAt) continue;
        const key = `${job.finishedAt.getHours().toString().padStart(2, '0')}:${job.finishedAt.getMinutes().toString().padStart(2, '0')}`;
        if (buckets[key]) {
            if (job.status === 'COMPLETED') buckets[key].completed++;
            else if (job.status === 'FAILED') buckets[key].failed++;
        }
    }

    return Object.entries(buckets).map(([time, counts]) => ({
        time,
        ...counts,
        total: counts.completed + counts.failed,
    }));
}
