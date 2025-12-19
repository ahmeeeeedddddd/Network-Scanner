import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execPromise = promisify(exec);

/**
 * Execute arp-scan on local network
 * @param {string} netInterface - Network interface (e.g., 'eth0', 'wlan0')
 * @param {object} options - Scan options
 * @returns {Promise<string>} Raw arp-scan output
 */
export async function scanLocalNetwork(netInterface = 'eth0', options = {}) {
    const {
        timeout = 60000, // 1 minute default
        retries = 3
    } = options;

    const platform = os.platform();
    let command;

    if (platform === 'win32') {
        // Windows: Use --localnet to auto-detect interface
        command = `arp-scan --localnet --numeric --retry=${retries}`;
        console.log(`Executing (Windows): ${command}`);
    } else {
        // Linux/Mac: Use specific interface
        command = `sudo arp-scan --interface=${netInterface} --localnet --numeric --retry=${retries}`;
        console.log(`Executing (Linux/Mac): ${command}`);
    }

    try {
        const { stdout, stderr } = await execPromise(command, {
            timeout,
            maxBuffer: 1024 * 1024 * 5 // 5MB buffer
        });

        if (stderr && !stderr.includes('WARNING')) {
            console.warn('ARP-scan stderr:', stderr);
        }

        return stdout;
    } catch (error) {
        if (error.killed) {
            throw new Error(`ARP scan timed out after ${timeout}ms`);
        }
        throw new Error(`ARP scan failed: ${error.message}`);
    }
}

/**
 * Scan specific network range
 * @param {string} network - Network range (e.g., "192.168.1.0/24")
 * @param {string} netInterface - Network interface
 * @returns {Promise<string>} Raw arp-scan output
 */
export async function scanRange(network, netInterface = 'eth0') {
    if (!isValidNetwork(network)) {
        throw new Error('Invalid network format');
    }

    const platform = os.platform();
    let command;

    if (platform === 'win32') {
        // Windows: Use --localnet for better compatibility
        // Note: On Windows, specifying a range with --localnet might scan the entire local network
        command = `arp-scan --localnet --numeric`;
        console.log(`Executing (Windows): ${command}`);
        console.log(`Note: Scanning local network, specific range ${network} may be ignored on Windows`);
    } else {
        // Linux/Mac: Use specific interface and network range
        command = `sudo arp-scan --interface=${netInterface} ${network} --numeric`;
        console.log(`Executing (Linux/Mac): ${command}`);
    }

    try {
        const { stdout, stderr } = await execPromise(command, {
            timeout: 60000,
            maxBuffer: 1024 * 1024 * 5
        });

        if (stderr && !stderr.includes('WARNING')) {
            console.warn('ARP-scan stderr:', stderr);
        }

        return stdout;
    } catch (error) {
        throw new Error(`ARP range scan failed: ${error.message}`);
    }
}

/**
 * Get available network interfaces
 * @returns {Promise<Array>} List of network interfaces
 */
export async function getInterfaces() {
    const platform = os.platform();
    
    try {
        if (platform === 'win32') {
            // Windows: Use ipconfig
            const { stdout } = await execPromise('ipconfig');
            
            const interfaces = [];
            const lines = stdout.split('\n');
            
            for (const line of lines) {
                // Look for adapter names
                if (line.includes('adapter')) {
                    const match = line.match(/adapter (.+):/);
                    if (match) {
                        const name = match[1].trim();
                        // Exclude some common virtual adapters
                        if (!name.includes('Loopback') && 
                            !name.includes('Local Area Connection*') &&
                            !name.includes('Bluetooth')) {
                            interfaces.push(name);
                        }
                    }
                }
            }
            
            return interfaces;
        } else {
            // Linux/Mac: Use ip link show or ifconfig
            let stdout;
            try {
                ({ stdout } = await execPromise('ip link show'));
            } catch {
                // Fallback to ifconfig if ip command not available
                ({ stdout } = await execPromise('ifconfig -a'));
            }
            
            // Parse interface names from output
            const interfaceRegex = /^\d+:\s+([^:]+):/gm;
            const interfaces = [];
            let match;

            while ((match = interfaceRegex.exec(stdout)) !== null) {
                const name = match[1].trim();
                // Exclude loopback
                if (name !== 'lo') {
                    interfaces.push(name);
                }
            }

            return interfaces;
        }
    } catch (error) {
        console.error(`Failed to get interfaces: ${error.message}`);
        // Return default interface based on platform
        if (platform === 'win32') {
            return ['Wi-Fi', 'Ethernet'];
        }
        return ['eth0', 'wlan0'];
    }
}

/**
 * Validate network format
 * @param {string} network - Network to validate
 * @returns {boolean}
 */
function isValidNetwork(network) {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    return cidrRegex.test(network);
}

// Export default object for backward compatibility
export default {
    scanLocalNetwork,
    scanRange,
    getInterfaces
};