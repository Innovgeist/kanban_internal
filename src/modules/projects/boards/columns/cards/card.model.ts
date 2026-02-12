import mongoose, { Schema, Document } from "mongoose";

export type CardPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ICard extends Document {
  columnId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  priority?: CardPriority;
  expectedDeliveryDate?: Date;
  assignedTo: mongoose.Types.ObjectId[]; // Array of user IDs
  order: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  isHidden: boolean;
  autoCleanupMode?: "HIDE" | "DELETE" | null;
  movedToColumnAt?: Date | null;

  compleatedAt?: Date | null;
  deletedAt?: Date | null;
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
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    expectedDeliveryDate: {
      type: Date,
    },
    assignedTo: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
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
    isHidden: {
      type: Boolean,
      default: false,
    },
    movedToColumnAt: { 
      type: Date,
       default: null
    },

    deletedAt: {
      type: Date,
      default: null,
    },
    compleatedAt: {
      type: Date,
      default: null,
    },
    autoCleanupMode: {
      type: String,
      enum: ['HIDE', 'DELETE'],
      default: undefined,
    },
  },

  {
    timestamps: false,
  },
);

export const Card = mongoose.model<ICard>("Card", cardSchema);
