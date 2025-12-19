// src/utils/logger.js
// Enhanced logging utilities

export const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

export function logScanStart(network) {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.cyan}🔍 NETWORK SCAN STARTED${colors.reset}`);
    console.log(`${colors.bright}Network:${colors.reset} ${network}`);
    console.log(`${colors.bright}Time:${colors.reset} ${new Date().toLocaleString()}`);
    console.log('='.repeat(60) + '\n');
}

export function logDeviceFound(device, index, total) {
    console.log(`${colors.green}✓${colors.reset} [${index}/${total}] Device Found:`);
    console.log(`  IP: ${colors.cyan}${device.ip}${colors.reset}`);
    console.log(`  MAC: ${device.mac || 'Unknown'}`);
    console.log(`  Hostname: ${device.hostname || 'Unknown'}`);
    console.log(`  Status: ${device.status === 'up' ? colors.green + 'ONLINE' : colors.red + 'OFFLINE'}${colors.reset}`);
}

export function logPortScanStart(ip) {
    console.log(`\n${colors.yellow}🔍 Scanning ports: ${ip}${colors.reset}`);
}

export function logPortsFound(ip, ports) {
    if (ports.length > 0) {
        console.log(`${colors.green}✓${colors.reset} ${ip} - ${colors.bright}${ports.length} open ports${colors.reset}`);
        console.log(`  Ports: ${colors.cyan}${ports.slice(0, 10).map(p => p.port || p).join(', ')}${colors.reset}${ports.length > 10 ? ` +${ports.length - 10} more` : ''}`);
    } else {
        console.log(`${colors.yellow}⚠${colors.reset} ${ip} - No open ports found`);
    }
}

export function logScanComplete(deviceCount, duration) {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.green}✅ SCAN COMPLETE${colors.reset}`);
    console.log(`${colors.bright}Devices found:${colors.reset} ${deviceCount}`);
    console.log(`${colors.bright}Duration:${colors.reset} ${duration}ms`);
    console.log('='.repeat(60) + '\n');
}

export function logError(message, error) {
    console.error(`${colors.red}❌ ERROR:${colors.reset} ${message}`);
    if (error) {
        console.error(`  ${colors.red}${error.message}${colors.reset}`);
    }
}