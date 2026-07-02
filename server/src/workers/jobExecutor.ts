import { prisma } from '../config/prisma';
import { Job } from '@prisma/client';

/**
 * Simulates executing a job.  In a real system, this would dispatch
 * to actual task handlers based on the job payload.  Here we simulate
 * work with a short delay and a random success/failure outcome.
 */
export async function executeJob(job: Job): Promise<{ success: boolean; error?: string }> {
    // Log that execution started
    await prisma.jobLog.create({
        data: {
            jobId: job.id,
            level: 'INFO',
            message: `Executing job type=${job.type} payload=${JSON.stringify(job.payload)}`,
        },
    });

    // Simulate variable work duration (500ms – 3s)
    const duration = 500 + Math.random() * 2500;
    await new Promise((resolve) => setTimeout(resolve, duration));

    // 85% success rate for simulation
    const succeeded = Math.random() < 0.85;

    if (succeeded) {
        await prisma.jobLog.create({
            data: {
                jobId: job.id,
                level: 'INFO',
                message: `Job completed successfully in ${Math.round(duration)}ms`,
            },
        });
        return { success: true };
    }

    const errorMessage = `Simulated failure after ${Math.round(duration)}ms`;
    await prisma.jobLog.create({
        data: {
            jobId: job.id,
            level: 'ERROR',
            message: errorMessage,
        },
    });
    return { success: false, error: errorMessage };
}
