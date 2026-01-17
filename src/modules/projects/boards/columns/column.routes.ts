import express from 'express';
import { ColumnController } from './column.controller';
import { authenticate } from '../../../../middlewares/auth';
import { requireBoardAccess } from '../../../../middlewares/authorization';
import { validateRequest } from '../../../../middlewares/validation';
import { createColumnSchema, reorderColumnsSchema } from './column.validation';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireBoardAccess);

router.post(
  '/',
  validateRequest(createColumnSchema),
  ColumnController.create
);

// Separate route for reordering (global endpoint)
// Note: This endpoint requires board access check in the service/controller
const reorderRouter = express.Router();
reorderRouter.use(authenticate);
reorderRouter.patch(
  '/reorder',
  validateRequest(reorderColumnsSchema),
  ColumnController.reorder
);

export { reorderRouter };
export default router;
