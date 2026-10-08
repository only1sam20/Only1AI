import 'reflect-metadata';
import { DataSource } from 'typeorm';
import productionDataSource from './data-source';
import { AuthToken } from '../modules/auth/entities/auth-token.entity';
import { UserProfile } from '../modules/users/entities/user-profile.entity';
import { Strategy } from '../modules/strategies/entities/strategy.entity';

class MetadataOnlyDataSource extends DataSource {
  validateEntities(): Promise<void> {
    return this.buildMetadatas();
  }
}

describe('PostgreSQL entity metadata', () => {
  const registeredEntities = Object.values(productionDataSource.options.entities ?? {});
  const dataSource = new MetadataOnlyDataSource({
    type: 'postgres',
    entities: registeredEntities,
    migrations: [],
  });
  const connect = jest.spyOn(dataSource.driver, 'connect').mockImplementation(async () => {
    throw new Error('Metadata validation must not connect to a database.');
  });

  beforeAll(async () => {
    await dataSource.validateEntities();
  });

  afterAll(() => {
    connect.mockRestore();
  });

  it('validates every production entity without initializing a database connection', () => {
    expect(registeredEntities.length).toBeGreaterThan(0);
    expect(dataSource.entityMetadatas).toHaveLength(registeredEntities.length);
    expect(dataSource.isInitialized).toBe(false);
    expect(connect).not.toHaveBeenCalled();
  });

  it.each([
    { entity: AuthToken, property: 'selector', databaseName: 'selector', length: '24' },
    { entity: UserProfile, property: 'displayName', databaseName: 'display_name', length: '80' },
    { entity: UserProfile, property: 'timezone', databaseName: 'timezone', length: '64' },
    { entity: UserProfile, property: 'customStrategy', databaseName: 'custom_strategy', length: '160' },
    { entity: Strategy, property: 'timeframe', databaseName: 'timeframe', length: '32' },
  ])('preserves the migrated nullable varchar definition for $property', ({ entity, property, databaseName, length }) => {
    const column = dataSource.getMetadata(entity).findColumnWithPropertyName(property);

    expect(column).toMatchObject({
      databaseName,
      type: 'varchar',
      length,
      isNullable: true,
    });
  });
});
