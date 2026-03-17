/* eslint-disable @typescript-eslint/no-unsafe-return */
import { UserStatus } from './../enums/user-status.enum';
import { Expose, Transform } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;

  @Expose()
  role: UserRole;

  @Expose()
  status: UserStatus;

  @Expose()
  avatar?: string;

  @Expose()
  phoneNumber?: string;

  @Expose()
  address?: string;

  @Expose()
  isEmailVerified: boolean;

  @Expose()
  lastLoginAt?: Date;

  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  @Transform(({ obj }) => obj.createdAt?.toISOString())
  createdAt: Date;

  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  @Transform(({ obj }) => obj.updatedAt?.toISOString())
  updatedAt: Date;
}
