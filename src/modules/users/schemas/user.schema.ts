import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Expose } from 'class-transformer';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (
      doc: HydratedDocument<User>,
      ret: Partial<User> & { _id?: any; __v?: number },
    ) => {
      delete ret.password;
      delete ret.refreshToken;
      delete ret.__v;
      delete ret.passwordResetToken;
      delete ret.emailVerificationToken;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false })
  @Exclude()
  password: string;

  @Prop({ enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Prop({ enum: UserStatus, default: UserStatus.PENDING_VERIFICATION })
  status: UserStatus;

  @Prop({ select: false })
  @Exclude()
  refreshToken?: string;

  @Prop()
  avatar?: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  address?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  isEmailVerified?: boolean;

  @Prop({ select: false })
  emailVerificationToken?: string;

  @Prop({ select: false })
  passwordResetToken?: string;

  @Prop({ select: false })
  passwordResetExpires?: Date;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  lastLoginIp?: string;

  @Prop({ default: 0 })
  loginAttempts?: number;

  @Prop()
  lockUntil?: Date;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ deletedAt: 1 });
UserSchema.index({ loginAttempts: 1, lockUntil: 1 });

// Pre-save middleware - FIXED VERSION
UserSchema.pre(
  'save',
  function (this: UserDocument, next: CallbackWithoutResultAndOptionalError) {
    if (this.email) {
      this.email = this.email.toLowerCase();
    }
    next();
  },
);
