import { exec } from 'child_process';
import { promisify } from 'util';

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

    // arp-scan command
    // --interface: Specify network interface
    // --localnet: Scan local network
    // --numeric: Display IP addresses numerically
    const command = `sudo arp-scan --interface=${netInterface} --localnet --numeric --retry=${retries}`;

    console.log(`Executing: ${command}`);

    try {
        const { stdout, stderr } = await execPromise(command, {
            timeout,
            maxBuffer: 1024 * 1024 * 5 // 5MB buffer
        });

        if (stderr) {
            console.error('ARP-scan stderr:', stderr);
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
 * @param {string} interface - Network interface
 * @returns {Promise<string>} Raw arp-scan output
 */
export async function scanRange(network, netInterface = 'eth0') {
    if (!isValidNetwork(network)) {
        throw new Error('Invalid network format');
    }

    const command = `sudo arp-scan --interface=${netInterface} ${network} --numeric`;

    console.log(`Executing: ${command}`);

    try {
        const { stdout, stderr } = await execPromise(command, {
            timeout: 60000,
            maxBuffer: 1024 * 1024 * 5
        });

        if (stderr) {
            console.error('ARP-scan stderr:', stderr);
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
    try {
        const { stdout } = await execPromise('ip link show');
        
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
    } catch (error) {
        throw new Error(`Failed to get interfaces: ${error.message}`);
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