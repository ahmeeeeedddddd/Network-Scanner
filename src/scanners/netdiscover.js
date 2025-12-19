import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Run netdiscover passive scan
 * @param {object} options - Scan options
 * @returns {Promise<string>} Raw netdiscover output
 */
export async function passiveScan(options = {}) {
    const {
        interface: iface = 'eth0',
        duration = 30, // seconds
        packetCount = 100
    } = options;

    // -p: Passive mode (sniff packets without sending)
    // -i: Interface
    // -c: Packet count limit
    const command = `sudo timeout ${duration}s netdiscover -p -i ${iface} -c ${packetCount}`;

    console.log(`Executing: ${command}`);

    try {
        const { stdout, stderr } = await execPromise(command, {
            timeout: (duration + 5) * 1000,
            maxBuffer: 1024 * 1024 * 5
        });

        if (stderr && !stderr.includes('timeout')) {
            console.error('Netdiscover stderr:', stderr);
        }

        return stdout;
    } catch (error) {
        // Timeout command returns exit code 124, which is normal
        if (error.code === 124 || error.killed) {
            return error.stdout || '';
        }
        throw new Error(`Netdiscover scan failed: ${error.message}`);
    }
}

/**
 * Run netdiscover active scan on specific range
 * @param {string} range - Network range (e.g., "192.168.1.0/24")
 * @param {string} interface - Network interface
 * @returns {Promise<string>} Raw netdiscover output
 */
export async function activeScan(range, netInterface = 'eth0') {
    if (!isValidRange(range)) {
        throw new Error('Invalid network range format');
    }

    // -r: Range to scan
    // -i: Interface
    // -P: Print results in simple format
    const command = `sudo netdiscover -r ${range} -i ${netInterface} -P`;

    console.log(`Executing: ${command}`);

    try {
        const { stdout, stderr } = await execPromise(command, {
            timeout: 120000, // 2 minutes
            maxBuffer: 1024 * 1024 * 5
        });

        if (stderr) {
            console.error('Netdiscover stderr:', stderr);
        }

        return stdout;
    } catch (error) {
        throw new Error(`Netdiscover active scan failed: ${error.message}`);
    }
}

/**
 * Validate network range format
 * @param {string} range - Range to validate
 * @returns {boolean}
 */
function isValidRange(range) {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    return cidrRegex.test(range);
}