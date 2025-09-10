import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PrismaService } from 'src/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { Role, User, Provider } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
const otpGenerator = require('otp-generator')
import { MailService } from 'src/mail/mail.service';
import { IUser, LoginResponse, RegisterResponse, UpdateProfileResponse } from 'src/helper/interfaces/interfaces.response';
import { UploadApiResponse } from 'cloudinary';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(private prisma: PrismaService, private jwtService: JwtService, private configService: ConfigService,
    private readonly mailService: MailService,
    private readonly cloudinaryService: CloudinaryService
  ) { }

  /**
   * @description Create a new user
   * @method create
   * @param createAuthDto 
   * @returns RegisterResponse
   */
  async create(createAuthDto: CreateAuthDto, file?: Express.Multer.File): Promise<RegisterResponse> {
    const useremail = await this.prisma.user.findUnique({
      where: {
        email: createAuthDto.email
      }
    });
    if (useremail) {
      throw new BadRequestException('Email already exists');
    }
    if (createAuthDto.password !== createAuthDto.confirmPassword) {
      throw new BadRequestException('Password does not match');
    }
    const hashedPassword = await this.hashPassword(createAuthDto.password);

    let role: Role;
    let userData;
    let gender;
    if (createAuthDto.roleToken === this.configService.get<string>('TEACHER_TOKEN')) {
      role = Role.TEACHER;
    } else {

      role = Role.STUDENT;
    }
    if(!createAuthDto.gender){
      gender = undefined
      
    }else{
      gender = createAuthDto.gender === 'male' ? 'MALE' : 'FEMALE'
    }

    if (!file) {
      userData = {
        data: {
          role: role,
          email: createAuthDto.email,
          password: hashedPassword,
          name: createAuthDto.name,
          phone: createAuthDto.phoneNumber,
          bio: createAuthDto.bio,
          gender: gender
        }
      };
    } else {
      const result: UploadApiResponse = await this.cloudinaryService.uploadFile(file, 'usersAvatars');
      userData = {
        data: {
          role: role,
          email: createAuthDto.email,
          password: hashedPassword,
          name: createAuthDto.name,
          phone: createAuthDto.phoneNumber,
          avatar: result.secure_url,
          bio: createAuthDto.bio,
          gender: gender,
          publicId: result.public_id,

        }
      };
    }

    const user = await this.prisma.user.create(userData);
    const token = await this.generateJwt({ id: user.id, role: user.role });

    return {
      ...user,
      token
    }



  }

  /**
   * @description Login a user
   * @method get
   * @param loginDto 
   * @returns LoginResponse
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email
      }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isMatch = await this.comparePassword(loginDto.password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Invalid password');
    }
    const token = await this.generateJwt({ id: user.id, role: user.role });
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  }

  /**
   * @description Forget password - generate OTP and send to email
   * @param email 
   * @returns { message: string }
   */
  async forgetPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    await this.prisma.otpToken.create({
      data: {
        userId: user.id,
        otp,
        expiresAt
      }
    });

    // fire-and-forget email sending to avoid blocking the response if SMTP is slow
    this.mailService.sendEmail({
      to: email,
      subject: 'Password Reset OTP',
      template: 'forgot-password', // match the template filename without .hbs
      context: {
        username: user.name ?? 'User',
        otp,
        year: new Date().getFullYear(),
      },
    }).catch(() => {});

    return { message: 'OTP sent to your email' };

  }

  /**
   * 
   * @param email 
   * @description Verify OTP
   * @param otp 
   * @returns { message: string }
   */
  async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    const otpToken = await this.prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        otp,
        expiresAt: {
          gt: new Date()
        }
      }
    });
    if (!otpToken) throw new BadRequestException('Invalid OTP');
    await this.prisma.otpToken.deleteMany({
      where: {
        userId: user.id
      }
    });
    return { message: 'OTP verified successfully' };
  }

  /**
   * 
   * @param id 
   * @description Get user profile
   * @returns { id, name, email, role }
   */
  async getProfile(id: number): Promise<IUser> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: id
      }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone ?? '',
      avatar: user.avatar ?? '',
      bio: user.bio ?? '',
      createdAt: user.createdAt,
      gender: user.gender ?? '',
    };
  }

  async getstudentProfile(id: number): Promise<IUser> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: id
      }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone ?? '',
      avatar: user.avatar ?? '',
      bio: user.bio ?? '',
      createdAt: user.createdAt,
      gender: user.gender ?? '',
    };
  }

  /**
   * 
   * @param id 
   * @description Update user profile
   * @param updateAuthDto 
   * @returns UpdateProfileResponse
   */

  async update(
  id: number,
  updateAuthDto: UpdateAuthDto,
  file?: Express.Multer.File
): Promise<IUser> {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException('User not found');

  // start with DTO values
  let updatedData: any = { ...updateAuthDto };

  if (updateAuthDto.password) {
    updatedData.password = await this.hashPassword(updateAuthDto.password);
  }

  if (file) {
    const { secure_url} = await this.cloudinaryService.uploadFile(file, 'usersAvatars');
    if (secure_url) {
      updatedData.avatar = secure_url;
    }
  }

  const updatedUser = await this.prisma.user.update({
    where: { id },
    data: updatedData,
  });

  return {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    phone: updatedUser.phone ?? '',
    avatar: updatedUser.avatar ?? '',
    bio: updatedUser.bio ?? '',
    createdAt: updatedUser.createdAt,
    gender: updatedUser.gender ?? '',
  };
}


  /**
   * 
   * @param id 
   * @description Delete user
   * @param updateAuthDto
   * @returns { message: string }
   *  
   */

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: id
      }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.user.delete({
      where: {
        id: id
      }
    });
    if (user.publicId)
      await this.cloudinaryService.deleteFile(user.publicId);
    return { message: 'User deleted successfully' };
  }

  async hashPassword(password: string): Promise<string> {
    let saltRounds = 10;
    let hashPassword = await bcrypt.hash(password, saltRounds);
    return hashPassword;
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    let isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  }

  async generateJwt(payload: { id: number, role: Role }): Promise<string> {
    let token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET
    });
    return token;
  }

  private generateOtp(): string {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(otp); // e.g., "5732"
    return otp;
  }

  async loginWithGoogle(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload?.name) throw new UnauthorizedException();

      return this.findOrCreateUser({
        provider: Provider.GOOGLE,
        providerAccountId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatar: payload.picture,
      });
    } catch (error) {
      throw new UnauthorizedException("Invalid Google authentication request");
    }
  }

  async loginWithFacebook(accessToken: string) {
    try {
      const { data } = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`,
      );
      if (!data?.email || !data?.name) throw new UnauthorizedException();

      return this.findOrCreateUser({
        provider: Provider.FACEBOOK,
        providerAccountId: data.id,
        email: data.email,
        name: data.name,
        avatar: data.picture?.data?.url,
      });
    } catch (error) {
      throw new UnauthorizedException("Invalid Facebook authentication request");
    }
  }

  private async findOrCreateUser(info: {
    provider: Provider;
    providerAccountId: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    let user = await this.prisma.user.findUnique({ where: { email: info.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: info.email,
          name: info.name,
          avatar: info.avatar,
          password: '', // not used for OAuth users
          role: Role.STUDENT, // default role
          accounts: {
            create: {
              provider: info.provider as Provider,
              providerAccountId: info.providerAccountId,
            },
          },
        },
      });
    } else {
      // ensure account relation exists
      await this.prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: info.provider,
            providerAccountId: info.providerAccountId,
          },
        },
        update: {},
        create: {
          provider: info.provider,
          providerAccountId: info.providerAccountId,
          userId: user.id,
        },
      });
    }

    const token = this.jwtService.sign({ id: user.id, role: user.role });
    return { user, token };
  }
}
