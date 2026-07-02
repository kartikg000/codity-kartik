import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const createProjectSchema = z.object({
    name: z.string().min(1),
    organizationId: z.string().uuid(),
});

export async function createProject(req: AuthRequest, res: Response) {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { name, organizationId } = parsed.data;

    const project = await prisma.project.create({
        data: {
            name,
            organizationId,
            members: {
                create: { userId: req.userId!, role: 'ADMIN' },
            },
        },
    });

    res.status(201).json(project);
}

export async function listProjects(req: AuthRequest, res: Response) {
    const projects = await prisma.project.findMany({
        where: { members: { some: { userId: req.userId! } } },
        include: { queues: true },
    });
    res.json(projects);
}

export async function getProject(req: AuthRequest, res: Response) {
    const id = String(req.params.id);

    const project = await prisma.project.findFirst({
        where: {
            id,
            members: {
                some: {
                    userId: req.userId!,
                },
            },
        },
        include: {
            queues: true,
        },
    });

    if (!project) {
        return res.status(404).json({
            error: 'Project not found',
        });
    }

    res.json(project);
}