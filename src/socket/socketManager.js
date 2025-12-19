import { Server } from 'socket.io';

let io = null;

export const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });

        // Optional: Client can request initial data
        socket.on('request-devices', () => {
            console.log(`Client ${socket.id} requested device list`);
        });

        socket.on('request-stats', () => {
            console.log(`Client ${socket.id} requested network stats`);
        });
    });

    console.log('Socket.io initialized');
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initializeSocket first.');
    }
    return io;
};