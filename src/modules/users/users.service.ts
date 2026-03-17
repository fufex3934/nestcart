/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserStatus } from './enums/user-status.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Check if user exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email.toLowerCase(),
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = new this.userModel({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      password: hashedPassword,
    });

    return user.save();
  }

  async findAll(query: QueryUserDto) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const filter: any = { deletedAt: null };

    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }) // ✅ FIX
        .skip(skip)
        .limit(limit) // ✅ safe now
        .select('-password -refreshToken')
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken')
      .exec();

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null })
      .select('-password -refreshToken')
      .exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null })
      .select('+password +refreshToken')
      .exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.findById(id);

    // If updating email, check it's not taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        email: updateUserDto.email.toLowerCase(),
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    Object.assign(user, updateUserDto);
    if (updateUserDto.email) {
      user.email = updateUserDto.email.toLowerCase();
    }

    return user.save();
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    );
  }

  async updateLastLogin(id: string, ipAddress: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        loginAttempts: 0,
        lockUntil: null,
      },
    );
  }

  async incrementLoginAttempts(id: string): Promise<void> {
    const user = await this.userModel.findById(id);
    if (!user) return;

    const updates: any = { $inc: { loginAttempts: 1 } };

    // Lock account after 5 failed attempts
    if ((user.loginAttempts ?? 0) + 1 >= 5) {
      updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) }; // Lock for 30 minutes
    }

    await this.userModel.updateOne({ _id: id }, updates);
  }

  async setRefreshToken(id: string, refreshToken: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { refreshToken });
  }

  async removeRefreshToken(id: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      { $unset: { refreshToken: 1 } },
    );
  }

  async setEmailVerificationToken(id: string, token: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      { emailVerificationToken: token },
    );
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.userModel.findOne({
      emailVerificationToken: token,
    });

    if (!user) {
      return false;
    }

    user.isEmailVerified = true;
    user.status = UserStatus.ACTIVE;
    user.emailVerificationToken = undefined;
    await user.save();

    return true;
  }

  async setPasswordResetToken(
    id: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    );
  }

  async validatePasswordResetToken(token: string): Promise<User | null> {
    return this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { deletedAt: new Date() });
  }

  async restore(id: string): Promise<User> {
    const user = await this.userModel.findOne({
      _id: id,
      deletedAt: { $ne: null },
    });

    if (!user) {
      throw new NotFoundException('User not found or not deleted');
    }

    user.deletedAt = null;
    return user.save();
  }

  // Helper to sanitize user object
  // Helper to sanitize user object
  sanitizeUser(user: UserDocument): any {
    const userObj = user.toObject();
    // Create a new object with only the fields we want to keep
    const {
      password,
      refreshToken,
      emailVerificationToken,
      passwordResetToken,
      passwordResetExpires,
      __v,
      ...sanitized
    } = userObj;

    return sanitized;
  }
}
