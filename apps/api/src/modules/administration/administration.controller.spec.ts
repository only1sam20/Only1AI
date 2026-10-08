import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './administration.controller';

describe('administration DTO validation', () => {
  it('accepts omitted fields and a deliberate deactivation', async () => {
    await expect(validate(plainToInstance(UpdateUserDto, {}))).resolves.toHaveLength(0);
    await expect(validate(plainToInstance(UpdateUserDto, { isActive: false }))).resolves.toHaveLength(0);
  });

  it.each(['role', 'isActive'])('rejects null for nonnullable field %s', async (field) => {
    await expect(validate(plainToInstance(UpdateUserDto, { [field]: null }))).resolves.not.toHaveLength(0);
  });
});
