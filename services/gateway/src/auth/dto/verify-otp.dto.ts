import { IsEmail, IsIn, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyOtpDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Code must be 6 digits.' })
  code: string;

  @IsIn(['SIGNUP_VERIFY', 'LOGIN_2FA', 'PASSWORD_RESET'])
  purpose: 'SIGNUP_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET';
}

export class ResendOtpDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail()
  email: string;

  @IsIn(['SIGNUP_VERIFY', 'LOGIN_2FA', 'PASSWORD_RESET'])
  purpose: 'SIGNUP_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET';
}