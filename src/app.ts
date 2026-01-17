import express from 'express';
import cors from 'cors';
import { errorHandler } from './utils/errors';
import logger from './utils/logger';

// Routes
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/project.routes';
import projectMemberRoutes from './modules/projects/projectMembers/projectMember.routes';
import boardRoutes, { boardByIdRouter } from './modules/projects/boards/board.routes';
import columnRoutes, { reorderRouter } from './modules/projects/boards/columns/column.routes';
import cardRoutes, { moveRouter } from './modules/projects/boards/columns/cards/card.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/projects/:projectId/members', projectMemberRoutes);
app.use('/projects/:projectId/boards', boardRoutes);
app.use('/boards', boardByIdRouter);
app.use('/boards/:boardId/columns', columnRoutes);
app.use('/columns', reorderRouter);
app.use('/columns/:columnId/cards', cardRoutes);
app.use('/cards', moveRouter);

// Error handling (must be last)
app.use(errorHandler);

export default app;
