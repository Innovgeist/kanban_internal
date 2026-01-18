import { Request, Response, NextFunction } from 'express';
import { BoardService } from './board.service';

export class BoardController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const { name } = req.body;

      const board = await BoardService.createBoard(projectId, name);

      res.status(201).json({
        success: true,
        data: board,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const boards = await BoardService.getBoardsByProject(projectId);

      res.status(200).json({
        success: true,
        data: boards,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { boardId } = req.params;
      const result = await BoardService.getBoardById(boardId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      // Get boardId from params (set by requireBoardAccess middleware) or extract from path
      const boardId = (req as any).boardId || req.params.boardId;
      const { name } = req.body;

      if (!boardId) {
        throw new Error('Board ID is required');
      }

      const board = await BoardService.updateBoard(boardId, name);

      res.status(200).json({
        success: true,
        data: board,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      // Get boardId from params (set by requireBoardAccess middleware) or extract from path
      const boardId = (req as any).boardId || req.params.boardId;

      if (!boardId) {
        throw new Error('Board ID is required');
      }

      const result = await BoardService.deleteBoard(boardId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
