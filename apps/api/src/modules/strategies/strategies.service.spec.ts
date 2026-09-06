import { StrategiesService } from './strategies.service';

describe('StrategiesService', () => {
  it('does not create a strategy on another user’s Only1Core', async () => {
    const service = new StrategiesService({} as never, {} as never, { exists: jest.fn().mockResolvedValue(false) } as never, {} as never);
    await expect(service.create('user-1', { only1CoreId: '00000000-0000-0000-0000-000000000002', name: 'Breakout' })).rejects.toThrow('Only1Core not found');
  });
});
