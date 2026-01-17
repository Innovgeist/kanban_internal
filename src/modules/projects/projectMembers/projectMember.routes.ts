import express from 'express';
import { ProjectMemberController } from './projectMember.controller';
import { authenticate } from '../../../middlewares/auth';
import { requireProjectAdmin, requireProjectMember } from '../../../middlewares/authorization';
import { validateRequest } from '../../../middlewares/validation';
import { addMemberSchema } from './projectMember.validation';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectMember);

router.get('/', ProjectMemberController.getMembers);

router.post(
  '/',
  requireProjectAdmin,
  validateRequest(addMemberSchema),
  ProjectMemberController.addMember
);

router.delete(
  '/:userId',
  requireProjectAdmin,
  ProjectMemberController.removeMember
);

export default router;
