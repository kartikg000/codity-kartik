import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

/**
 * Moves a job to the Dead Letter Queue after all retries are exhausted.
 */
export async function moveToDeadLetterQueue(jobId: string, reason: string): Promise<void> {
    await prisma.$transaction([
        prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'DEAD_LETTER',
                finishedAt: new Date(),
            },
        }),
        prisma.deadLetterQueue.create({
            data: {
                jobId,
                reason,
            },
        }),
    ]);

    await prisma.jobLog.create({
        data: {
            jobId,
            level: 'ERROR',
            message: `Moved to Dead Letter Queue: ${reason}`,
        },
    });

    console.log(`[DLQ] Job ${jobId} moved to dead letter queue`);
}

interface ListDLQFilters {
    page?: number;
    limit?: number;
}

/**
 * Lists dead letter queue entries with pagination. Requires user authorization.
 */
export async function listDeadLetterJobs(userId: string, filters: ListDLQFilters) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.DeadLetterQueueWhereInput = {
        job: {
            queue: {
                project: {
                    members: {
                        some: { userId },
                    },
                },
            },
        },
    };

    const [entries, total] = await prisma.$transaction([
        prisma.deadLetterQueue.findMany({
            where,
            include: {
                job: {
                    include: {
                        queue: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { movedAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.deadLetterQueue.count({ where }),
    ]);

    return {
        entries,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

/**
 * Retries a dead-lettered job by resetting its status back to QUEUED.
 */
export async function retryDeadLetterJob(userId: string, dlqId: string) {
    const dlqEntry = await prisma.deadLetterQueue.findUnique({
        where: { id: dlqId },
        include: {
            job: {
                include: {
                    queue: {
                        include: {
                            project: {
                                include: {
                                    members: {
                                        where: { userId },
                                        select: { id: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!dlqEntry) {
        throw { status: 404, message: 'DLQ entry not found' };
    }

    if (dlqEntry.job.queue.project.members.length === 0) {
        throw { status: 403, message: 'You do not have access to this job' };
    }

    await prisma.$transaction([
        prisma.job.update({
            where: { id: dlqEntry.jobId },
            data: {
                status: 'QUEUED',
                attempts: 0,
                runAt: new Date(),
                finishedAt: null,
                workerId: null,
                claimedAt: null,
                startedAt: null,
            },
        }),
        prisma.deadLetterQueue.delete({
            where: { id: dlqId },
        }),
    ]);

    await prisma.jobLog.create({
        data: {
            jobId: dlqEntry.jobId,
            level: 'INFO',
            message: 'Retried from Dead Letter Queue — reset to QUEUED',
        },
    });

    return { message: 'Job retried successfully', jobId: dlqEntry.jobId };
}
