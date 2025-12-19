// src/routes/portMonitoringRoutes.js
// Person 2: Port Monitoring API Routes (Integrated with Person 1's system)

import express from 'express';
import {
    scanDevicePorts,
    scanMultipleDevices,
    addToWhitelist,
    removeFromWhitelist,
    getWhitelist,
    isWhitelisted,
    addToBlacklist,
    removeFromBlacklist,
    getBlacklist,
    isBlacklisted,
    getAlerts,
    getDeviceAlerts,
    acknowledgeAlert,
    clearAlerts,
    getMonitoringStats,
    analyzeAllDevices
} from '../services/portMonitoring.js';
import { getAllDevices, getDevice } from '../services/deviceDiscovery.js';
import { emitDevicesUpdated, emitStatsUpdated, emitAlert } from '../socket/socketHandlers.js';

const router = express.Router();

/**
 * POST /api/monitoring/scan/device
 * Detailed port scan for a specific device
 */
router.post('/monitoring/scan/device', async (req, res) => {
    try {
        const { ip, scanType = 'quick' } = req.body;

        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP address is required'
            });
        }

        console.log(`API: Port monitoring scan for ${ip} (${scanType})`);
        
        const result = await scanDevicePorts(ip, scanType);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Port monitoring scan error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/monitoring/scan/batch
 * Batch scan multiple devices
 */
router.post('/monitoring/scan/batch', async (req, res) => {
    try {
        const { devices, scanType = 'quick' } = req.body;

        if (!devices || !Array.isArray(devices) || devices.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Devices array is required'
            });
        }

        console.log(`API: Batch port scan for ${devices.length} devices`);
        
        const result = await scanMultipleDevices(devices, scanType);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Batch scan error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/monitoring/analyze
 * Analyze all discovered devices for threats
 */
router.post('/monitoring/analyze', async (req, res) => {
    try {
        console.log('API: Analyzing all devices for threats...');
        
        const result = await analyzeAllDevices();
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/monitoring/whitelist
 * Add device to whitelist
 */
router.post('/monitoring/whitelist', (req, res) => {
    try {
        const { ip } = req.body;

        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP address is required'
            });
        }

        addToWhitelist(ip);
        
        res.json({
            success: true,
            message: `${ip} added to whitelist`,
            whitelist: getWhitelist()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/monitoring/whitelist/:ip
 * Remove device from whitelist
 */
router.delete('/monitoring/whitelist/:ip', (req, res) => {
    try {
        const { ip } = req.params;
        removeFromWhitelist(ip);
        
        res.json({
            success: true,
            message: `${ip} removed from whitelist`,
            whitelist: getWhitelist()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/monitoring/whitelist
 * Get all whitelisted devices
 */
router.get('/monitoring/whitelist', (req, res) => {
    try {
        const whitelist = getWhitelist();
        res.json({
            success: true,
            data: whitelist,
            count: whitelist.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/monitoring/blacklist
 * Add device to blacklist
 */
router.post('/monitoring/blacklist', (req, res) => {
    try {
        const { ip } = req.body;

        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP address is required'
            });
        }

        addToBlacklist(ip);
        
        res.json({
            success: true,
            message: `${ip} added to blacklist`,
            blacklist: getBlacklist()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/monitoring/blacklist/:ip
 * Remove device from blacklist
 */
router.delete('/monitoring/blacklist/:ip', (req, res) => {
    try {
        const { ip } = req.params;
        removeFromBlacklist(ip);
        
        res.json({
            success: true,
            message: `${ip} removed from blacklist`,
            blacklist: getBlacklist()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/monitoring/blacklist
 * Get all blacklisted devices
 */
router.get('/monitoring/blacklist', (req, res) => {
    try {
        const blacklist = getBlacklist();
        res.json({
            success: true,
            data: blacklist,
            count: blacklist.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/monitoring/alerts
 * Get alerts with optional filtering
 */
router.get('/monitoring/alerts', (req, res) => {
    try {
        const { filter = 'all' } = req.query;
        const alerts = getAlerts(filter);
        
        res.json({
            success: true,
            data: alerts,
            count: alerts.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/monitoring/alerts/:ip
 * Get alerts for specific device
 */
router.get('/monitoring/alerts/:ip', (req, res) => {
    try {
        const { ip } = req.params;
        const alerts = getDeviceAlerts(ip);
        
        res.json({
            success: true,
            data: alerts,
            count: alerts.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/monitoring/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.put('/monitoring/alerts/:alertId/acknowledge', (req, res) => {
    try {
        const { alertId } = req.params;
        acknowledgeAlert(alertId);
        
        res.json({
            success: true,
            message: 'Alert acknowledged'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/monitoring/alerts
 * Clear all alerts
 */
router.delete('/monitoring/alerts', (req, res) => {
    try {
        clearAlerts();
        
        res.json({
            success: true,
            message: 'All alerts cleared'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/monitoring/stats
 * Get monitoring statistics
 */
router.get('/monitoring/stats', (req, res) => {
    try {
        const stats = getMonitoringStats();
        
        // Emit to Socket.io clients
        emitStatsUpdated(stats);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/monitoring/device/:ip/status
 * Check if device is whitelisted/blacklisted
 */
router.get('/monitoring/device/:ip/status', (req, res) => {
    try {
        const { ip } = req.params;
        
        res.json({
            success: true,
            data: {
                ip,
                isWhitelisted: isWhitelisted(ip),
                isBlacklisted: isBlacklisted(ip),
                alerts: getDeviceAlerts(ip).length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;