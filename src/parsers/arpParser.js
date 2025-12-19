/**
 * Parse arp-scan output into structured JSON
 * @param {string} output - Raw arp-scan output
 * @returns {Array} Array of discovered devices
 */
export function parseArpOutput(output) {
    const devices = [];
    
    // Split output into lines
    const lines = output.split('\n');
    
    // ARP-scan output format:
    // IP_ADDRESS    MAC_ADDRESS    VENDOR
    // Example: 192.168.1.1    00:11:22:33:44:55    Cisco Systems
    
    const deviceRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F:]{17})\s+(.*)$/;
    
    lines.forEach(line => {
        const match = line.match(deviceRegex);
        
        if (match) {
            const device = {
                ip: match[1],
                mac: match[2].toUpperCase(),
                vendor: match[3].trim() || 'Unknown',
                hostname: null,
                status: 'up',
                discoveryMethod: 'arp-scan',
                lastSeen: new Date().toISOString()
            };
            
            devices.push(device);
        }
    });
    
    return devices;
}

/**
 * Get scan statistics from arp-scan output
 * @param {string} output - Raw arp-scan output
 * @returns {object} Statistics object
 */
export function getArpStats(output) {
    const stats = {
        hostsScanned: 0,
        hostsResponded: 0,
        scanDuration: null
    };
    
    // Extract statistics from footer
    // Example: "256 packets received by filter, 0 packets dropped by kernel"
    // Example: "Ending arp-scan 1.9.7: 256 hosts scanned in 1.234 seconds (207.14 hosts/sec)"
    
    const hostsMatch = output.match(/(\d+)\s+hosts?\s+scanned/i);
    if (hostsMatch) {
        stats.hostsScanned = parseInt(hostsMatch[1]);
    }
    
    const durationMatch = output.match(/in\s+([\d.]+)\s+seconds/i);
    if (durationMatch) {
        stats.scanDuration = parseFloat(durationMatch[1]);
    }
    
    // Count responded hosts by counting device lines
    const deviceLines = output.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s+[0-9a-fA-F:]{17}/gm);
    stats.hostsResponded = deviceLines ? deviceLines.length : 0;
    
    return stats;
}