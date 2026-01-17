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
}
