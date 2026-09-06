import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('returns honest empty states before trading modules exist', async () => {
    const service = new DashboardService({ findOneByOrFail: jest.fn().mockResolvedValue({ email: 'trader@example.com' }) } as never, { findOneBy: jest.fn().mockResolvedValue(null) } as never, { countBy: jest.fn().mockResolvedValue(0) } as never, { countBy: jest.fn().mockResolvedValue(0) } as never, { countBy: jest.fn().mockResolvedValue(0) } as never);
    await expect(service.missionControl('user-1')).resolves.toMatchObject({ greetingName: 'trader', metrics: { activeCores: 0, opportunityZones: 0 }, opportunities: [] });
  });
});
