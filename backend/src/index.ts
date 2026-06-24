import 'dotenv/config';
import app from './app';
import { logger } from './utils/logger';
import { migrate } from './db/migrate';
import { createIndex } from './elasticsearch/create-index';

const PORT = process.env.PORT || 4000;

async function start() {
  await migrate();
  await createIndex();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});

