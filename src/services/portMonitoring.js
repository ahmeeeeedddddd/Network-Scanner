// src/services/portMonitoring.js
// Person 2: Port & Service Monitoring Module (Integrated with Person 1's system)

import { fastPortScan, portScan } from '../scanners/nmap.js';
import { parseNmapOutput } from '../parsers/nmapParser.js';
import { getDevice, getAllDevices } from './deviceDiscovery.js';
import { 
    emitDevicesUpdated, 
    emitScanProgress, 
    emitAlert,
    emitStatsUpdated 
} from '../socket/socketHandlers.js';

/**
 * Port Monitoring Service
 * Extends Person 1's device discovery with advanced port monitoring features
 */

// Attack detection patterns
const ATTACK_PATTERNS = {
    portScan: { threshold: 10, timeWindow: 60000 }, // 10 scans in 60 seconds
    suspiciousPorts: [21, 23, 135, 139, 445, 3389, 5900], // FTP, Telnet, SMB, RDP, VNC
    commonAttackServices: ['vsftpd 2.3.4', 'ProFTPD 1.3.3c', 'Apache 2.2.8']
};

// In-memory storage for monitoring data (integrates with Person 1's Map)
const whitelist = new Set();
const blacklist = new Set();
const alerts = [];
const scanHistory = new Map();

/**
 * Perform detailed port scan on a device
 * @param {string} ip - Target IP address
 * @param {string} scanType - 'quick' or 'full'
 * @returns {Promise<object>} Device with port and service information
 */
export async function scanDevicePorts(ip, scanType = 'quick') {
    console.log(`Person 2: Starting ${scanType} port scan on ${ip}...`);
    
    // Check if device is blacklisted
    if (isBlacklisted(ip)) {
        throw new Error('Device is blacklisted');
    }

    try {
        // Emit progress
        emitScanProgress({ 
            percentage: 0, 
            message: `Scanning ports on ${ip}...` 
        });

        // Use Person 1's existing Nmap functions
        let nmapOutput;
        if (scanType === 'full') {
            nmapOutput = await portScan(ip); // All 65535 ports
        } else {
            nmapOutput = await fastPortScan(ip); // Top 1000 ports
        }

        // Parse using Person 1's parser
        const parsedDevices = parseNmapOutput(nmapOutput);
        const deviceInfo = parsedDevices[0];

        if (!deviceInfo) {
            throw new Error('No device information returned from scan');
        }

        // Identify services and detect attacks
        const servicesInfo = identifyServices(deviceInfo);
        const detectedAttacks = detectAttackTypes(ip, deviceInfo, servicesInfo);

        // Generate alerts if needed
        if (detectedAttacks.length > 0 || servicesInfo.suspiciousServices.length > 0) {
            generateAlert(ip, detectedAttacks, servicesInfo);
        }

        // Update scan history for attack detection
        updateScanHistory(ip);

        // Emit progress complete
        emitScanProgress({ 
            percentage: 100, 
            message: `Port scan complete for ${ip}` 
        });

        // Build comprehensive result
        const result = {
            ...deviceInfo,
            scanType,
            totalPorts: deviceInfo.ports?.length || 0,
            services: servicesInfo.services,
            suspiciousServices: servicesInfo.suspiciousServices,
            detectedAttacks,
            isWhitelisted: isWhitelisted(ip),
            isBlacklisted: isBlacklisted(ip),
            alerts: getDeviceAlerts(ip),
            lastScanned: new Date().toISOString()
        };

        // Emit updated device via Socket.io
        emitDevicesUpdated([result]);

        return result;

    } catch (error) {
        console.error(`Port scan error for ${ip}:`, error);
        throw error;
    }
}

/**
 * Batch scan multiple devices
 * @param {Array} devices - Array of device objects with ip property
 * @param {string} scanType - 'quick' or 'full'
 * @returns {Promise<object>} Scan results
 */
export async function scanMultipleDevices(devices, scanType = 'quick') {
    console.log(`Person 2: Starting batch scan of ${devices.length} devices...`);
    
    const results = [];
    const errors = [];

    for (const device of devices) {
        const ip = device.ip || device;
        
        // Skip blacklisted devices
        if (isBlacklisted(ip)) {
            console.log(`Skipping blacklisted device: ${ip}`);
            continue;
        }

        try {
            const result = await scanDevicePorts(ip, scanType);
            results.push(result);
            
            // Small delay to avoid overwhelming the network
            await sleep(1000);
        } catch (error) {
            console.error(`Failed to scan ${ip}:`, error.message);
            errors.push({
                ip,
                error: error.message
            });
        }
    }

    return {
        timestamp: new Date().toISOString(),
        totalDevices: devices.length,
        scannedDevices: results.length,
        results,
        errors
    };
}

