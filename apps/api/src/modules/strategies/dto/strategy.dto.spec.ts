import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStrategyDto } from './create-strategy.dto';
import { UpdateStrategyDto } from './update-strategy.dto';
import { StrategyRuleDto } from './strategy-rule.dto';

const coreId = '00000000-0000-4000-8000-000000000001';

describe('strategy DTO validation', () => {
  it('allows omitted patch fields and explicit clearing of nullable text', async () => {
    await expect(validate(plainToInstance(UpdateStrategyDto, {}))).resolves.toHaveLength(0);
    await expect(validate(plainToInstance(UpdateStrategyDto, { description: null, timeframe: null }))).resolves.toHaveLength(0);
  });

  it.each(['name', 'status', 'rules'])('rejects null for nonnullable patch field %s', async (field) => {
    await expect(validate(plainToInstance(UpdateStrategyDto, { [field]: null }))).resolves.not.toHaveLength(0);
  });

  it.each(['status', 'rules'])('rejects null for optional nonnullable create field %s', async (field) => {
    await expect(validate(plainToInstance(CreateStrategyDto, { only1CoreId: coreId, name: 'Momentum', [field]: null }))).resolves.not.toHaveLength(0);
  });

  it.each([CreateStrategyDto, UpdateStrategyDto])('rejects whitespace-only strategy names before persistence', async (dtoClass) => {
    await expect(validate(plainToInstance(dtoClass, { only1CoreId: coreId, name: '   ' }))).resolves.not.toHaveLength(0);
  });

  it('trims valid names and nested rule text', async () => {
    const dto = plainToInstance(CreateStrategyDto, {
      only1CoreId: coreId, name: '  Momentum  ', rules: [{ category: '  Trend  ', condition: '  Bullish  ' }],
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Momentum');
    expect(dto.rules?.[0]).toMatchObject({ category: 'Trend', condition: 'Bullish' });
  });

  it.each(['category', 'condition'])('rejects whitespace-only rule %s', async (field) => {
    await expect(validate(plainToInstance(StrategyRuleDto, { category: 'Trend', condition: 'Bullish', [field]: '   ' }))).resolves.not.toHaveLength(0);
  });
});
