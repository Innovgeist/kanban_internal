import { Column } from "./column.model";
import { Board } from "../board.model";
import { Card } from "./cards/card.model";
import { ProjectMember } from "../../projectMembers/projectMember.model";
import { AppError } from "../../../../utils/errors";
import { autoCleanupCards } from "./cards/autoCleanupCards";

export interface ColumnReorderItem {
  columnId: string;
  order: number;
}

export class ColumnService {
  static async createColumn(boardId: string, name: string, color?: string) {
    // Verify board exists
    const board = await Board.findById(boardId);
    if (!board) {
      throw new AppError("Board not found", 404, "BOARD_NOT_FOUND");
    }

    // Get max order value
    const maxOrderColumn = await Column.findOne({ boardId })
      .sort({ order: -1 })
      .select("order")
      .lean();

    const order = maxOrderColumn ? maxOrderColumn.order + 1 : 0;

    const column = await Column.create({
      boardId,
      name,
      color: color || "#94a3b8", // Default color if not provided
      order,
    });

    return column;
  }

  static async reorderColumns(
    items: ColumnReorderItem[],
    userId: string,
    userRole?: string,
  ) {
    // Validate all column IDs exist
    const columnIds = items.map((item) => item.columnId);
    const existingColumns = await Column.find({
      _id: { $in: columnIds },
    });

    if (existingColumns.length !== columnIds.length) {
      throw new AppError(
        "One or more columns not found",
        404,
        "COLUMN_NOT_FOUND",
      );
    }

    // Get unique board IDs from columns
    const boardIds = [
      ...new Set(existingColumns.map((col) => col.boardId.toString())),
    ];

    // Verify user has access to all boards
    const boards = await Board.find({ _id: { $in: boardIds } });
    const projectIds = [...new Set(boards.map((b) => b.projectId.toString()))];

    // SuperAdmin can reorder columns in any project
    if (userRole === "SUPERADMIN") {
      // Skip membership check for SuperAdmin
    } else {
      // Check if user is a member of all projects
      const memberships = await ProjectMember.find({
        projectId: { $in: projectIds },
        userId,
      });

      if (memberships.length !== projectIds.length) {
        throw new AppError(
          "Access denied: Not authorized to reorder these columns",
          403,
          "ACCESS_DENIED",
        );
      }
    }

    // Bulk update orders
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.columnId },
        update: { $set: { order: item.order } },
      },
    }));

    await Column.bulkWrite(bulkOps);

    return { message: "Columns reordered successfully" };
  }

  static async updateColumn(
    columnId: string,
    payload: { name: string; color?: string; runCleanupNow?: boolean },
  ) {
    const column = await Column.findById(columnId);
    const cards = await Card.find({ columnId: columnId });

    if (!column) {
      throw new AppError("Column not found", 404, "COLUMN_NOT_FOUND");
    }
    if (payload.name !== undefined) {
      column.name = payload.name;
    }

    if (payload.color !== undefined) {
      column.color = payload.color || "#94a3b8";
    }
    if (payload.runCleanupNow) {
      const DAYS = 14;
      const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
      const query: any = {
        columnId: column._id,
        isHidden: { $ne: true },
        $or: [
          { movedToColumnAt: { $lte: cutoff } }, // best
          { movedToColumnAt: null, createdAt: { $lte: cutoff } }, // fallback
          { createdAt: { $lte: cutoff } }, // if movedToColumnAt doesn't exist at all
        ],
      };

      const res = await Card.updateMany(query, { $set: { isHidden: true } });
      return {
        column,
        cleanup: {
          days: DAYS,
          hiddenCards: res.modifiedCount ?? 0,
          message:
            res.matchedCount === 0
              ? "No cards eligible for cleanup"
              : "Cleanup completed",
        },
      };
    }

    await column.save();

    return column;
  }

  static async deleteColumn(columnId: string) {
    const column = await Column.findById(columnId);
    if (!column) {
      throw new AppError("Column not found", 404, "COLUMN_NOT_FOUND");
    }

    // Delete all cards in this column
    await Card.deleteMany({ columnId });

    // Delete the column
    await Column.findByIdAndDelete(columnId);

    return { message: "Column deleted successfully" };
  }
}