/**
 * Identify services and flag suspicious ones
 * @param {object} device - Device with ports array
 * @returns {object} Services information
 */
function identifyServices(device) {
    const services = [];
    const suspiciousServices = [];

    if (!device.ports || device.ports.length === 0) {
        return { services: [], suspiciousServices: [] };
    }

    device.ports.forEach(portInfo => {
        const serviceInfo = {
            port: portInfo.port || portInfo.portid,
            protocol: portInfo.protocol || 'tcp',
            service: portInfo.service || 'unknown',
            version: portInfo.version || '',
            state: portInfo.state || 'open',
            isSuspicious: false,
            reason: ''
        };

        // Check if it's a suspicious port
        if (ATTACK_PATTERNS.suspiciousPorts.includes(serviceInfo.port)) {
            serviceInfo.isSuspicious = true;
            serviceInfo.reason = 'Commonly exploited port';
            suspiciousServices.push(serviceInfo);
        }

        // Check for vulnerable service versions
        for (const vulnService of ATTACK_PATTERNS.commonAttackServices) {
            if (serviceInfo.version.toLowerCase().includes(vulnService.toLowerCase())) {
                serviceInfo.isSuspicious = true;
                serviceInfo.reason = 'Known vulnerable version';
                if (!suspiciousServices.includes(serviceInfo)) {
                    suspiciousServices.push(serviceInfo);
                }
                break;
            }
        }

        services.push(serviceInfo);
    });

    return { services, suspiciousServices };
}

/**
 * Detect potential attack types based on scan results
 * @param {string} ip - Device IP
 * @param {object} device - Device information
 * @param {object} servicesInfo - Services information
 * @returns {Array} Detected attacks
 */
function detectAttackTypes(ip, device, servicesInfo) {
    const detectedAttacks = [];

    // 1. Port Scan Attack Detection (rapid scanning)
    const scanFrequency = getScanFrequency(ip);
    if (scanFrequency.count > ATTACK_PATTERNS.portScan.threshold) {
        detectedAttacks.push({
            type: 'Port Scan Attack',
            severity: 'high',
            description: `Device scanned ${scanFrequency.count} times in ${scanFrequency.timeWindow}ms`,
            timestamp: new Date().toISOString()
        });
    }

    // 2. Suspicious Port Activity
    const openPorts = device.ports || [];
    const openSuspiciousPorts = openPorts.filter(p => 
        ATTACK_PATTERNS.suspiciousPorts.includes(p.port || p.portid)
    );
    
    if (openSuspiciousPorts.length > 0) {
        detectedAttacks.push({
            type: 'Suspicious Ports Open',
            severity: 'medium',
            description: `Found ${openSuspiciousPorts.length} commonly exploited ports open`,
            ports: openSuspiciousPorts.map(p => p.port || p.portid),
            timestamp: new Date().toISOString()
        });
    }

    // 3. Vulnerable Service Detection
    if (servicesInfo.suspiciousServices.length > 0) {
        detectedAttacks.push({
            type: 'Vulnerable Services',
            severity: 'high',
            description: 'Detected services with known vulnerabilities',
            services: servicesInfo.suspiciousServices,
            timestamp: new Date().toISOString()
        });
    }

    // 4. Unusual Port Count (potential honeypot or compromised device)
    if (openPorts.length > 50) {
        detectedAttacks.push({
            type: 'Unusual Port Activity',
            severity: 'medium',
            description: `Abnormally high number of open ports (${openPorts.length})`,
            timestamp: new Date().toISOString()
        });
    }

    return detectedAttacks;
}

/**
 * Generate and store alert
 * @param {string} ip - Device IP
 * @param {Array} attacks - Detected attacks
 * @param {object} servicesInfo - Services information
 */
function generateAlert(ip, attacks, servicesInfo) {
    const alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ip,
        timestamp: new Date().toISOString(),
        attacks,
        suspiciousServices: servicesInfo.suspiciousServices,
        severity: calculateSeverity(attacks),
        acknowledged: false
    };

    alerts.push(alert);
    console.log(`🚨 Alert generated for ${ip}: ${alert.severity} severity`);
    
    // Emit alert via Socket.io
    emitAlert(alert);
    
    return alert;
}

