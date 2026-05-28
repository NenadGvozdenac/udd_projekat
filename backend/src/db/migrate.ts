import { db } from '../config/database';
import { logger } from '../utils/logger';

export async function migrate() {
  const exists = await db.schema.hasTable('users');
  if (!exists) {
    await db.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.string('email', 255).notNullable().unique();
      table.string('password', 255).notNullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    logger.info('Migration complete: users table created');
  } else {
    logger.info('Migration complete: users table already exists');
  }
}

// Allow running directly: ts-node src/db/migrate.ts
if (require.main === module) {
  migrate()
    .then(() => db.destroy())
    .catch((err) => {
      logger.error('Migration failed', { error: err.message });
      process.exit(1);
    });
}
