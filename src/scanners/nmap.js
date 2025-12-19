import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Execute nmap scan on target network
 * @param {string} target - Target IP or network range (e.g., "192.168.1.0/24")
 * @param {object} options - Scan options
 * @returns {Promise<string>} Raw nmap output
 */
export async function scanNetwork(target, options = {}) {
    // Validate target to prevent command injection
    if (!isValidTarget(target)) {
        throw new Error('Invalid target format');
    }

    // Build nmap command
    const { 
        scanType = '-sn',  // Default: ping scan (no port scan)
        timeout = 300000,   // 5 minutes default timeout
        additionalFlags = ''
    } = options;

    // -sn: Ping scan (host discovery only)
    // -T4: Aggressive timing
    // -oX -: Output XML format to stdout
    const command = `sudo nmap ${scanType} -T4 ${additionalFlags} ${target} -oX -`;

    console.log(`Executing: ${command}`);

    try {
        const { stdout, stderr } = await execPromise(command, { 
            timeout,
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large scans
        });

        if (stderr && !stderr.includes('Warning')) {
            console.error('Nmap stderr:', stderr);
        }

        return stdout;
    } catch (error) {
        if (error.killed) {
            throw new Error(`Nmap scan timed out after ${timeout}ms`);
        }
        throw new Error(`Nmap scan failed: ${error.message}`);
    }
}

/**
 * Quick host discovery scan
 * @param {string} network - Network range (e.g., "192.168.1.0/24")
 * @returns {Promise<string>} Raw nmap output
 */
export async function quickHostDiscovery(network) {
    return scanNetwork(network, {
        scanType: '-sn',
        additionalFlags: '-PE -PP -PM' // ICMP echo, timestamp, netmask
    });
}

/**
 * Detailed port scan for a specific host
 * @param {string} host - Target host IP
 * @returns {Promise<string>} Raw nmap output with port info
 */
export async function portScan(host) {
    return scanNetwork(host, {
        scanType: '-sS -sV', // SYN scan + service version detection
        additionalFlags: '-p-', // Scan all 65535 ports
        timeout: 600000 // 10 minutes for port scan
    });
}

/**
 * Fast common ports scan
 * @param {string} host - Target host IP
 * @returns {Promise<string>} Raw nmap output
 */
export async function fastPortScan(host) {
    return scanNetwork(host, {
        scanType: '-sS',
        additionalFlags: '--top-ports 1000', // Scan top 1000 ports
        timeout: 180000 // 3 minutes
    });
}

/**
 * Validate target format to prevent command injection
 * @param {string} target - Target to validate
 * @returns {boolean}
 */
function isValidTarget(target) {
    // Allow: IP addresses, CIDR notation, IP ranges
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}-\d{1,3}$/;
    
    return ipRegex.test(target) || rangeRegex.test(target);
}