import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { PASSWORD_COMPLEXITY_PATTERN, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE } from '../password-policy';
import { PreferredStrategy, PreferredTrade } from '../../users/entities/user-profile.entity';

export class RegisterDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_COMPLEXITY_PATTERN, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/, { message: 'Trader name cannot be blank.' })
  traderName!: string;

  @IsEnum(PreferredTrade)
  preferredTrade!: PreferredTrade;

  @IsEnum(PreferredStrategy)
  preferredStrategy!: PreferredStrategy;

  @ValidateIf((registration: RegisterDto) => registration.preferredStrategy === PreferredStrategy.CUSTOM)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  customStrategy?: string;
}
