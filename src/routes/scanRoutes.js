import express from 'express';
import {
    discoverDevices,
    scanDevicePorts,
    getAllDevices,
    getDevice,
    clearDevices,
    getNetworkStats
} from '../services/deviceDiscovery.js';
import {
    emitDevicesUpdated,
    emitScanComplete,
    emitScanProgress,
    emitNewDevice,
    emitStatsUpdated,
    emitError
} from '../socket/socketHandlers.js';

const router = express.Router();

/**
 * POST /api/scan/network
 * Trigger network scan (Person 1's function + Person 3's Socket.io)
 */
router.post('/scan/network', async (req, res) => {
    try {
        const { network, interface: iface = 'eth0' } = req.body;

        if (!network) {
            return res.status(400).json({
                success: false,
                error: 'Network parameter is required (e.g., "192.168.1.0/24")'
            });
        }

        console.log(`API: Starting network scan for ${network}`);
        
        // Emit scan start
        emitScanProgress({ percentage: 0, message: 'Starting network scan...' });
        
        // Call Person 1's scanning function
        const results = await discoverDevices(network, iface);

        // Emit devices to all connected clients via Socket.io
        emitDevicesUpdated(results.devices);
        
        // Emit scan complete
        emitScanComplete({
            success: true,
            deviceCount: results.devices.length,
            network: network,
            errors: results.errors
        });

        // Also send HTTP response
        res.json({
            success: true,
            data: {
                devices: results.devices,
                errors: results.errors,
                summary: {
                    devicesFound: results.devices.length,
                    scanErrors: results.errors.length
                }
            }
        });
    } catch (error) {
        console.error('Network scan error:', error);
        emitError({ message: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/scan/ports
 * Scan ports for specific device
 */
router.post('/scan/ports', async (req, res) => {
    try {
        const { ip } = req.body;

        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP address is required'
            });
        }

        console.log(`API: Starting port scan for ${ip}`);
        
        emitScanProgress({ percentage: 0, message: `Scanning ports for ${ip}...` });
        
        const device = await scanDevicePorts(ip);

        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found or scan failed'
            });
        }

        // Emit updated device
        emitDevicesUpdated([device]);
        emitScanProgress({ percentage: 100, message: 'Port scan complete' });

        res.json({
            success: true,
            data: device
        });
    } catch (error) {
        console.error('Port scan error:', error);
        emitError({ message: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/devices
 * Get all discovered devices
 */
router.get('/devices', (req, res) => {
    try {
        const devices = getAllDevices();
        
        // Emit to Socket.io clients
        emitDevicesUpdated(devices);
        
        res.json({
            success: true,
            data: {
                devices,
                count: devices.length
            }
        });
    } catch (error) {
        console.error('Get devices error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/devices/:ip
 * Get specific device by IP
 */
router.get('/devices/:ip', (req, res) => {
    try {
        const { ip } = req.params;
        const device = getDevice(ip);

        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        res.json({
            success: true,
            data: device
        });
    } catch (error) {
        console.error('Get device error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/devices
 * Clear all devices
 */
router.delete('/devices', (req, res) => {
    try {
        clearDevices();
        
        // Notify clients
        emitDevicesUpdated([]);
        
        res.json({
            success: true,
            message: 'All devices cleared'
        });
    } catch (error) {
        console.error('Clear devices error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/stats
 * Get network statistics
 */
router.get('/stats', (req, res) => {
    try {
        const stats = getNetworkStats();
        
        // Emit to Socket.io clients
        emitStatsUpdated(stats);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;