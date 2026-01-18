import { Column } from './column.model';
import { Board } from '../board.model';
import { ProjectMember } from '../../projectMembers/projectMember.model';
import { AppError } from '../../../../utils/errors';

export interface ColumnReorderItem {
  columnId: string;
  order: number;
}

export class ColumnService {
  static async createColumn(boardId: string, name: string) {
    // Verify board exists
    const board = await Board.findById(boardId);
    if (!board) {
      throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    }

    // Get max order value
    const maxOrderColumn = await Column.findOne({ boardId })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const order = maxOrderColumn ? maxOrderColumn.order + 1 : 0;

    const column = await Column.create({
      boardId,
      name,
      order,
    });

    return column;
  }

  static async reorderColumns(items: ColumnReorderItem[], userId: string) {
    // Validate all column IDs exist
    const columnIds = items.map((item) => item.columnId);
    const existingColumns = await Column.find({
      _id: { $in: columnIds },
    });

    if (existingColumns.length !== columnIds.length) {
      throw new AppError('One or more columns not found', 404, 'COLUMN_NOT_FOUND');
    }

    // Get unique board IDs from columns
    const boardIds = [...new Set(existingColumns.map((col) => col.boardId.toString()))];

    // Verify user has access to all boards
    const boards = await Board.find({ _id: { $in: boardIds } });
    const projectIds = [...new Set(boards.map((b) => b.projectId.toString()))];

    // Check if user is a member of all projects
    const memberships = await ProjectMember.find({
      projectId: { $in: projectIds },
      userId,
    });

    if (memberships.length !== projectIds.length) {
      throw new AppError('Access denied: Not authorized to reorder these columns', 403, 'ACCESS_DENIED');
    }

    // Bulk update orders
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.columnId },
        update: { $set: { order: item.order } },
      },
    }));

    await Column.bulkWrite(bulkOps);

    return { message: 'Columns reordered successfully' };
  }

  static async updateColumn(columnId: string, name: string) {
    const column = await Column.findById(columnId);
    if (!column) {
      throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
    }

    column.name = name;
    await column.save();

    return column;
  }

  static async deleteColumn(columnId: string) {
    const column = await Column.findById(columnId);
    if (!column) {
      throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
    }

    // Delete all cards in this column
    await Card.deleteMany({ columnId });

    // Delete the column
    await Column.findByIdAndDelete(columnId);

    return { message: 'Column deleted successfully' };
  }
}
