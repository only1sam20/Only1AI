import { IsString, Matches, MaxLength, MinLength, Validate } from 'class-validator';
import { PASSWORD_COMPLEXITY_PATTERN, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE, PasswordMaxBytesConstraint } from '../password-policy';

export class PasswordResetConfirmDto {
  @IsString()
  @Matches(/^[a-f0-9]{24}\.[a-f0-9]{64}$/i)
  token!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Validate(PasswordMaxBytesConstraint)
  @Matches(PASSWORD_COMPLEXITY_PATTERN, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;
}
