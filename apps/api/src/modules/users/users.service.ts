import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>, @InjectRepository(UserProfile) private readonly profiles: Repository<UserProfile>) {}

  async getMe(userId: string) {
    const user = await this.users.findOneByOrFail({ id: userId });
    const profile = await this.profiles.findOneBy({ userId });
    return { id: user.id, email: user.email, role: user.role, emailVerifiedAt: user.emailVerifiedAt, profile: profile ? this.serializeProfile(profile) : null };
  }

  async updateProfile(userId: string, changes: UpdateProfileDto) {
    let profile = await this.profiles.findOneBy({ userId });
    if (!profile) profile = this.profiles.create({
      userId,
      displayName: null,
      timezone: null,
      bio: null,
      preferredTrade: null,
      preferredStrategy: null,
      customStrategy: null,
    });
    Object.assign(profile, changes);
    return this.serializeProfile(await this.profiles.save(profile));
  }

  private serializeProfile(profile: UserProfile) {
    return {
      displayName: profile.displayName,
      timezone: profile.timezone,
      bio: profile.bio,
      preferredTrade: profile.preferredTrade,
      preferredStrategy: profile.preferredStrategy,
      customStrategy: profile.customStrategy,
      updatedAt: profile.updatedAt,
    };
  }
}
