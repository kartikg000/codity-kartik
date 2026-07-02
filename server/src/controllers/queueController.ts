import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const createQueueSchema = z.object({
    name: z.string().min(1),
    projectId: z.string().uuid(),
    priority: z.number().int().default(0),
    concurrencyLimit: z.number().int().min(1).default(5),
});

export async function createQueue(req: AuthRequest, res: Response) {
    const parsed = createQueueSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: parsed.error.flatten(),
        });
    }

    const queue = await prisma.queue.create({
        data: parsed.data,
    });

    res.status(201).json(queue);
}

export async function listQueues(req: AuthRequest, res: Response) {
    const projectId = req.query.projectId
        ? String(req.query.projectId)
        : undefined;

    const queues = await prisma.queue.findMany({
        where: projectId
            ? {
                projectId,
            }
            : undefined,
    });

    res.json(queues);
}

export async function updateQueue(req: AuthRequest, res: Response) {
    const id = String(req.params.id);

    const queue = await prisma.queue.update({
        where: {
            id,
        },
        data: req.body,
    });

    res.json(queue);
}

export async function pauseQueue(req: AuthRequest, res: Response) {
    const id = String(req.params.id);

    const queue = await prisma.queue.update({
        where: {
            id,
        },
        data: {
            status: 'PAUSED',
        },
    });

    res.json(queue);
}

export async function resumeQueue(req: AuthRequest, res: Response) {
    const id = String(req.params.id);

    const queue = await prisma.queue.update({
        where: {
            id,
        },
        data: {
            status: 'ACTIVE',
        },
    });

    res.json(queue);
}