import { NotFoundException } from '@nestjs/common';
import { Only1CoreService } from './only1-core.service';

describe('Only1CoreService', () => {
  const cores = { findOneBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn() };
  const service = new Only1CoreService(cores as never);
  beforeEach(() => jest.clearAllMocks());
  it('creates a new core paused until the user activates it', async () => {
    cores.save.mockResolvedValue({ id: 'core-1', name: 'London Open', status: 'paused' });
    await expect(service.create('user-1', { name: ' London Open ' })).resolves.toMatchObject({ status: 'paused' });
  });
  it('does not reveal another user’s core', async () => {
    cores.findOneBy.mockResolvedValue(null);
    await expect(service.getForUser('user-1', 'core-2')).rejects.toBeInstanceOf(NotFoundException);
  });
});
