import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listDLQ, retryDLQJob } from '../controllers/dlqController';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/dlq:
 *   get:
 *     summary: List dead letter queue entries
 *     tags: [Dead Letter Queue]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of DLQ jobs
 *
 * /api/dlq/{id}/retry:
 *   post:
 *     summary: Replay failed job back to active queue
 *     tags: [Dead Letter Queue]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Replayed to active queue
 */
router.get('/', listDLQ);
router.post('/:id/retry', retryDLQJob);

export default router;
