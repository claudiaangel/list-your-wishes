import * as migration_20261111_082143_initial from './20261111_082143_initial';
import * as migration_20261111_185544_media_storage_fields from './20261111_185544_media_storage_fields';
import * as migration_20261111_224004_banner_settings from './20261111_224004_banner_settings';
import * as migration_20261111_225024_banner_text_color from './20261111_225024_banner_text_color';
import * as migration_20261111_232428_banner_shape_bunny from './20261111_232428_banner_shape_bunny';
import * as migration_20261112_075709_banner_image from './20261112_075709_banner_image';

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
    name: '20261111_224004_banner_settings',
  },
  {
    up: migration_20261111_225024_banner_text_color.up,
    down: migration_20261111_225024_banner_text_color.down,
    name: '20261111_225024_banner_text_color',
  },
  {
    up: migration_20261111_232428_banner_shape_bunny.up,
    down: migration_20261111_232428_banner_shape_bunny.down,
    name: '20261111_232428_banner_shape_bunny',
  },
  {
    up: migration_20261112_075709_banner_image.up,
    down: migration_20261112_075709_banner_image.down,
    name: '20261112_075709_banner_image'
  },
];
