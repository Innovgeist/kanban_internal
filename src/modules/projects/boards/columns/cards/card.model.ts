import mongoose, { Schema, Document } from 'mongoose';

export interface ICard extends Document {
  columnId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const cardSchema = new Schema<ICard>(
  {
    columnId: {
      type: Schema.Types.ObjectId,
      ref: 'Column',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

export const Card = mongoose.model<ICard>('Card', cardSchema);
