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

import { 
    logScanStart, 
    logDeviceFound, 
    logPortScanStart, 
    logPortsFound, 
    logScanComplete, 
    logError 
} from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/scan/network
 * Trigger network scan (Person 1's function + Person 3's Socket.io)
 */
router.post('/scan/network', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { network, interface: iface = 'eth0', scanPorts = true } = req.body;

        if (!network) {
            return res.status(400).json({
                success: false,
                error: 'Network parameter is required (e.g., "192.168.1.0/24")'
            });
        }

        // Enhanced logging
        logScanStart(network, iface);
        
        // Emit scan start
        emitScanProgress({ percentage: 0, message: 'Starting network scan...' });
        
        // Call Person 1's scanning function
        const results = await discoverDevices(network, iface);

        console.log(`✅ Discovered ${results.devices.length} devices`);
        
        // Log each discovered device
        results.devices.forEach((device, i) => {
            logDeviceFound(device, i + 1, results.devices.length);
        });
        
        // Emit devices discovered
        emitDevicesUpdated(results.devices);
        emitScanProgress({ 
            percentage: 50, 
            message: `Found ${results.devices.length} devices. Scanning ports...` 
        });

        // AUTO PORT SCAN - Scan ports for each discovered device
        if (scanPorts && results.devices.length > 0) {
            console.log(`\n🔍 Starting port scans for ${results.devices.length} devices...\n`);
            
            for (let i = 0; i < results.devices.length; i++) {
                const device = results.devices[i];
                const progress = 50 + ((i + 1) / results.devices.length * 50);
                
                try {
                    logPortScanStart(device.ip);
                    
                    emitScanProgress({ 
                        percentage: Math.round(progress), 
                        message: `Scanning ports: ${device.ip} (${i + 1}/${results.devices.length})` 
                    });
                    
                    const updatedDevice = await scanDevicePorts(device.ip);
                    
                    if (updatedDevice) {
                        logPortsFound(device.ip, updatedDevice.ports || []);
                    }
                    
                    // Small delay to avoid overwhelming the network
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`  ❌ Port scan failed for ${device.ip}:`, error.message);
                }
            }
        }
        
        // Get updated devices with port information
        const updatedDevices = getAllDevices();
        
        // Calculate duration
        const duration = Date.now() - startTime;
        
        // Enhanced completion logging
        logScanComplete(updatedDevices.length, duration);
        
        // Emit final results
        emitDevicesUpdated(updatedDevices);
        emitScanComplete({
            success: true,
            deviceCount: updatedDevices.length,
            network: network,
            errors: results.errors
        });

        // Also send HTTP response
        res.json({
            success: true,
            data: {
                devices: updatedDevices,
                errors: results.errors,
                summary: {
                    devicesFound: updatedDevices.length,
                    scanErrors: results.errors.length,
                    portsScanned: scanPorts,
                    duration: duration
                }
            }
        });
    } catch (error) {
        logError('Network scan failed', error);
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