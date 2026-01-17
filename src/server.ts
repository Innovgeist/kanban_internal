import app from './app';
import { connectDatabase } from './config/database';
import { config } from './config/env';
import logger from './utils/logger';

// Initialize database connection (cached for serverless)
let dbConnected = false;

const connectDB = async () => {
  if (!dbConnected) {
    try {
      await connectDatabase();
      dbConnected = true;
    } catch (error) {
      logger.error('Database connection error:', error);
      throw error;
    }
  }
};

// For Vercel serverless functions
export default async (req: any, res: any) => {
  await connectDB();
  return app(req, res);
};

// For local development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = config.port;

  connectDatabase()
    .then(() => {
      app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
        logger.info(`Environment: ${config.nodeEnv}`);
      });
    })
    .catch((error) => {
      logger.error('Failed to start server:', error);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}
