/**
 * Parse netdiscover output into structured JSON
 * @param {string} output - Raw netdiscover output
 * @returns {Array} Array of discovered devices
 */
export function parseNetdiscoverOutput(output) {
    const devices = [];
    
    // Netdiscover output format (with -P flag):
    // IP_ADDRESS    MAC_ADDRESS    COUNT    LENGTH    VENDOR
    // Example: 192.168.1.1    00:11:22:33:44:55    1    60    Cisco Systems
    
    const lines = output.split('\n');
    const deviceRegex = /^\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F:]{17})\s+(\d+)\s+(\d+)\s+(.*)$/;
    
    lines.forEach(line => {
        const match = line.match(deviceRegex);
        
        if (match) {
            const device = {
                ip: match[1],
                mac: match[2].toUpperCase(),
                packetCount: parseInt(match[3]),
                packetLength: parseInt(match[4]),
                vendor: match[5].trim() || 'Unknown',
                hostname: null,
                status: 'up',
                discoveryMethod: 'netdiscover',
                lastSeen: new Date().toISOString()
            };
            
            devices.push(device);
        }
    });
    
    return devices;
}