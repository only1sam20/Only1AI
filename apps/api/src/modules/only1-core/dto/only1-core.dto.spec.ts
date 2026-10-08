import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOnly1CoreDto } from './create-only1-core.dto';
import { UpdateOnly1CoreDto } from './update-only1-core.dto';

describe('Only1Core DTO validation', () => {
  it('allows omitted patch fields and explicit clearing of the description', async () => {
    await expect(validate(plainToInstance(UpdateOnly1CoreDto, {}))).resolves.toHaveLength(0);
    await expect(validate(plainToInstance(UpdateOnly1CoreDto, { description: null }))).resolves.toHaveLength(0);
  });

  it.each(['name', 'status', 'analysisIntervalMinutes'])('rejects null for nonnullable field %s', async (field) => {
    await expect(validate(plainToInstance(UpdateOnly1CoreDto, { [field]: null }))).resolves.not.toHaveLength(0);
  });

  it('rejects whitespace-only names during creation and update', async () => {
    await expect(validate(plainToInstance(CreateOnly1CoreDto, { name: '   ' }))).resolves.not.toHaveLength(0);
    await expect(validate(plainToInstance(UpdateOnly1CoreDto, { name: '   ' }))).resolves.not.toHaveLength(0);
  });

  it('trims a valid name before validation', async () => {
    const dto = plainToInstance(CreateOnly1CoreDto, { name: '  London Open  ' });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('London Open');
  });
});
