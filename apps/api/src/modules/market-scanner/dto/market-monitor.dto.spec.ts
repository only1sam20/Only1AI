import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMarketMonitorDto } from './create-market-monitor.dto';
import { UpdateMarketMonitorDto } from './update-market-monitor.dto';

describe('market monitor DTO validation', () => {
  it('allows omitted optional patch fields', async () => {
    await expect(validate(plainToInstance(UpdateMarketMonitorDto, {}))).resolves.toHaveLength(0);
  });

  it.each(['timeframe', 'status'])('rejects null for nonnullable patch field %s', async (field) => {
    await expect(validate(plainToInstance(UpdateMarketMonitorDto, { [field]: null }))).resolves.not.toHaveLength(0);
  });

  it('rejects an explicit null status during creation', async () => {
    const dto = plainToInstance(CreateMarketMonitorDto, {
      only1CoreId: '00000000-0000-4000-8000-000000000001', symbol: 'EUR/USD', marketType: 'forex', timeframe: '15min', status: null,
    });
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
