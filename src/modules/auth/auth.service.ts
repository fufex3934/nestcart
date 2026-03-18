/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { User } from '../users/schemas/user.schema';
import { UserStatus } from '../users/enums/user-status.enum';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new UnauthorizedException(
        'Account is temporarily locked. Please try again later.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment login attempts
      await this.usersService.incrementLoginAttempts(user.id);
      return null;
    }

    return user;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async register(registerDto: RegisterDto, _ipAddress: string) {
    // Check if user exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Don't hash here - let the UsersService handle it
    const user = await this.usersService.create({
      ...registerDto,
      // password is passed as plain text
    });

    // Generate email verification token
    const verificationToken = uuidv4();
    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
    );

    // In a real app, send email here
    console.log(
      `Email verification token for ${user.email}: ${verificationToken}`,
    );

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.usersService.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto, ipAddress: string) {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );
    console.log('DB password hash:', user?.password);
    console.log('Login password:', loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Account has been suspended');
      }
      if (user.status === UserStatus.PENDING_VERIFICATION) {
        throw new UnauthorizedException('Please verify your email first');
      }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      // Track failed login
      await this.usersService.incrementLoginAttempts(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id, ipAddress);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.usersService.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify refresh token matches stored token
      if (user.refreshToken !== refreshTokenDto.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      return this.generateTokens(user);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.usersService.removeRefreshToken(userId);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    if (!user) {
      // Don't reveal that user doesn't exist
      return {
        message:
          'If your email is registered, you will receive a password reset link',
      };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token valid for 1 hour

    await this.usersService.setPasswordResetToken(user.id, resetToken, expires);

    // In a real app, send email here
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    return {
      message:
        'If your email is registered, you will receive a password reset link',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.usersService.validatePasswordResetToken(
      resetPasswordDto.token,
    );

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    // Update password
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Remove refresh token to force re-login
    await this.usersService.removeRefreshToken(user.id);

    return { message: 'Password reset successful' };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const verified = await this.usersService.verifyEmail(verifyEmailDto.token);

    if (!verified) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    return { message: 'Email verified successfully' };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Use string directly
    const accessTokenExpiresIn = this.configService.get('jwt.expiresIn'); // "7d"
    const refreshTokenExpiresIn = this.configService.get(
      'jwt.refreshTokenExpiresIn',
    ); // "30d"

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret'),
        expiresIn: accessTokenExpiresIn, // ✅ pass string
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshTokenSecret'),
        expiresIn: refreshTokenExpiresIn, // ✅ pass string
      }),
    ]);

    // Store refresh token in database
    await this.usersService.setRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn, // can return "7d"
    };
  }
}
