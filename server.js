// server.js - Main server (Updated to include Person 2's routes)
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import scanRoutes from './src/routes/scanRoutes.js';
import portMonitoringRoutes from './src/routes/portMonitoringRoutes.js'; // Person 2's routes
import { initializeSocket } from './src/socket/socketManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.io
initializeSocket(httpServer);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api', scanRoutes); // Person 1's routes
app.use('/api', portMonitoringRoutes); // Person 2's routes (integrated)

// Main dashboard route
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Network Scanner Dashboard',
        apiUrl: `/api`
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Network Scanner Backend',
        modules: {
            networkDiscovery: 'active', // Person 1
            portMonitoring: 'active'    // Person 2
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Socket.io enabled for real-time updates`);
    console.log(`✅ Person 1: Network Discovery - Active`);
    console.log(`✅ Person 2: Port Monitoring - Active`);
    console.log(`\nAvailable endpoints:`);
    console.log(`   Person 1: /api/scan/network`);
    console.log(`   Person 1: /api/scan/ports`);
    console.log(`   Person 1: /api/devices`);
    console.log(`   Person 1: /api/stats`);
    console.log(`   Person 2: /api/monitoring/scan/device`);
    console.log(`   Person 2: /api/monitoring/scan/batch`);
    console.log(`   Person 2: /api/monitoring/alerts`);
    console.log(`   Person 2: /api/monitoring/whitelist`);
    console.log(`   Person 2: /api/monitoring/blacklist`);
    console.log(`   Person 2: /api/monitoring/stats`);
});

export default app;