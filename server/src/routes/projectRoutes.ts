import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createProject, listProjects, getProject } from '../controllers/projectController';

const router = Router();
router.use(requireAuth);
router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id', getProject);

export default router;