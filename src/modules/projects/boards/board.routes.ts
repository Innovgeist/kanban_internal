import express from 'express';
import { BoardController } from './board.controller';
import { authenticate } from '../../../middlewares/auth';
import { requireProjectMember, requireBoardAccess } from '../../../middlewares/authorization';
import { validateRequest } from '../../../middlewares/validation';
import { createBoardSchema } from './board.validation';

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

export { boardByIdRouter };
export default router;
