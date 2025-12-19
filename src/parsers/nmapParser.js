/**
 * Parse nmap XML output into structured JSON
 * @param {string} xmlOutput - Raw XML output from nmap
 * @returns {Array} Array of discovered devices
 */
export function parseNmapOutput(xmlOutput) {
    const devices = [];
    
    // Extract all host entries from XML
    const hostRegex = /<host[^>]*>[\s\S]*?<\/host>/g;
    const hosts = xmlOutput.match(hostRegex) || [];

    hosts.forEach(hostXml => {
        const device = {
            ip: null,
            mac: null,
            vendor: null,
            hostname: null,
            status: 'unknown',
            ports: [],
            lastSeen: new Date().toISOString()
        };

        // Extract status
        const statusMatch = hostXml.match(/<status state="([^"]+)"/);
        if (statusMatch) {
            device.status = statusMatch[1]; // up, down, etc.
        }

        // Extract IP address
        const ipMatch = hostXml.match(/<address addr="([^"]+)" addrtype="ipv4"/);
        if (ipMatch) {
            device.ip = ipMatch[1];
        }

        // Extract MAC address and vendor
        const macMatch = hostXml.match(/<address addr="([^"]+)" addrtype="mac"(?:[^>]*vendor="([^"]+)")?/);
        if (macMatch) {
            device.mac = macMatch[1];
            device.vendor = macMatch[2] || 'Unknown';
        }

        // Extract hostname
        const hostnameMatch = hostXml.match(/<hostname name="([^"]+)"/);
        if (hostnameMatch) {
            device.hostname = hostnameMatch[1];
        }

        // Extract open ports (if any)
        const portRegex = /<port protocol="([^"]+)" portid="(\d+)">[\s\S]*?<state state="([^"]+)"[\s\S]*?(?:<service name="([^"]+)")?/g;
        let portMatch;
        
        while ((portMatch = portRegex.exec(hostXml)) !== null) {
            device.ports.push({
                protocol: portMatch[1],
                port: parseInt(portMatch[2]),
                state: portMatch[3],
                service: portMatch[4] || 'unknown'
            });
        }

        // Only add devices that are up and have an IP
        if (device.ip && device.status === 'up') {
            devices.push(device);
        }
    });

    return devices;
}

/**
 * Parse port scan results
 * @param {string} xmlOutput - Raw XML output from nmap port scan
 * @returns {object} Device with detailed port information
 */
export function parsePortScan(xmlOutput) {
    const devices = parseNmapOutput(xmlOutput);
    
    if (devices.length === 0) {
        return null;
    }

    // Return the first device (should only be one for targeted scan)
    const device = devices[0];
    
    // Add additional analysis
    device.openPortsCount = device.ports.filter(p => p.state === 'open').length;
    device.riskLevel = assessRiskLevel(device.ports);
    
    return device;
}

/**
 * Assess risk level based on open ports
 * @param {Array} ports - Array of port objects
 * @returns {string} Risk level: low, medium, high
 */
function assessRiskLevel(ports) {
    const openPorts = ports.filter(p => p.state === 'open');
    
    // High-risk ports
    const highRiskPorts = [21, 23, 25, 135, 139, 445, 3389, 5900];
    const hasHighRisk = openPorts.some(p => highRiskPorts.includes(p.port));
    
    if (hasHighRisk) return 'high';
    if (openPorts.length > 10) return 'medium';
    return 'low';
}