import express from 'express';
import { ProjectController } from './project.controller';
import { authenticate } from '../../middlewares/auth';
import { requireSuperAdmin } from '../../middlewares/authorization';
import { validateRequest } from '../../middlewares/validation';
import { createProjectSchema } from './project.validation';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  requireSuperAdmin,
  validateRequest(createProjectSchema),
  ProjectController.create
);

router.get('/', ProjectController.getUserProjects);
router.get('/:projectId', ProjectController.getById);

export default router;
