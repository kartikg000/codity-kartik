import { prisma } from '../config/prisma';
import { JobType, JobStatus, Prisma } from '@prisma/client';

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Verifies that the given queue exists, belongs to a project the user
 * is a member of, and is not paused.  Returns the queue or throws.
 */
async function verifyQueueAccess(userId: string, queueId: string) {
    const queue = await prisma.queue.findUnique({
        where: { id: queueId },
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
    });

    if (!queue) {
        throw { status: 404, message: 'Queue not found' };
    }

    if (queue.project.members.length === 0) {
        throw { status: 403, message: 'You do not have access to this queue' };
    }

    return queue;
}

/**
 * Verifies the user has access to a specific job via the
 * job → queue → project → member chain.  Returns the job or throws.
 */
async function verifyJobAccess(userId: string, jobId: string) {
    const job = await prisma.job.findUnique({
        where: { id: jobId },
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
    });

    if (!job) {
        throw { status: 404, message: 'Job not found' };
    }

    if (job.queue.project.members.length === 0) {
        throw { status: 403, message: 'You do not have access to this job' };
    }

    return job;
}

// ── Service Functions ────────────────────────────────────────────────

interface CreateJobInput {
    queueId: string;
    type: JobType;
    payload: Prisma.InputJsonValue;
    priority?: number;
    maxAttempts?: number;
    runAt?: string;
    batchId?: string;
    cronExpr?: string;
}

export async function createJob(userId: string, data: CreateJobInput) {
    const queue = await verifyQueueAccess(userId, data.queueId);

    if (queue.status === 'PAUSED') {
        throw { status: 400, message: 'Cannot create jobs on a paused queue' };
    }

    const status: JobStatus =
        data.type === 'SCHEDULED' || data.type === 'DELAYED'
            ? 'SCHEDULED'
            : 'QUEUED';

    const job = await prisma.job.create({
        data: {
            queueId: data.queueId,
            type: data.type,
            payload: data.payload,
            priority: data.priority ?? 0,
            maxAttempts: data.maxAttempts ?? queue.retryPolicyId
                ? 5
                : 5,
            status,
            runAt: data.runAt ? new Date(data.runAt) : new Date(),
            batchId: data.batchId,
            cronExpr: data.cronExpr,
        },
    });

    return job;
}

interface CreateBatchInput {
    queueId: string;
    jobs: Array<{
        type: JobType;
        payload: Prisma.InputJsonValue;
        priority?: number;
        maxAttempts?: number;
        runAt?: string;
        cronExpr?: string;
    }>;
}

export async function createBatchJobs(userId: string, data: CreateBatchInput) {
    const queue = await verifyQueueAccess(userId, data.queueId);

    if (queue.status === 'PAUSED') {
        throw { status: 400, message: 'Cannot create jobs on a paused queue' };
    }

    const batchId = crypto.randomUUID();

    const created = await prisma.$transaction(
        data.jobs.map((j) => {
            const status: JobStatus =
                j.type === 'SCHEDULED' || j.type === 'DELAYED'
                    ? 'SCHEDULED'
                    : 'QUEUED';

            return prisma.job.create({
                data: {
                    queueId: data.queueId,
                    type: j.type,
                    payload: j.payload,
                    priority: j.priority ?? 0,
                    maxAttempts: j.maxAttempts ?? 5,
                    status,
                    runAt: j.runAt ? new Date(j.runAt) : new Date(),
                    cronExpr: j.cronExpr,
                    batchId,
                },
            });
        }),
    );

    return { batchId, jobs: created };
}

interface ListJobsFilters {
    queueId?: string;
    status?: JobStatus;
    type?: JobType;
    batchId?: string;
    page?: number;
    limit?: number;
}

export async function listJobs(userId: string, filters: ListJobsFilters) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const skip = (page - 1) * limit;

    // Build a where clause that restricts to queues the user can access
    const where: Prisma.JobWhereInput = {
        queue: {
            project: {
                members: {
                    some: { userId },
                },
            },
        },
    };

    if (filters.queueId) where.queueId = filters.queueId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.batchId) where.batchId = filters.batchId;

    const [jobs, total] = await prisma.$transaction([
        prisma.job.findMany({
            where,
            include: { queue: { select: { id: true, name: true } } },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
            skip,
            take: limit,
        }),
        prisma.job.count({ where }),
    ]);

    return {
        jobs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getJob(userId: string, jobId: string) {
    const job = await prisma.job.findUnique({
        where: { id: jobId },
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
            executions: {
                orderBy: { startedAt: 'desc' },
            },
            logs: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!job) {
        throw { status: 404, message: 'Job not found' };
    }

    if (job.queue.project.members.length === 0) {
        throw { status: 403, message: 'You do not have access to this job' };
    }

    // Strip the nested project/member info before returning
    const { project, ...queueData } = job.queue;
    return { ...job, queue: queueData };
}

const UPDATABLE_FIELDS = ['priority', 'payload', 'runAt', 'cronExpr'] as const;
type UpdatableField = typeof UPDATABLE_FIELDS[number];

interface UpdateJobInput {
    priority?: number;
    payload?: Prisma.InputJsonValue;
    runAt?: string;
    cronExpr?: string;
}

export async function updateJob(
    userId: string,
    jobId: string,
    data: UpdateJobInput,
) {
    const existing = await verifyJobAccess(userId, jobId);

    const terminalStatuses: JobStatus[] = ['RUNNING', 'COMPLETED', 'DEAD_LETTER'];
    if (terminalStatuses.includes(existing.status)) {
        throw {
            status: 400,
            message: `Cannot update a job with status ${existing.status}`,
        };
    }

    // Build update data from whitelisted fields only
    const updateData: Prisma.JobUpdateInput = {};
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.payload !== undefined) updateData.payload = data.payload;
    if (data.runAt !== undefined) updateData.runAt = new Date(data.runAt);
    if (data.cronExpr !== undefined) updateData.cronExpr = data.cronExpr;

    if (Object.keys(updateData).length === 0) {
        throw { status: 400, message: 'No valid fields to update' };
    }

    const updated = await prisma.job.update({
        where: { id: jobId },
        data: updateData,
    });

    return updated;
}

export async function deleteJob(userId: string, jobId: string) {
    const existing = await verifyJobAccess(userId, jobId);

    if (existing.status === 'RUNNING') {
        throw {
            status: 400,
            message: 'Cannot delete a running job. Wait for it to complete or fail.',
        };
    }

    await prisma.job.delete({ where: { id: jobId } });
}
