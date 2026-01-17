import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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

export const Project = mongoose.model<IProject>('Project', projectSchema);
