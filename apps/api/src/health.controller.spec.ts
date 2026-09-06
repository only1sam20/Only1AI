import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports API availability', () => {
    expect(new HealthController().check()).toEqual({ status: 'ok', service: 'api' });
  });
});
