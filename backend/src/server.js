import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';

import healthRoutes from './routes/healthRoutes.js';
import matchingRoutes from './routes/matchingRoutes.js';
import checkinRoutes from './routes/checkinRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Routes
app.use('/health', healthRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/checkin', checkinRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Wayfari Backend Service running on port ${PORT}`);
});
