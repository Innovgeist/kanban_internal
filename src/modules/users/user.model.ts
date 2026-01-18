import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'USER' | 'SUPERADMIN';
export type AuthProvider = 'email' | 'google';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string; // Optional for Google OAuth users
  googleId?: string; // Google user ID
  authProvider: AuthProvider; // 'email' or 'google'
  role: UserRole;
  invitationToken?: string; // Token for setting initial password
  invitationTokenExpires?: Date; // Expiration for invitation token
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: function(this: IUser) {
        // Required only for email-based authentication, but not if user has invitation token
        // Users with invitation tokens will set password later
        return this.authProvider === 'email' && !this.invitationToken;
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    authProvider: {
      type: String,
      enum: ['email', 'google'],
      required: true,
      default: 'email',
    },
    invitationToken: {
      type: String,
      sparse: true,
    },
    invitationTokenExpires: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['USER', 'SUPERADMIN'],
      required: true,
      default: 'USER',
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

export const User = mongoose.model<IUser>('User', userSchema);
