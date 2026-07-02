import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import * as jobService from '../services/jobService';

// ── Validation Schemas ───────────────────────────────────────────────

const createJobSchema = z.object({
    queueId: z.string().uuid(),
    type: z.enum(['IMMEDIATE', 'DELAYED', 'SCHEDULED', 'RECURRING', 'BATCH']),
    payload: z.any(),
    priority: z.number().int().optional(),
    maxAttempts: z.number().int().min(1).max(50).optional(),
    runAt: z.string().datetime().optional(),
    batchId: z.string().optional(),
    cronExpr: z.string().optional(),
});

const createBatchSchema = z.object({
    queueId: z.string().uuid(),
    jobs: z
        .array(
            z.object({
                type: z.enum(['IMMEDIATE', 'DELAYED', 'SCHEDULED', 'RECURRING', 'BATCH']),
                payload: z.any(),
                priority: z.number().int().optional(),
                maxAttempts: z.number().int().min(1).max(50).optional(),
                runAt: z.string().datetime().optional(),
                cronExpr: z.string().optional(),
            }),
        )
        .min(1)
        .max(100),
});

const updateJobSchema = z.object({
    priority: z.number().int().optional(),
    payload: z.any().optional(),
    runAt: z.string().datetime().optional(),
    cronExpr: z.string().optional(),
});

const listQuerySchema = z.object({
    queueId: z.string().uuid().optional(),
    status: z
        .enum(['QUEUED', 'SCHEDULED', 'CLAIMED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD_LETTER'])
        .optional(),
    type: z
        .enum(['IMMEDIATE', 'DELAYED', 'SCHEDULED', 'RECURRING', 'BATCH'])
        .optional(),
    batchId: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

// ── Handlers ─────────────────────────────────────────────────────────

export async function createJob(req: AuthRequest, res: Response) {
    try {
        const parsed = createJobSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const job = await jobService.createJob(req.userId!, parsed.data);
        res.status(201).json(job);
    } catch (err: any) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function createBatchJobs(req: AuthRequest, res: Response) {
    try {
        const parsed = createBatchSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const result = await jobService.createBatchJobs(req.userId!, parsed.data);
        res.status(201).json(result);
    } catch (err: any) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function listJobs(req: AuthRequest, res: Response) {
    try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const result = await jobService.listJobs(req.userId!, parsed.data);
        res.json(result);
    } catch (err: any) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getJob(req: AuthRequest, res: Response) {
    try {
        const job = await jobService.getJob(req.userId!, String(req.params.id));
        res.json(job);
    } catch (err: any) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function updateJob(req: AuthRequest, res: Response) {
    try {
        const parsed = updateJobSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const job = await jobService.updateJob(req.userId!, String(req.params.id), parsed.data);
        res.json(job);
    } catch (err: any) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function deleteJob(req: AuthRequest, res: Response) {
    try {
        await jobService.deleteJob(req.userId!, String(req.params.id));
        res.json({ message: 'Job deleted successfully' });
    } catch (err: any) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}