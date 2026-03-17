import { Document, Types } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  refreshToken?: string;
  avatar?: string;
  phoneNumber?: string;
  address?: string;
  metadata?: Record<string, any>;
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  loginAttempts?: number;
  lockUntil?: Date;
  deletedAt?: Date | null;
  fullName: string;
  isLocked(): boolean;
}

export interface UserDocument extends Document, IUser {
  _id: Types.ObjectId;
  id: string; // Add this to fix the TypeScript error
  createdAt: Date;
  updatedAt: Date;
}
