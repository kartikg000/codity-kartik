import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import * as dlqService from '../services/dlqService';

const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function listDLQ(req: AuthRequest, res: Response) {
    try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const result = await dlqService.listDeadLetterJobs(req.userId!, parsed.data);
        res.json(result);
    } catch (err: any) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function retryDLQJob(req: AuthRequest, res: Response) {
    try {
        const result = await dlqService.retryDeadLetterJob(
            req.userId!,
            String(req.params.id),
        );
        res.json(result);
    } catch (err: any) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}
