import express from 'express';
import { CardController } from './card.controller';
import { authenticate } from '../../../../../middlewares/auth';
import { requireColumnAccess, requireCardAccess } from '../../../../../middlewares/authorization';
import { validateRequest } from '../../../../../middlewares/validation';
import { createCardSchema, moveCardSchema } from './card.validation';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireColumnAccess);

router.post(
  '/',
  validateRequest(createCardSchema),
  CardController.create
);

// Separate route for moving cards (global endpoint)
const moveRouter = express.Router();
moveRouter.use(authenticate);
moveRouter.use(requireCardAccess);
moveRouter.patch(
  '/:cardId/move',
  validateRequest(moveCardSchema),
  CardController.move
);

export { moveRouter };
export default router;
