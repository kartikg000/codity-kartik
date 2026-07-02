import request from 'supertest';
import express from 'express';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import authRoutes from '../routes/authRoutes';
import projectRoutes from '../routes/projectRoutes';
import queueRoutes from '../routes/queueRoutes';
import jobRoutes from '../routes/jobRoutes';
import dlqRoutes from '../routes/dlqRoutes';
import metricsRoutes from '../routes/metricsRoutes';
import { prisma } from '../config/prisma';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/dlq', dlqRoutes);
app.use('/api/metrics', metricsRoutes);

let authToken: string;
let organizationId: string;
let projectId: string;
let queueId: string;
let jobId: string;

beforeAll(async () => {
    // Clean up test user if exists
    await prisma.user.deleteMany({ where: { email: 'test_jest@codity.local' } });
});

afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test_jest@codity.local' } });
    await prisma.$disconnect();
});

describe('Distributed Job Scheduler Core API Suite', () => {
    test('Authentication: Signup new user', async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send({
                email: 'test_jest@codity.local',
                password: 'password123',
                name: 'Jest Tester',
            });
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        authToken = res.body.token;
        organizationId = res.body.organizationId;
    });

    test('Projects: Create project', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Test Project',
                organizationId,
            });
        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        projectId = res.body.id;
    });

    test('Queues: Create queue', async () => {
        const res = await request(app)
            .post('/api/queues')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'default-queue',
                projectId,
                priority: 10,
                concurrencyLimit: 5,
            });
        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        queueId = res.body.id;
    });

    test('Jobs: Create immediate job', async () => {
        const res = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                queueId,
                type: 'IMMEDIATE',
                payload: { task: 'send_email', to: 'user@example.com' },
                priority: 5,
            });
        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        expect(res.body.status).toBe('QUEUED');
        jobId = res.body.id;
    });

    test('Jobs: Get job details', async () => {
        const res = await request(app)
            .get(`/api/jobs/${jobId}`)
            .set('Authorization', `Bearer ${authToken}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(jobId);
    });

    test('Metrics: Get overview metrics', async () => {
        const res = await request(app)
            .get('/api/metrics/overview')
            .set('Authorization', `Bearer ${authToken}`);
        expect(res.status).toBe(200);
        expect(res.body.jobs).toBeDefined();
    });
});
