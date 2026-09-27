import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  it('creates listings as drafts', async () => {
    const listings = { create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) };
    const strategies = { exists: jest.fn() };
    await expect(new MarketplaceService(listings as never, strategies as never).create('u', 'Template', 'A carefully documented strategy template.')).resolves.toMatchObject({ status: 'draft' });
  });
});
