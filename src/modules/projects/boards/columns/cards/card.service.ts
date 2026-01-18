import { Card } from './card.model';
import { Column } from '../column.model';
import { AppError } from '../../../../../utils/errors';

export class CardService {
  static async createCard(
    columnId: string,
    title: string,
    description: string | undefined,
    createdBy: string
  ) {
    // Verify column exists
    const column = await Column.findById(columnId);
    if (!column) {
      throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
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
      order,
      createdBy,
    });

    return card.populate('createdBy', 'name email');
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

    return card.populate('createdBy', 'name email');
  }

  static async updateCard(cardId: string, title: string, description?: string) {
    const card = await Card.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
    }

    card.title = title;
    if (description !== undefined) {
      card.description = description;
    }
    await card.save();

    return card.populate('createdBy', 'name email');
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
