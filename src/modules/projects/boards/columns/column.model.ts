import mongoose, { Schema, Document } from 'mongoose';

export interface IColumn extends Document {
  boardId: mongoose.Types.ObjectId;
  name: string;
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
