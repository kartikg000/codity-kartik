import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createQueue, listQueues, updateQueue, pauseQueue, resumeQueue } from '../controllers/queueController';

const router = Router();
router.use(requireAuth);
router.post('/', createQueue);
router.get('/', listQueues);
router.patch('/:id', updateQueue);
router.post('/:id/pause', pauseQueue);
router.post('/:id/resume', resumeQueue);

export default router;