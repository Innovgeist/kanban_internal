import { Board } from './board.model';
import { Column } from './columns/column.model';
import { Card } from './columns/cards/card.model';
import { AppError } from '../../../utils/errors';

export class BoardService {
  static async createBoard(projectId: string, name: string) {
    const board = await Board.create({
      projectId,
      name,
    });

    return board;
  }

  static async getBoardsByProject(projectId: string) {
    const boards = await Board.find({ projectId })
      .sort({ createdAt: -1 }) // Newest first
      .lean();

    return boards;
  }

  static async getBoardById(boardId: string) {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    }

    // Get columns ordered by order field
    const columns = await Column.find({ boardId })
      .sort({ order: 1 })
      .lean();

    // Get cards for each column, grouped by column
    const columnIds = columns.map((col) => col._id);
    const cards = await Card.find({ columnId: { $in: columnIds } })
      .populate('createdBy', 'name email')
      .sort({ order: 1 })
      .lean();

    // Group cards by columnId
    const cardsByColumn = cards.reduce((acc, card) => {
      const colId = card.columnId.toString();
      if (!acc[colId]) {
        acc[colId] = [];
      }
      acc[colId].push(card);
      return acc;
    }, {} as Record<string, typeof cards>);

    // Attach cards to columns
    const columnsWithCards = columns.map((column) => ({
      ...column,
      cards: cardsByColumn[column._id.toString()] || [],
    }));

    return {
      board,
      columns: columnsWithCards,
    };
  }

  static async updateBoard(boardId: string, name: string) {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    }

    board.name = name;
    await board.save();

    return board;
  }

  static async deleteBoard(boardId: string) {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    }

    // Delete all columns and cards in this board
    const columns = await Column.find({ boardId });
    const columnIds = columns.map((col) => col._id);
    
    // Delete all cards in these columns
    await Card.deleteMany({ columnId: { $in: columnIds } });
    
    // Delete all columns
    await Column.deleteMany({ boardId });
    
    // Delete the board
    await Board.findByIdAndDelete(boardId);

    return { message: 'Board deleted successfully' };
  }
}
