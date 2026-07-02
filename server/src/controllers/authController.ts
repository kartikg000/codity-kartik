import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { signToken } from '../utils/jwt';
import { z } from 'zod';

const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
});

export async function signup(req: Request, res: Response) {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { email, passwordHash, name },
    });

    const org = await prisma.organization.create({
        data: { name: `${name}'s Organization` },
    });

    const token = signToken({ userId: user.id });
    res.status(201).json({
        token,
        user: { id: user.id, email: user.email, name: user.name },
        organizationId: org.id,
    });
}

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export async function login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
}