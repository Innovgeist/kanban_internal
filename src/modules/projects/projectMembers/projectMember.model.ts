import mongoose, { Schema, Document } from 'mongoose';

export type ProjectRole = 'ADMIN' | 'MEMBER';

export interface IProjectMember extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: ProjectRole;
}

const projectMemberSchema = new Schema<IProjectMember>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'MEMBER'],
      required: true,
      default: 'MEMBER',
    },
  },
  {
    timestamps: false,
  }
);

// Unique index on (projectId, userId)
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const ProjectMember = mongoose.model<IProjectMember>(
  'ProjectMember',
  projectMemberSchema
);
