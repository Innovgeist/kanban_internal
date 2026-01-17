import { Request, Response, NextFunction } from 'express';
import { ColumnService } from './column.service';

export class ColumnController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { boardId } = req.params;
      const { name } = req.body;

      const column = await ColumnService.createColumn(boardId, name);

      res.status(201).json({
        success: true,
        data: column,
      });
    } catch (error) {
      next(error);
    }
  }

  static async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const items = req.body;
      const userId = req.user!._id;

      const result = await ColumnService.reorderColumns(items, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
