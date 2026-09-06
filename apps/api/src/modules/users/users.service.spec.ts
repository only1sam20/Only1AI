import { UsersService } from './users.service';

describe('UsersService', () => {
  const users = { findOneByOrFail: jest.fn() };
  const profiles = { findOneBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn() };
  const service = new UsersService(users as never, profiles as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a profile when the user updates one for the first time', async () => {
    profiles.findOneBy.mockResolvedValue(null);
    profiles.save.mockResolvedValue({ userId: 'user-1', displayName: 'Ada', timezone: null, bio: null, updatedAt: new Date('2026-08-03') });
    await expect(service.updateProfile('user-1', { displayName: 'Ada' })).resolves.toMatchObject({ displayName: 'Ada', timezone: null });
  });
});
