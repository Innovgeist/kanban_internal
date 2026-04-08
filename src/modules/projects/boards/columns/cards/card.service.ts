import { Card, CardPriority } from './card.model';
import { Column } from '../column.model';
import { Board } from '../../board.model';
import { ProjectMember } from '../../../projectMembers/projectMember.model';
import { User } from '../../../../users/user.model';
import { AppError } from '../../../../../utils/errors';
import { validateObjectId } from '../../../../../utils/validation';
import { Types } from 'mongoose';
import { autoCleanupCards } from './autoCleanupCards';
import { EmailService } from '../../../../../services/email.service';
import logger from '../../../../../utils/logger';

type RequestUser = {
  _id: string;
  name?: string;
  email: string;
};

export class CardService {
  private static async validateProjectUsers(projectId: string, userIds: string[]) {
    if (userIds.length === 0) {
      return;
    }

    for (const userId of userIds) {
      if (!validateObjectId(userId)) {
        throw new AppError(`Invalid user ID: ${userId}`, 400, 'INVALID_USER_ID');
      }
    }

    const members = await ProjectMember.find({
      projectId,
      userId: { $in: userIds },
    });

    if (members.length !== userIds.length) {
      throw new AppError(
        'One or more selected users are not project members',
        400,
        'USER_NOT_PROJECT_MEMBER'
      );
    }
  }

  private static async sendReviewRequestEmail(params: {
    reviewerId: string;
    title: string;
    projectName?: string;
    boardName?: string;
    columnName?: string;
    requestedBy?: RequestUser;
  }) {
    if (!EmailService.isConfigured()) {
      return false;
    }

    const reviewer = await User.findById(params.reviewerId).select('name email').lean();
    if (!reviewer?.email) {
      return false;
    }

    const requestedBy = params.requestedBy?.name || params.requestedBy?.email || 'A teammate';
    const location = [params.projectName, params.boardName, params.columnName].filter(Boolean).join(' / ');

    try {
      await EmailService.sendMail({
        to: [reviewer.email],
        subject: `Review requested: ${params.title}`,
        text: `${requestedBy} requested your review for "${params.title}"${location ? ` in ${location}` : ''}.`,
        html: `
          <div>
            <p>Hello <strong>${reviewer.name || reviewer.email}</strong>,</p>
            <p><strong>${requestedBy}</strong> requested your review for <strong>${params.title}</strong>.</p>
            ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
          </div>
        `,
      });
      return true;
    } catch (error) {
      logger.error(`Failed to send review request email to reviewer ${params.reviewerId}`, error);
      return false;
    }
  }

  static async createCard(
    columnId: string,
    title: string,
    description: string | undefined,
    createdBy: string,
    priority?: CardPriority,
    expectedDeliveryDate?: Date | null,
    compleatedAt?: Date | null,
    assignedTo?: string[],
    reviewerId?: string | null,
    requestedBy?: RequestUser
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
      await this.validateProjectUsers(board.projectId.toString(), assignedTo);
      assignedToIds = assignedTo;
    }

    if (reviewerId !== undefined && reviewerId !== null) {
      await this.validateProjectUsers(board.projectId.toString(), [reviewerId]);
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
      reviewerId: reviewerId ? new Types.ObjectId(reviewerId) : null,
      reviewRequestedAt: reviewerId ? new Date() : null,
      reviewRequestEmailSentAt: null,
      compleatedAt: compleatedAt || null,       
      order,
      createdBy,
    });

    if (reviewerId) {
      const emailSent = await this.sendReviewRequestEmail({
        reviewerId,
        title,
        projectName: undefined,
        boardName: undefined,
        columnName: column.name,
        requestedBy,
      });

      if (emailSent) {
        card.reviewRequestEmailSentAt = new Date();
        await card.save();
      }
    }

    return card.populate([
      { path: 'createdBy', select: 'name email avatarUrl' },
      { path: 'assignedTo', select: 'name email avatarUrl' },
      { path: 'reviewerId', select: 'name email avatarUrl' },
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
    
  const oldColumnId = card.columnId?.toString();
  const newColumnId = column._id.toString();
    // Update card
    card.columnId = columnId as any;
    card.order = order;
    
    if (column.autoCleanupMode && column.autoCleanupAfterDays) {
    if (oldColumnId !== newColumnId) {
      card.compleatedAt = new Date();
      card.isHidden = false; 
    }
  } else {
    if (oldColumnId !== newColumnId) {
      card.compleatedAt = null;
      card.isHidden = false;
    }
  }


    await card.save();
    await autoCleanupCards(newColumnId)

    return card.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'reviewerId', select: 'name email' },
    ]);
  }

  static async updateCard(
    cardId: string,
    title: string,
    description?: string,
    priority?: CardPriority | null,
    expectedDeliveryDate?: Date | null,
    assignedTo?: string[],
    reviewerId?: string | null,
    requestedBy?: RequestUser
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

    const previousReviewerId = card.reviewerId?.toString() || null;

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
        await this.validateProjectUsers(board.projectId.toString(), assignedTo);
        card.assignedTo = assignedTo.map(id => new Types.ObjectId(id)) as any;
      } else {
        // Empty array - remove all assignments
        card.assignedTo = [];
      }
    }

    if (reviewerId !== undefined) {
      if (reviewerId) {
        await this.validateProjectUsers(board.projectId.toString(), [reviewerId]);
        card.reviewerId = new Types.ObjectId(reviewerId) as any;
        if (previousReviewerId !== reviewerId) {
          card.reviewRequestedAt = new Date();
          card.reviewRequestEmailSentAt = null;
        }
      } else {
        card.reviewerId = null as any;
        card.reviewRequestedAt = null;
        card.reviewRequestEmailSentAt = null;
      }
    }

    await card.save();

    if (reviewerId && previousReviewerId !== reviewerId) {
      const emailSent = await this.sendReviewRequestEmail({
        reviewerId,
        title: card.title,
        projectName: undefined,
        boardName: undefined,
        columnName: column.name,
        requestedBy,
      });

      if (emailSent) {
        card.reviewRequestEmailSentAt = new Date();
        await card.save();
      }
    }

    return card.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'reviewerId', select: 'name email' },
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
