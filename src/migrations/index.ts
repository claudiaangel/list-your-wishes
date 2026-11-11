import * as migration_20261111_082143_initial from './20261111_082143_initial';

export const migrations = [
  {
    up: migration_20261111_082143_initial.up,
    down: migration_20261111_082143_initial.down,
    name: '20261111_082143_initial'
  },
];
