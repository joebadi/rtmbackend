import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import matchRoutes from './routes/match.routes';
import likeRoutes from './routes/like.routes';
import messageRoutes from './routes/message.routes';
import adminRoutes from './routes/admin.routes';
import preferencesRoutes from './routes/preferences.routes';
import notificationRoutes from './routes/notification.routes';
import { initSocket } from './services/socket.service';

const app = express();
const httpServer = createServer(app);
const io = initSocket(httpServer);

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        process.env.ADMIN_URL || 'http://localhost:3000',
        'http://localhost:3000', // Allow local admin dashboard
    ],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Basic health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'RTM Backend API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// API info route
app.get('/api', (req, res) => {
    res.json({
        message: 'RTM API v1.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth/*',
            profile: '/api/profile/*',
            matches: '/api/matches/*',
            messages: '/api/messages/*',
            likes: '/api/likes/*',
            preferences: '/api/preferences/*',
            payments: '/api/payment/*',
            admin: '/api/admin/*',
        }
    });
});

// Socket.io logic moved to socket.service.ts

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal server error',
            status: err.status || 500,
        },
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Route not found',
            status: 404,
        },
    });
});

export { app, httpServer, io };
