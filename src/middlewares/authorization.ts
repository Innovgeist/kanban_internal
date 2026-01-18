import { Request, Response, NextFunction } from 'express';
import { ProjectMember, ProjectRole } from '../modules/projects/projectMembers/projectMember.model';
import { Project } from '../modules/projects/project.model';
import { Board } from '../modules/projects/boards/board.model';
import { Column } from '../modules/projects/boards/columns/column.model';
import { Card } from '../modules/projects/boards/columns/cards/card.model';
import { AppError } from '../utils/errors';
import { validateObjectId } from '../utils/validation';

export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'SUPERADMIN') {
      throw new AppError('Access denied: SuperAdmin role required', 403, 'SUPERADMIN_REQUIRED');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireProjectMember = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!projectId || !validateObjectId(projectId)) {
      throw new AppError('Invalid project ID', 400, 'INVALID_PROJECT_ID');
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // SuperAdmin can access ALL projects (full access)
    if (userRole === 'SUPERADMIN') {
      return next();
    }

    // Check if user is a member
    const member = await ProjectMember.findOne({
      projectId,
      userId,
    });

    if (!member) {
      throw new AppError('Access denied: Not a project member', 403, 'NOT_PROJECT_MEMBER');
    }

    // Attach member info to request for use in controllers
    (req as any).projectMember = member;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireProjectAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // SUPERADMIN bypasses project admin check
    if (req.user?.role === 'SUPERADMIN') {
      next();
      return;
    }

    // First check project membership
    const projectId = req.params.projectId;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!projectId || !validateObjectId(projectId)) {
      throw new AppError('Invalid project ID', 400, 'INVALID_PROJECT_ID');
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Check if user is a member
    const member = await ProjectMember.findOne({
      projectId,
      userId,
    });

    if (!member) {
      throw new AppError('Access denied: Not a project member', 403, 'NOT_PROJECT_MEMBER');
    }

    // Check if user is admin
    if (member.role !== 'ADMIN') {
      throw new AppError('Access denied: Admin role required', 403, 'ADMIN_REQUIRED');
    }

    // Attach member info to request
    (req as any).projectMember = member;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireBoardAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to get boardId from params (could be boardId or id)
    const boardId = req.params.boardId || req.params.id;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!boardId) {
      throw new AppError('Board ID is required', 400, 'BOARD_ID_REQUIRED');
    }

    // Trim whitespace and validate
    const trimmedBoardId = boardId.trim();
    if (!validateObjectId(trimmedBoardId)) {
      throw new AppError(`Invalid board ID format: "${trimmedBoardId}" (length: ${trimmedBoardId.length})`, 400, 'INVALID_BOARD_ID');
    }
    
    // Use trimmed ID
    const finalBoardId = trimmedBoardId;

    // Find board and check project membership
    const board = await Board.findById(finalBoardId);
    if (!board) {
      throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    }

    // Store trimmed boardId in request for controller to use
    (req as any).boardId = finalBoardId;
    req.params.boardId = finalBoardId; // Update params too

    // SuperAdmin can access ALL boards (full access)
    if (userRole === 'SUPERADMIN') {
      return next();
    }

    // Check if user is a project member
    const member = await ProjectMember.findOne({
      projectId: board.projectId,
      userId,
    });

    if (!member) {
      throw new AppError('Access denied: Not a project member', 403, 'NOT_PROJECT_MEMBER');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireColumnAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const columnId = req.params.columnId;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!columnId || !validateObjectId(columnId)) {
      throw new AppError('Invalid column ID', 400, 'INVALID_COLUMN_ID');
    }

    // Find column and get board
    const column = await Column.findById(columnId);
    if (!column) {
      throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
    }

    // Find board and check project membership
    const board = await Board.findById(column.boardId);
    if (!board) {
      throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    }

    // SuperAdmin can access ALL columns (full access)
    if (userRole === 'SUPERADMIN') {
      return next();
    }

    // Check if user is a project member
    const member = await ProjectMember.findOne({
      projectId: board.projectId,
      userId,
    });

    if (!member) {
      throw new AppError('Access denied: Not a project member', 403, 'NOT_PROJECT_MEMBER');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireCardAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const cardId = req.params.cardId;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!cardId || !validateObjectId(cardId)) {
      throw new AppError('Invalid card ID', 400, 'INVALID_CARD_ID');
    }

    // Find card and get column
    const card = await Card.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
    }

    // Find column and get board
    const column = await Column.findById(card.columnId);
    if (!column) {
      throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
    }

    // Find board and check project membership
    const board = await Board.findById(column.boardId);
    if (!board) {
      throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    }

    // SuperAdmin can access ALL cards (full access)
    if (userRole === 'SUPERADMIN') {
      return next();
    }

    // Check if user is a project member
    const member = await ProjectMember.findOne({
      projectId: board.projectId,
      userId,
    });

    if (!member) {
      throw new AppError('Access denied: Not a project member', 403, 'NOT_PROJECT_MEMBER');
    }

    next();
  } catch (error) {
    next(error);
  }
};