/**
 * Calculate overall severity from attacks
 * @param {Array} attacks - Array of attack objects
 * @returns {string} Severity level
 */
function calculateSeverity(attacks) {
    const highSeverity = attacks.filter(a => a.severity === 'high').length;
    const mediumSeverity = attacks.filter(a => a.severity === 'medium').length;

    if (highSeverity > 0) return 'high';
    if (mediumSeverity > 1) return 'high';
    if (mediumSeverity > 0) return 'medium';
    return 'low';
}

/**
 * Whitelist Management
 */
export function addToWhitelist(ip) {
    whitelist.add(ip);
    blacklist.delete(ip);
    console.log(`Added ${ip} to whitelist`);
}

export function removeFromWhitelist(ip) {
    whitelist.delete(ip);
}

export function isWhitelisted(ip) {
    return whitelist.has(ip);
}

export function getWhitelist() {
    return Array.from(whitelist);
}

/**
 * Blacklist Management
 */
export function addToBlacklist(ip) {
    blacklist.add(ip);
    whitelist.delete(ip);
    console.log(`Added ${ip} to blacklist`);
}

export function removeFromBlacklist(ip) {
    blacklist.delete(ip);
}

export function isBlacklisted(ip) {
    return blacklist.has(ip);
}

export function getBlacklist() {
    return Array.from(blacklist);
}

/**
 * Alert Management
 */
export function getAlerts(filter = 'all') {
    if (filter === 'unacknowledged') {
        return alerts.filter(a => !a.acknowledged);
    }
    if (filter === 'high') {
        return alerts.filter(a => a.severity === 'high');
    }
    return alerts;
}

export function getDeviceAlerts(ip) {
    return alerts.filter(a => a.ip === ip);
}

export function acknowledgeAlert(alertId) {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date().toISOString();
    }
}

export function clearAlerts() {
    alerts.length = 0;
}

/**
 * Scan History Management (for attack detection)
 */
function updateScanHistory(ip) {
    const now = Date.now();
    
    if (!scanHistory.has(ip)) {
        scanHistory.set(ip, []);
    }
    
    const history = scanHistory.get(ip);
    history.push(now);
    
    // Keep only scans within the time window
    const filtered = history.filter(timestamp => 
        now - timestamp < ATTACK_PATTERNS.portScan.timeWindow
    );
    
    scanHistory.set(ip, filtered);
}

function getScanFrequency(ip) {
    const history = scanHistory.get(ip) || [];
    return {
        count: history.length,
        timeWindow: ATTACK_PATTERNS.portScan.timeWindow
    };
}

/**
 * Get monitoring statistics (integrates with Person 1's stats)
 * @returns {object} Monitoring statistics
 */
export function getMonitoringStats() {
    const allDevices = getAllDevices();
    const allAlerts = getAlerts('all');
    
    return {
        totalAlerts: allAlerts.length,
        highSeverityAlerts: allAlerts.filter(a => a.severity === 'high').length,
        unacknowledgedAlerts: allAlerts.filter(a => !a.acknowledged).length,
        whitelistedDevices: whitelist.size,
        blacklistedDevices: blacklist.size,
        devicesScanned: scanHistory.size,
        devicesWithSuspiciousServices: allDevices.filter(d => 
            d.suspiciousServices && d.suspiciousServices.length > 0
        ).length
    };
}

/**
 * Utility function for delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Analyze all discovered devices for threats
 * @returns {Promise<object>} Analysis results
 */
export async function analyzeAllDevices() {
    const devices = getAllDevices();
    console.log(`Person 2: Analyzing ${devices.length} devices for threats...`);
    
    const threatsFound = [];
    
    for (const device of devices) {
        if (device.ports && device.ports.length > 0) {
            const servicesInfo = identifyServices(device);
            const attacks = detectAttackTypes(device.ip, device, servicesInfo);
            
            if (attacks.length > 0 || servicesInfo.suspiciousServices.length > 0) {
                threatsFound.push({
                    ip: device.ip,
                    hostname: device.hostname,
                    attacks,
                    suspiciousServices: servicesInfo.suspiciousServices
                });
            }
        }
    }
    
    return {
        timestamp: new Date().toISOString(),
        devicesAnalyzed: devices.length,
        threatsFound: threatsFound.length,
        threats: threatsFound
    };
}