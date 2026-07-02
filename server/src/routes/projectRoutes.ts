import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createProject, listProjects, getProject } from '../controllers/projectController';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/projects:
 *   post:
 *     summary: Create a new project workspace
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, organizationId]
 *             properties:
 *               name: { type: string }
 *               organizationId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Project created
 *   get:
 *     summary: List all projects accessible by user
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of projects
 */
router.post('/', createProject);
router.get('/', listProjects);

/**
 * @openapi
 * /api/projects/{id}:
 *   get:
 *     summary: Get project details and queues
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project details
 *       404:
 *         description: Not found
 */
router.get('/:id', getProject);

export default router;