import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    createJob,
    createBatchJobs,
    listJobs,
    getJob,
    updateJob,
    deleteJob,
} from '../controllers/jobController';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/jobs/batch:
 *   post:
 *     summary: Atomically enqueue multiple jobs
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [queueId, jobs]
 *             properties:
 *               queueId: { type: string, format: uuid }
 *               jobs: { type: array, items: { type: object } }
 *     responses:
 *       201:
 *         description: Batch created
 */
router.post('/batch', createBatchJobs);

/**
 * @openapi
 * /api/jobs:
 *   post:
 *     summary: Enqueue a single job
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [queueId, type]
 *             properties:
 *               queueId: { type: string, format: uuid }
 *               type: { type: string, enum: [IMMEDIATE, DELAYED, SCHEDULED, RECURRING] }
 *               payload: { type: object }
 *               priority: { type: integer }
 *               runAt: { type: string, format: date-time }
 *               cronExpr: { type: string }
 *     responses:
 *       201:
 *         description: Enqueued
 *   get:
 *     summary: Paginated job explorer
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: queueId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Job listing with total
 */
router.post('/', createJob);
router.get('/', listJobs);

/**
 * @openapi
 * /api/jobs/{id}:
 *   get:
 *     summary: Inspect job details
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Job details
 *   patch:
 *     summary: Update job parameters
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     summary: Cancel or remove job
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.get('/:id', getJob);
router.patch('/:id', updateJob);
router.delete('/:id', deleteJob);

export default router;