import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createQueue, listQueues, updateQueue, pauseQueue, resumeQueue } from '../controllers/queueController';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/queues:
 *   post:
 *     summary: Create a new queue
 *     tags: [Queues]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, projectId]
 *             properties:
 *               name: { type: string }
 *               projectId: { type: string, format: uuid }
 *               priority: { type: integer, default: 0 }
 *               concurrencyLimit: { type: integer, default: 5 }
 *     responses:
 *       201:
 *         description: Queue created
 *   get:
 *     summary: List all queues
 *     tags: [Queues]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of queues
 */
router.post('/', createQueue);
router.get('/', listQueues);

/**
 * @openapi
 * /api/queues/{id}:
 *   patch:
 *     summary: Update queue configuration
 *     tags: [Queues]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               priority: { type: integer }
 *               concurrencyLimit: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id', updateQueue);

/**
 * @openapi
 * /api/queues/{id}/pause:
 *   post:
 *     summary: Pause queue execution
 *     tags: [Queues]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paused
 */
router.post('/:id/pause', pauseQueue);

/**
 * @openapi
 * /api/queues/{id}/resume:
 *   post:
 *     summary: Resume queue execution
 *     tags: [Queues]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Resumed
 */
router.post('/:id/resume', resumeQueue);

export default router;