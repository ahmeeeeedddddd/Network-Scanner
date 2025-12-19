import { getIO } from './socketManager.js';

/**
 * Emit when devices are updated/discovered
 * @param {Array} devices - Array of device objects
 */
export const emitDevicesUpdated = (devices) => {
    try {
        const io = getIO();
        io.emit('devices-updated', {
            timestamp: new Date().toISOString(),
            devices: devices,
            count: devices.length
        });
        console.log(`Emitted devices-updated: ${devices.length} devices`);
    } catch (error) {
        console.error('Error emitting devices-updated:', error.message);
    }
};

/**
 * Emit when a scan is complete
 * @param {Object} results - Scan results object
 */
export const emitScanComplete = (results) => {
    try {
        const io = getIO();
        io.emit('scan-complete', {
            timestamp: new Date().toISOString(),
            ...results
        });
        console.log('Emitted scan-complete');
    } catch (error) {
        console.error('Error emitting scan-complete:', error.message);
    }
};

/**
 * Emit scan progress updates
 * @param {Object} progress - Progress object with percentage, message, etc.
 */
export const emitScanProgress = (progress) => {
    try {
        const io = getIO();
        io.emit('scan-progress', {
            timestamp: new Date().toISOString(),
            ...progress
        });
    } catch (error) {
        console.error('Error emitting scan-progress:', error.message);
    }
};

/**
 * Emit when a new device is discovered
 * @param {Object} device - Single device object
 */
export const emitNewDevice = (device) => {
    try {
        const io = getIO();
        io.emit('new-device', {
            timestamp: new Date().toISOString(),
            device: device
        });
        console.log(`Emitted new-device: ${device.ip}`);
    } catch (error) {
        console.error('Error emitting new-device:', error.message);
    }
};

/**
 * Emit when network statistics are updated
 * @param {Object} stats - Network statistics object
 */
export const emitStatsUpdated = (stats) => {
    try {
        const io = getIO();
        io.emit('stats-updated', {
            timestamp: new Date().toISOString(),
            stats: stats
        });
        console.log('Emitted stats-updated');
    } catch (error) {
        console.error('Error emitting stats-updated:', error.message);
    }
};

/**
 * Emit when a device status changes
 * @param {Object} device - Device with updated status
 */
export const emitDeviceStatusChanged = (device) => {
    try {
        const io = getIO();
        io.emit('device-status-changed', {
            timestamp: new Date().toISOString(),
            device: device
        });
        console.log(`Emitted device-status-changed: ${device.ip}`);
    } catch (error) {
        console.error('Error emitting device-status-changed:', error.message);
    }
};

/**
 * Emit error notifications
 * @param {Object} error - Error object with message and details
 */
export const emitError = (error) => {
    try {
        const io = getIO();
        io.emit('scan-error', {
            timestamp: new Date().toISOString(),
            error: error
        });
        console.log('Emitted scan-error');
    } catch (error) {
        console.error('Error emitting scan-error:', error.message);
    }
};