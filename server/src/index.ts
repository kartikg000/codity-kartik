import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import queueRoutes from './routes/queueRoutes';
import jobRoutes from './routes/jobRoutes';
import dlqRoutes from './routes/dlqRoutes';
import metricsRoutes from './routes/metricsRoutes';
import { startWorker } from './workers/jobWorker';
import { startScheduler } from './workers/scheduler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(pinoHttp());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/dlq', dlqRoutes);
app.use('/api/metrics', metricsRoutes);

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Start background services if enabled
    if (process.env.ENABLE_WORKER === 'true') {
        await startWorker();
        await startScheduler();
    }
});