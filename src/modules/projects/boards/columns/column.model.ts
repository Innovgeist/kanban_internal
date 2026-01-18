import mongoose, { Schema, Document } from 'mongoose';

export interface IColumn extends Document {
  boardId: mongoose.Types.ObjectId;
  name: string;
  color?: string; // Hex color code (e.g., "#3b82f6")
  order: number;
}

const columnSchema = new Schema<IColumn>(
  {
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
      default: '#94a3b8', // Default gray color
      validate: {
        validator: function(v: string | undefined) {
          if (!v) return true; // Allow null/undefined
          return /^#[0-9A-Fa-f]{6}$/.test(v);
        },
        message: 'Color must be a valid hex color code (e.g., #3b82f6)',
      },
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: false,
  }
);

export const Column = mongoose.model<IColumn>('Column', columnSchema);
