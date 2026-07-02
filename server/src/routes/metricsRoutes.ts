import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    getOverview,
    getQueueStats,
    getWorkerStats,
    getThroughput,
} from '../controllers/metricsController';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/metrics/overview:
 *   get:
 *     summary: System-wide job counts and success rates
 *     tags: [Metrics]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Overview telemetry
 *
 * /api/metrics/queues:
 *   get:
 *     summary: Per-queue depths and concurrency metrics
 *     tags: [Metrics]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Queue telemetry
 *
 * /api/metrics/workers:
 *   get:
 *     summary: Active worker instances and heartbeats
 *     tags: [Metrics]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Worker status
 *
 * /api/metrics/throughput:
 *   get:
 *     summary: 60-minute execution time series
 *     tags: [Metrics]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Throughput chart data
 */
router.get('/overview', getOverview);
router.get('/queues', getQueueStats);
router.get('/workers', getWorkerStats);
router.get('/throughput', getThroughput);

export default router;
