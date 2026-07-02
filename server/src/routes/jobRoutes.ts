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

router.post('/batch', createBatchJobs);
router.post('/', createJob);
router.get('/', listJobs);
router.get('/:id', getJob);
router.patch('/:id', updateJob);
router.delete('/:id', deleteJob);

export default router;