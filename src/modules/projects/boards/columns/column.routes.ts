import express from 'express';
import { ColumnController } from './column.controller';
import { authenticate } from '../../../../middlewares/auth';
import { requireBoardAccess, requireColumnAdmin } from '../../../../middlewares/authorization';
import { validateRequest } from '../../../../middlewares/validation';
import { createColumnSchema, reorderColumnsSchema, updateColumnSchema } from './column.validation';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireBoardAccess);

router.post(
  '/',
  requireColumnAdmin,
  validateRequest(createColumnSchema),
  ColumnController.create
);

// Column by ID routes (update and delete)
const columnByIdRouter = express.Router();
columnByIdRouter.use(authenticate);
columnByIdRouter.use(requireColumnAdmin);
columnByIdRouter.patch(
  '/:columnId',
  validateRequest(updateColumnSchema),
  ColumnController.update
);
columnByIdRouter.delete(
  '/:columnId',
  ColumnController.delete
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

export { reorderRouter, columnByIdRouter };
export default router;
