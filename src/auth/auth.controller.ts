import { Controller, Get, Post, Body, Patch, Delete, Req, UseGuards, Query, Logger, UploadedFile, UseInterceptors, BadRequestException, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginDto } from './dto/login.dto';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      fileFilter: (req, file, cb) => {
        if (!file) {
          return cb(null, false);
        }
        cb(null, true);
      }
    }),
  )
  /**
   * Create a new user
   * @param createAuthDto 
   * @returns RegisterResponse
   */
  create(@Body() createAuthDto: CreateAuthDto, @UploadedFile() file?: Express.Multer.File) {
    return this.authService.create(createAuthDto , file);
  }

  @Post('login')
  /**
   * Login a user
   * @param loginDto 
   * @returns LoginResponse
   */
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('forget-password')
  /**
   * Forgot password - generate OTP and send to email
   * @param email 
   * @returns { message: string }
   */
  findOne(@Query('email') email: string) {
    Logger.log(email, 'email');
    return this.authService.forgetPassword(email);
  }

  @Post('verify-otp')
  /**
   * Verify OTP
   * @param email 
   * @param otp 
   * @returns { message: string }
   */
  verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Get('profile')
  @UseGuards(AuthenticationGuard)
  /**
   * Get user profile
   * @param req the express request object
   * @returns { id, name, email, role }
   */
  getProfile(@Req() req: any) {

    return this.authService.getProfile(+req.user.id);
  }

  @Get('get-profile/:id')
  @UseGuards(AuthenticationGuard)
  /**
   * Get user profile
   * @param req the express request object
   * @returns { id, name, email, role }
   */
  getstudentProfile(@Param('id') id: string) {

    return this.authService.getProfile(+id);
  }

  @Patch('update-profile')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      fileFilter: (req, file, cb) => {
        if (!file) {
          return cb(null, false);
        }
        cb(null, true);
      }
    }),
  )
  @UseGuards(AuthenticationGuard)
  /**
   * Update a user profile
   * @param req the express request object
   * @param updateAuthDto the user data to update
   * @returns the updated user object
   */
  update(@Req() req: any, @Body() updateAuthDto: UpdateAuthDto , @UploadedFile() file: Express.Multer.File) {
    return this.authService.update(+req.user.id, updateAuthDto , file);
  }

  @Delete('delete-account')
  @UseGuards(AuthenticationGuard)
  /**
   * Delete a user account
   * @param req the express request object
   * @returns { message: string }
   */
  remove(@Req() req: any) {
    return this.authService.remove(+req.user.id);
  }

  // ===== Google =====
  @Post('google')
  async googleLogin(@Body('idToken') idToken: string) {
    return this.authService.loginWithGoogle(idToken);
  }

  // ===== Facebook =====
  @Post('facebook')
  async facebookLogin(@Body('accessToken') accessToken: string) {
    return this.authService.loginWithFacebook(accessToken);
  }
}
