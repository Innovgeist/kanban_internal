import { Request, Response, NextFunction } from 'express';
import { CardService } from './card.service';

export class CardController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { columnId } = req.params;
      const { title, description, priority, expectedDeliveryDate, assignedTo } = req.body;
      const userId = req.user!._id;

      // Convert priority to uppercase if provided
      const normalizedPriority = priority ? (priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') : undefined;
      
      // Parse date if provided
      const parsedDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined;

      const card = await CardService.createCard(
        columnId,
        title,
        description,
        userId,
        normalizedPriority,
        parsedDate,
        assignedTo
      );

      res.status(201).json({
        success: true,
        data: card,
      });
    } catch (error) {
      next(error);
    }
  }

  static async move(req: Request, res: Response, next: NextFunction) {
    try {
      const { cardId } = req.params;
      const { columnId, order } = req.body;

      const card = await CardService.moveCard(cardId, columnId, order);

      res.status(200).json({
        success: true,
        data: card,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      // Get cardId from params (set by requireCardAccess middleware) or extract from path
      const cardId = (req as any).cardId || req.params.cardId;
      const { title, description, priority, expectedDeliveryDate, assignedTo } = req.body;

      if (!cardId) {
        throw new Error('Card ID is required');
      }

      // Convert priority to uppercase if provided, or null if explicitly set to null
      const normalizedPriority = priority === null ? null : (priority ? priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' : undefined);
      
      // Parse date if provided, or null if explicitly set to null
      const parsedDate = expectedDeliveryDate === null ? null : (expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined);

      const card = await CardService.updateCard(
        cardId,
        title,
        description,
        normalizedPriority,
        parsedDate,
        assignedTo
      );

      res.status(200).json({
        success: true,
        data: card,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      // Get cardId from params (set by requireCardAccess middleware) or extract from path
      const cardId = (req as any).cardId || req.params.cardId;

      if (!cardId) {
        throw new Error('Card ID is required');
      }

      const result = await CardService.deleteCard(cardId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
