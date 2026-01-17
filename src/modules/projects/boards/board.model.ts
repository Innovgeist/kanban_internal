import mongoose, { Schema, Document } from 'mongoose';

export interface IBoard extends Document {
  projectId: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
}

const boardSchema = new Schema<IBoard>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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

export const Board = mongoose.model<IBoard>('Board', boardSchema);
