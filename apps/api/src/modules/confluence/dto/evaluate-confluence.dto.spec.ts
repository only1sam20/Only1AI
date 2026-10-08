import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EvaluateConfluenceDto } from './evaluate-confluence.dto';

describe('Confluence observation validation', () => {
  const input = { strategyId: '39d87ffd-e9f8-4bfa-b197-fca9a975b86e' };

  it.each(['category', 'condition'])('rejects whitespace-only %s', async (field) => {
    const dto = plainToInstance(EvaluateConfluenceDto, {
      ...input, observations: [{ category: 'session', condition: 'London', [field]: ' \t\n ' }],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('observations');
    expect(errors[0].children?.[0].children?.[0].property).toBe(field);
  });

  it('trims valid observations before saving evidence', async () => {
    const dto = plainToInstance(EvaluateConfluenceDto, {
      ...input, observations: [{ category: '  session  ', condition: '  London  ' }],
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.observations[0]).toMatchObject({ category: 'session', condition: 'London' });
  });
});
