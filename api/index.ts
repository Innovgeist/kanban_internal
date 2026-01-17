import app from '../src/app';
import { connectDatabase } from '../src/config/database';
import logger from '../src/utils/logger';

// Initialize database connection (cached for serverless)
let dbConnected = false;

const connectDB = async () => {
  if (!dbConnected) {
    try {
      await connectDatabase();
      dbConnected = true;
      logger.info('Database connected (serverless)');
    } catch (error) {
      logger.error('Database connection error:', error);
      // Don't throw in serverless - let it retry on next request
    }
  }
};

export default async (req: any, res: any) => {
  await connectDB();
  return app(req, res);
};
