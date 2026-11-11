import * as migration_20261111_082143_initial from './20261111_082143_initial';
import * as migration_20261111_185544_media_storage_fields from './20261111_185544_media_storage_fields';
import * as migration_20261111_224004_banner_settings from './20261111_224004_banner_settings';

export const migrations = [
  {
    up: migration_20261111_082143_initial.up,
    down: migration_20261111_082143_initial.down,
    name: '20261111_082143_initial',
  },
  {
    up: migration_20261111_185544_media_storage_fields.up,
    down: migration_20261111_185544_media_storage_fields.down,
    name: '20261111_185544_media_storage_fields',
  },
  {
    up: migration_20261111_224004_banner_settings.up,
    down: migration_20261111_224004_banner_settings.down,
    name: '20261111_224004_banner_settings'
  },
];
