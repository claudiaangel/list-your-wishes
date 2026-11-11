import * as migration_20261111_082143_initial from './20261111_082143_initial';
import * as migration_20261111_185544_media_storage_fields from './20261111_185544_media_storage_fields';

export const migrations = [
  {
    up: migration_20261111_082143_initial.up,
    down: migration_20261111_082143_initial.down,
    name: '20261111_082143_initial',
  },
  {
    up: migration_20261111_185544_media_storage_fields.up,
    down: migration_20261111_185544_media_storage_fields.down,
    name: '20261111_185544_media_storage_fields'
  },
];
