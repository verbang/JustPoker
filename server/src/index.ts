import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { database } from './services/database.service';
import { socketService } from './services/socket.service';
import roomRouter from './modules/room/room.controller';
import { roomService } from './modules/room/room.service';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: corsOrigins
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/rooms', roomRouter);

// Initialize services
async function initialize() {
  try {
    // Initialize database
    await database.initialize();

    // Initialize socket
    socketService.initialize(httpServer);

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // 优雅关闭处理
    const shutdown = () => {
      logger.info('正在关闭服务器...');
      roomService.destroy();
      httpServer.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Failed to initialize server', error);
    process.exit(1);
  }
}

initialize();

export { app, httpServer };
