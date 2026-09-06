import { UserRole } from '../modules/users/entities/user.entity';

export interface AuthenticatedUser { id: string; role: UserRole; }
