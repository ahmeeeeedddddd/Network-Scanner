// src/socket/socketHandlers.js
// Socket.io event handlers (Person 1's existing + Person 2's additions)

import { getIO } from './socketManager.js';

/**
 * Person 1's existing handlers (keep these)
 */

export const emitDevicesUpdated = (devices) => {
    try {
        const io = getIO();
        io.emit('devices-updated', devices);
        console.log(`Emitted devices-updated: ${devices.length} devices`);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

export const emitScanComplete = (data) => {
    try {
        const io = getIO();
        io.emit('scan-complete', data);
        console.log('Emitted scan-complete');
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

export const emitScanProgress = (data) => {
    try {
        const io = getIO();
        io.emit('scan-progress', data);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

export const emitNewDevice = (device) => {
    try {
        const io = getIO();
        io.emit('new-device', device);
        console.log(`Emitted new-device: ${device.ip}`);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

export const emitStatsUpdated = (stats) => {
    try {
        const io = getIO();
        io.emit('stats-updated', stats);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

export const emitError = (error) => {
    try {
        const io = getIO();
        io.emit('error', error);
        console.error('Emitted error:', error.message);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

/**
 * Person 2's new handlers (ADD THESE)
 */

// Emit security alert
export const emitAlert = (alert) => {
    try {
        const io = getIO();
        io.emit('security-alert', alert);
        console.log(`🚨 Emitted security-alert: ${alert.severity} for ${alert.ip}`);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

// Emit port scan complete
export const emitPortScanComplete = (data) => {
    try {
        const io = getIO();
        io.emit('port-scan-complete', data);
        console.log(`Emitted port-scan-complete for ${data.ip}`);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

// Emit threat detection
export const emitThreatDetected = (threat) => {
    try {
        const io = getIO();
        io.emit('threat-detected', threat);
        console.log(`⚠️ Emitted threat-detected: ${threat.type} on ${threat.ip}`);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

// Emit monitoring stats update
export const emitMonitoringStatsUpdated = (stats) => {
    try {
        const io = getIO();
        io.emit('monitoring-stats-updated', stats);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};