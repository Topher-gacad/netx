import { createApp } from './app.js';
import { config } from './config.js';
import { getDb } from './db/connection.js';

// Initialize database
getDb();

const app = createApp();

app.listen(config.port, () => {
  console.log(`[NetX Server] Running on http://localhost:${config.port}`);
  console.log(`[NetX Server] Admin: ${config.adminUsername} / ${config.adminPassword}`);
  console.log(`[NetX Server] CORS: ${config.corsOrigin}`);
});
