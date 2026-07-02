import { prisma } from '../config/prisma';
import { Job } from '@prisma/client';
import { moveToDeadLetterQueue } from './dlqService';

/**
 * Calculates the retry delay based on the strategy.
 *   Fixed:       baseDelayMs
 *   Linear:      baseDelayMs * attemptNo
 *   Exponential: baseDelayMs * 2^(attemptNo - 1)
 */
function calculateDelay(
    strategy: 'FIXED' | 'LINEAR' | 'EXPONENTIAL',
    baseDelayMs: number,
    attemptNo: number,
): number {
    switch (strategy) {
        case 'FIXED':
            return baseDelayMs;
        case 'LINEAR':
            return baseDelayMs * attemptNo;
        case 'EXPONENTIAL':
            return baseDelayMs * Math.pow(2, attemptNo - 1);
        default:
            return baseDelayMs;
    }
}

/**
 * Handles a failed job:
 *   - If retries remain → requeue with calculated delay
 *   - If exhausted → move to DLQ
 */
export async function handleJobFailure(job: Job, errorMessage: string): Promise<void> {
    const newAttempts = job.attempts + 1;

    // Check if we've exhausted retries
    if (newAttempts >= job.maxAttempts) {
        console.log(`[Retry] Job ${job.id} exhausted all ${job.maxAttempts} attempts — moving to DLQ`);
        await moveToDeadLetterQueue(
            job.id,
            `Exhausted ${job.maxAttempts} attempts. Last error: ${errorMessage}`,
        );
        return;
    }

    // Look up the queue's retry policy
    const queue = await prisma.queue.findUnique({
        where: { id: job.queueId },
        include: { retryPolicy: true },
    });

    // Default retry config if no policy is attached
    const strategy = queue?.retryPolicy?.strategy ?? 'EXPONENTIAL';
    const baseDelayMs = queue?.retryPolicy?.baseDelayMs ?? 1000;

    const delayMs = calculateDelay(strategy, baseDelayMs, newAttempts);
    const nextRunAt = new Date(Date.now() + delayMs);

    console.log(
        `[Retry] Job ${job.id} failed (attempt ${newAttempts}/${job.maxAttempts}). ` +
        `Strategy=${strategy}, retrying in ${delayMs}ms at ${nextRunAt.toISOString()}`,
    );

    // Requeue the job with updated attempts and runAt
    await prisma.job.update({
        where: { id: job.id },
        data: {
            status: 'QUEUED',
            attempts: newAttempts,
            runAt: nextRunAt,
            finishedAt: new Date(),
            workerId: null,
            claimedAt: null,
            startedAt: null,
        },
    });
}
