import { Card, CardPriority } from './card.model';
import { Column } from '../column.model';
import { Board } from '../../board.model';
import { ProjectMember } from '../../../projectMembers/projectMember.model';
import { AppError } from '../../../../../utils/errors';
import { validateObjectId } from '../../../../../utils/validation';
import { Types } from 'mongoose';

export class CardService {
  static async createCard(
    columnId: string,
    title: string,
    description: string | undefined,
    createdBy: string,
    priority?: CardPriority,
    expectedDeliveryDate?: Date | null,
    assignedTo?: string[]
  ) {
    // Verify column exists
    const column = await Column.findById(columnId);
    if (!column) {
      throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
    }

    // Get board to validate assigned users
    const board = await Board.findById(column.boardId);
    if (!board) {
      throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    }

    // Validate assigned users if provided
    let assignedToIds: string[] = [];
    if (assignedTo && assignedTo.length > 0) {
      // Validate all user IDs
      for (const userId of assignedTo) {
        if (!validateObjectId(userId)) {
          throw new AppError(`Invalid user ID: ${userId}`, 400, 'INVALID_USER_ID');
        }
      }

      // Verify all users are project members
      const members = await ProjectMember.find({
        projectId: board.projectId,
        userId: { $in: assignedTo },
      });

      if (members.length !== assignedTo.length) {
        const foundUserIds = members.map(m => m.userId.toString());
        const invalidUserIds = assignedTo.filter(id => !foundUserIds.includes(id));
        throw new AppError(
          `One or more assigned users are not project members`,
          400,
          'USER_NOT_PROJECT_MEMBER'
        );
      }

      assignedToIds = assignedTo;
    }

    // Get max order value
    const maxOrderCard = await Card.findOne({ columnId })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const order = maxOrderCard ? maxOrderCard.order + 1 : 0;

    const card = await Card.create({
      columnId,
      title,
      description,
      priority: priority || 'MEDIUM',
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      assignedTo: assignedToIds.map(id => new Types.ObjectId(id)),
      order,
      createdBy,
    });

    return card.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
    ]);
  }

  static async moveCard(cardId: string, columnId: string, order: number) {
    // Verify card exists
    const card = await Card.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
    }

    // Verify new column exists
    const column = await Column.findById(columnId);
    if (!column) {
      throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
    }

    // Update card
    card.columnId = columnId as any;
    card.order = order;
    await card.save();

    return card.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
    ]);
  }

  static async updateCard(
    cardId: string,
    title: string,
    description?: string,
    priority?: CardPriority | null,
    expectedDeliveryDate?: Date | null,
    assignedTo?: string[]
  ) {
    const card = await Card.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
    }

    // Get column and board to validate assigned users
    const column = await Column.findById(card.columnId);
    if (!column) {
      throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
    }

    const board = await Board.findById(column.boardId);
    if (!board) {
      throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    }

    card.title = title;
    if (description !== undefined) {
      card.description = description;
    }

    if (priority !== undefined) {
      card.priority = priority === null ? 'MEDIUM' : priority; // null means reset to default
    }

    if (expectedDeliveryDate !== undefined) {
      card.expectedDeliveryDate = expectedDeliveryDate || undefined;
    }

    // Validate assigned users if provided
    if (assignedTo !== undefined) {
      if (assignedTo.length > 0) {
        // Validate all user IDs
        for (const userId of assignedTo) {
          if (!validateObjectId(userId)) {
            throw new AppError(`Invalid user ID: ${userId}`, 400, 'INVALID_USER_ID');
          }
        }

        // Verify all users are project members
        const members = await ProjectMember.find({
          projectId: board.projectId,
          userId: { $in: assignedTo },
        });

        if (members.length !== assignedTo.length) {
          throw new AppError(
            `One or more assigned users are not project members`,
            400,
            'USER_NOT_PROJECT_MEMBER'
          );
        }

        card.assignedTo = assignedTo.map(id => new Types.ObjectId(id)) as any;
      } else {
        // Empty array - remove all assignments
        card.assignedTo = [];
      }
    }

    await card.save();

    return card.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
    ]);
  }

  static async deleteCard(cardId: string) {
    const card = await Card.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
    }

    await Card.findByIdAndDelete(cardId);

    return { message: 'Card deleted successfully' };
  }
}
