/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Analytics events table
  pgm.createTable('analytics_events', {
    id: 'id',
    event_type: { type: 'varchar(100)', notNull: true },
    user_id: { type: 'varchar(42)' },
    metadata: { type: 'jsonb' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('analytics_events', 'event_type');
  pgm.createIndex('analytics_events', 'user_id');
  pgm.createIndex('analytics_events', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('analytics_events');
};
