import { emitScanProgress, emitNewDevice } from '../socket/socketHandlers.js';
import { quickHostDiscovery, fastPortScan } from '../scanners/nmap.js';
import { scanLocalNetwork } from '../scanners/arpScan.js';
import { parseNmapOutput } from '../parsers/nmapParser.js';
import { parseArpOutput } from '../parsers/arpParser.js';
import os from 'os';
import { execSync } from 'child_process';

/**
 * In-memory device storage
 * In production, this would be a database
 */
let discoveredDevices = new Map();

/**
 * Discover devices on the network using multiple methods
 * @param {string} network - Network range (e.g., "192.168.1.0/24")
 * @param {string} interface - Network interface for ARP scan
 * @returns {Promise<Array>} Array of discovered devices
 */
export async function discoverDevices(network, iface = 'eth0') {
    console.log(`Starting device discovery for network: ${network}`);
    
    // Handle 'auto' interface selection
    if (iface === 'auto' || !iface) {
        const platform = os.platform();
        
        if (platform === 'win32') {
            // Windows: Set to null so arp.js uses --localnet without interface
            iface = null;
            console.log('Windows detected: Using auto-detect mode');
        } else {
            // Linux/Mac: Try to detect default interface
            try {
                const output = execSync('ip route | grep default', { encoding: 'utf-8' });
                const match = output.match(/dev (\S+)/);
                if (match) {
                    iface = match[1];
                    console.log(`Auto-detected interface: ${iface}`);
                } else {
                    iface = 'eth0';
                    console.log('Could not auto-detect, using eth0');
                }
            } catch (error) {
                iface = 'eth0';
                console.log('Could not auto-detect interface, using eth0');
            }
        }
    }
    
    const results = {
        devices: [],
        errors: []
    };

    // Emit progress: Starting
    try {
        emitScanProgress({ percentage: 10, message: 'Initializing scan...' });
    } catch (err) {
        console.log('Socket.io not ready yet, continuing without real-time updates');
    }

    try {
        // Run ARP scan (faster, works on local network)
        console.log('Running ARP scan...');
        emitScanProgress({ percentage: 30, message: 'Running ARP scan...' });
        
        const arpOutput = await scanLocalNetwork(iface);
        const arpDevices = parseArpOutput(arpOutput);
        console.log(`ARP scan found ${arpDevices.length} devices`);
        
        // Merge ARP results
        arpDevices.forEach(device => {
            mergeDevice(device);
            // Emit each new device
            try {
                emitNewDevice(device);
            } catch (err) {
                // Silent fail if Socket.io not ready
            }
        });
    } catch (error) {
        console.error('ARP scan failed:', error.message);
        results.errors.push({ method: 'arp-scan', error: error.message });
    }

    try {
        // Run Nmap scan (more detailed, works remotely)
        console.log('Running Nmap scan...');
        emitScanProgress({ percentage: 60, message: 'Running Nmap scan...' });
        
        const nmapOutput = await quickHostDiscovery(network);
        const nmapDevices = parseNmapOutput(nmapOutput);
        console.log(`Nmap scan found ${nmapDevices.length} devices`);
        
        // Merge Nmap results
        nmapDevices.forEach(device => {
            mergeDevice(device);
            try {
                emitNewDevice(device);
            } catch (err) {
                // Silent fail
            }
        });
    } catch (error) {
        console.error('Nmap scan failed:', error.message);
        results.errors.push({ method: 'nmap', error: error.message });
    }

    // Convert Map to Array
    results.devices = Array.from(discoveredDevices.values());
    
    emitScanProgress({ percentage: 100, message: `Scan complete: ${results.devices.length} devices found` });
    
    console.log(`Total unique devices discovered: ${results.devices.length}`);
    
    return results;
}

/**
 * Scan ports for a specific device
 * @param {string} ip - Target IP address
 * @returns {Promise<object>} Device with port information
 */
export async function scanDevicePorts(ip) {
    console.log(`Scanning ports for ${ip}...`);
    
    try {
        const nmapOutput = await fastPortScan(ip);
        const deviceInfo = parseNmapOutput(nmapOutput)[0];
        
        if (deviceInfo) {
            // Update stored device with port info
            mergeDevice(deviceInfo);
            return getDevice(ip);
        }
        
        return null;
    } catch (error) {
        throw new Error(`Port scan failed for ${ip}: ${error.message}`);
    }
}

/**
 * Merge device information (handles duplicates)
 * @param {object} newDevice - New device data
 */
function mergeDevice(newDevice) {
    const existingDevice = discoveredDevices.get(newDevice.ip);
    
    if (existingDevice) {
        // Merge data, preferring non-null values
        discoveredDevices.set(newDevice.ip, {
            ...existingDevice,
            ...newDevice,
            mac: newDevice.mac || existingDevice.mac,
            vendor: newDevice.vendor || existingDevice.vendor,
            hostname: newDevice.hostname || existingDevice.hostname,
            ports: newDevice.ports.length > 0 ? newDevice.ports : existingDevice.ports,
            lastSeen: newDevice.lastSeen
        });
    } else {
        // Add new device
        discoveredDevices.set(newDevice.ip, newDevice);
    }
}

/**
 * Get all discovered devices
 * @returns {Array} All devices
 */
export function getAllDevices() {
    return Array.from(discoveredDevices.values());
}

/**
 * Get specific device by IP
 * @param {string} ip - Device IP address
 * @returns {object|null} Device or null if not found
 */
export function getDevice(ip) {
    return discoveredDevices.get(ip) || null;
}

/**
 * Clear all discovered devices
 */
export function clearDevices() {
    discoveredDevices.clear();
    console.log('All devices cleared');
}

/**
 * Get network statistics
 * @returns {object} Network stats
 */
export function getNetworkStats() {
    const devices = getAllDevices();
    
    return {
        totalDevices: devices.length,
        activeDevices: devices.filter(d => d.status === 'up').length,
        devicesWithPorts: devices.filter(d => d.ports && d.ports.length > 0).length,
        vendors: [...new Set(devices.map(d => d.vendor).filter(Boolean))],
        lastScanTime: devices.length > 0 ? devices[0].lastSeen : null
    };
}