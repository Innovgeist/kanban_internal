import express from 'express';
import { BoardController } from './board.controller';
import { authenticate } from '../../../middlewares/auth';
import { requireProjectMember, requireBoardAccess, requireBoardAdmin } from '../../../middlewares/authorization';
import { validateRequest } from '../../../middlewares/validation';
import { createBoardSchema, updateBoardSchema } from './board.validation';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectMember);

router.get('/', BoardController.getByProject);

router.post(
  '/',
  validateRequest(createBoardSchema),
  BoardController.create
);

// Separate route for getting board by ID (uses requireBoardAccess)
const boardByIdRouter = express.Router();
boardByIdRouter.use(authenticate);
boardByIdRouter.use(requireBoardAccess);
boardByIdRouter.get('/:boardId', BoardController.getById);
boardByIdRouter.patch(
  '/:boardId',
  requireBoardAdmin,
  validateRequest(updateBoardSchema),
  BoardController.update
);
boardByIdRouter.delete(
  '/:boardId',
  requireBoardAdmin,
  BoardController.delete
);

export { boardByIdRouter };
export default router;
