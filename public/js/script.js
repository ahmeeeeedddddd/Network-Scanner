// public/js/script.js - Updated for Real Backend Integration
// =================================================================
// REAL-TIME DATA - NO MORE MOCK DATA
// =================================================================

// Initialize Socket.io connection
const socket = io();

// Global state - will be populated by real backend data
let devices = [];
let alerts = [];
let whitelist = [];
let networkStats = {};
let charts = {};

// =================================================================
// SOCKET.IO EVENT LISTENERS - Real-time updates from backend
// =================================================================

socket.on('connect', () => {
    console.log('✅ Connected to server via Socket.io');
    updateConnectionStatus(true);
    
    // Request initial data when connected
    fetchInitialData();
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    updateConnectionStatus(false);
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus(false);
});

// Listen for devices updates (Person 1's data)
socket.on('devices-updated', (data) => {
    console.log('📡 Received devices update:', data.length, 'devices');
    
    // Update global devices array
    if (Array.isArray(data)) {
        devices = data;
    } else if (data.devices) {
        devices = data.devices;
    }
    
    // Re-render UI with real data
    renderDevices();
    renderPorts();
    updateDeviceCount(devices.length);
    updateCharts();
});

// Listen for new device discoveries
socket.on('new-device', (data) => {
    console.log('🆕 New device discovered:', data.ip);
    
    const device = data.device || data;
    
    // Add to devices array if not already present
    if (!devices.find(d => d.ip === device.ip)) {
        devices.push(device);
        renderDevices();
        updateDeviceCount(devices.length);
    }
    
    showNotification(`New device found: ${device.ip}`, 'success');
});

// Listen for scan progress
socket.on('scan-progress', (data) => {
    console.log('⏳ Scan progress:', data.percentage + '%', data.message);
    updateScanProgress(data.percentage, data.message);
});

// Listen for scan completion
socket.on('scan-complete', (data) => {
    console.log('✅ Scan complete:', data);
    
    if (data.success) {
        showNotification(`Scan complete: ${data.deviceCount} devices found`, 'success');
    } else {
        showNotification(`Scan failed: ${data.error}`, 'error');
    }
    
    updateScanProgress(100, 'Complete');
    setTimeout(() => {
        updateScanProgress(0, '');
    }, 2000);
});

// Listen for network statistics updates
socket.on('stats-updated', (data) => {
    console.log('📊 Stats updated:', data);
    
    networkStats = data.stats || data;
    updateNetworkStats(networkStats);
});

// Listen for security alerts (Person 2's data)
socket.on('security-alert', (alert) => {
    console.log('🚨 Security alert received:', alert);
    
    // Add alert to alerts array
    alerts.unshift(alert); // Add to beginning
    
    // Limit to 50 alerts
    if (alerts.length > 50) {
        alerts = alerts.slice(0, 50);
    }
    
    renderAlerts();
    showNotification(`Security Alert: ${alert.attacks?.[0]?.type || 'Threat detected'} on ${alert.ip}`, 'error');
});

// Listen for threat detection
socket.on('threat-detected', (threat) => {
    console.log('⚠️ Threat detected:', threat);
    showNotification(`Threat: ${threat.type} on ${threat.ip}`, 'warning');
});

// Listen for errors
socket.on('scan-error', (data) => {
    console.error('❌ Scan error:', data.error);
    showNotification(`Error: ${data.error}`, 'error');
});

socket.on('error', (data) => {
    console.error('❌ Error:', data);
    showNotification(`Error: ${data.message || data.error}`, 'error');
});

// =================================================================
// API FUNCTIONS - Fetch data from backend
// =================================================================

async function fetchInitialData() {
    try {
        // Fetch devices
        const devicesResponse = await fetch('/api/devices');
        const devicesData = await devicesResponse.json();
        
        if (devicesData.success && devicesData.data) {
            devices = devicesData.data.devices || [];
            renderDevices();
            updateDeviceCount(devices.length);
        }
        
        // Fetch stats
        const statsResponse = await fetch('/api/stats');
        const statsData = await statsResponse.json();
        
        if (statsData.success && statsData.data) {
            networkStats = statsData.data;
            updateNetworkStats(networkStats);
        }
        
        // Fetch alerts (if Person 2's endpoint is available)
        try {
            const alertsResponse = await fetch('/api/monitoring/alerts');
            const alertsData = await alertsResponse.json();
            
            if (alertsData.success && alertsData.data) {
                alerts = alertsData.data.alerts || [];
                renderAlerts();
            }
        } catch (error) {
            console.log('Alerts endpoint not available yet');
        }
        
        // Fetch whitelist (if available)
        try {
            const whitelistResponse = await fetch('/api/monitoring/whitelist');
            const whitelistData = await whitelistResponse.json();
            
            if (whitelistData.success && whitelistData.data) {
                whitelist = whitelistData.data.whitelist || [];
            }
        } catch (error) {
            console.log('Whitelist endpoint not available yet');
        }
        
        console.log('✅ Initial data loaded');
        updateCharts();
        
    } catch (error) {
        console.error('Error fetching initial data:', error);
        showNotification('Failed to load initial data', 'error');
    }
}

async function triggerNetworkScan() {
    try {
        // Auto-detect or suggest network
        const suggestedNetwork = '192.168.1.0/24'; // Based on your ipconfig
        
        const network = prompt(
            'Enter network to scan:\n\n' +
            'Examples:\n' +
            '  192.168.1.0/24 (scans 192.168.1.1-254)\n' +
            '  192.168.1.0/25 (scans 192.168.1.1-126)\n' +
            '  10.0.0.0/24\n\n' +
            'Suggested for your network:',
            suggestedNetwork
        );
        
        if (!network) return;
        
        showNotification('Starting network scan... This may take 1-2 minutes', 'info');
        
        const response = await fetch('/api/scan/network', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                network,
                interface: 'auto' // Let backend auto-detect
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Scan initiated for ${network}`, 'success');
        } else {
            showNotification(`Scan failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error triggering scan:', error);
        showNotification('Failed to start scan', 'error');
    }
}

async function scanDevicePorts(ip) {
    try {
        showNotification(`Scanning ports for ${ip}...`, 'info');
        
        const response = await fetch('/api/scan/ports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Port scan complete for ${ip}`, 'success');
            
            // Update the device in our array
            const index = devices.findIndex(d => d.ip === ip);
            if (index !== -1) {
                devices[index] = data.data;
                renderDevices();
            }
        } else {
            showNotification(`Port scan failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error scanning ports:', error);
        showNotification('Port scan failed', 'error');
    }
}

// =================================================================
// UI HELPER FUNCTIONS
// =================================================================

function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.className = isConnected ? 'connected' : 'disconnected';
        statusElement.textContent = isConnected ? '🟢 Connected' : '🔴 Disconnected';
    }
}

function updateDeviceCount(count) {
    const countElement = document.querySelector('.stat-card:first-child .stat-value');
    if (countElement) {
        countElement.textContent = count;
    }
}

function updateScanProgress(percentage, message) {
    const progressBar = document.getElementById('scan-progress-bar');
    const progressText = document.getElementById('scan-progress-text');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
        progressBar.setAttribute('aria-valuenow', percentage);
    }
    
    if (progressText) {
        progressText.textContent = message;
    }
    
    // Show/hide progress container
    const progressContainer = document.getElementById('scan-progress-container');
    if (progressContainer) {
        progressContainer.style.display = percentage > 0 && percentage < 100 ? 'block' : 'none';
    }
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create toast notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : type === 'warning' ? '#fbbf24' : '#14b8a6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function updateNetworkStats(stats) {
    // Update stat cards
    const statCards = document.querySelectorAll('.stat-card .stat-value');
    
    if (statCards[0]) statCards[0].textContent = stats.totalDevices || devices.length;
    if (statCards[1]) statCards[1].textContent = stats.onlineDevices || devices.filter(d => d.status === 'up').length;
    if (statCards[2]) statCards[2].textContent = stats.offlineDevices || devices.filter(d => d.status === 'down').length;
    if (statCards[3]) statCards[3].textContent = stats.threatsDetected || alerts.length;
}

// =================================================================
// RENDERING FUNCTIONS
// =================================================================

function formatTimestamp(date) {
    if (!date) return 'Unknown';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = Math.floor((now - dateObj) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return dateObj.toLocaleDateString();
}

function getThreatLevel(device) {
    // Determine threat level based on alerts and suspicious services
    if (device.detectedAttacks && device.detectedAttacks.length > 0) {
        const hasHighSeverity = device.detectedAttacks.some(a => a.severity === 'high');
        return hasHighSeverity ? 'high' : 'medium';
    }
    
    if (device.suspiciousServices && device.suspiciousServices.length > 0) {
        return 'medium';
    }
    
    if (device.isBlacklisted) {
        return 'high';
    }
    
    return 'safe';
}

function renderDevices() {
    const container = document.getElementById('devicesList');
    
    if (!container) return;
    
    if (devices.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <p>No devices discovered yet</p>
                <button onclick="triggerNetworkScan()" class="btn" style="margin-top: 1rem;">
                    Start Network Scan
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = devices.map(device => {
        const status = device.status === 'up' ? 'online' : 'offline';
        const threatLevel = getThreatLevel(device);
        const ports = device.ports || [];
        const portsList = Array.isArray(ports) 
            ? ports.slice(0, 5).map(p => typeof p === 'object' ? p.port || p.portid : p).filter(Boolean)
            : [];
        
        return `
            <div class="device-card" onclick="openDeviceModal('${device.ip}')">
                <div class="device-header">
                    <div class="device-info">
                        <div class="status-dot status-${status}"></div>
                        <div>
                            <div style="font-weight: bold; color: #475569;">
                                ${device.hostname || device.ip}
                            </div>
                            <div style="font-size: 0.875rem; color: #14b8a6;">${device.ip}</div>
                        </div>
                    </div>
                    <div class="threat-badge threat-${threatLevel}">${threatLevel.toUpperCase()}</div>
                </div>
                <div class="device-footer">
                    <div>
                        <span style="color: #475569; font-weight: 600;">Ports:</span>
                        <span style="color: #14b8a6; font-weight: 600;">
                            ${portsList.length > 0 ? portsList.join(', ') : 'None'}
                            ${ports.length > 5 ? ` +${ports.length - 5} more` : ''}
                        </span>
                    </div>
                    <span style="color: #6b7280;">${formatTimestamp(device.lastSeen || device.timestamp)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderAlerts() {
    const container = document.getElementById('alertsList');
    const countElement = document.getElementById('alertCount');
    
    if (!container) return;
    
    if (countElement) {
        countElement.textContent = alerts.length;
    }
    
    if (alerts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; color: #6b7280;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
                <p>No alerts</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = alerts.slice(0, 3).map(alert => {
        const severity = alert.severity || 'low';
        const message = alert.attacks?.[0]?.description || alert.message || 'Security concern detected';
        
        return `
            <div class="alert-card alert-${severity}">
                <div style="font-weight: bold; color: #1e293b; margin-bottom: 0.5rem;">
                    ${alert.ip || 'Unknown Device'}
                </div>
                <div style="font-size: 0.875rem; color: #475569; margin-bottom: 0.5rem;">
                    ${message}
                </div>
                <div style="font-size: 0.75rem; color: #6b7280;">
                    ${formatTimestamp(alert.timestamp)}
                </div>
            </div>
        `;
    }).join('');
}

function renderPorts() {
    const commonPorts = [21, 22, 23, 80, 443, 3306, 3389, 8080];
    const container = document.getElementById('portGrid');
    
    if (!container) return;
    
    container.innerHTML = commonPorts.map(port => {
        const isOpen = devices.some(d => {
            const ports = d.ports || [];
            return ports.some(p => {
                const portNum = typeof p === 'object' ? (p.port || p.portid) : p;
                return portNum == port;
            }) && d.status === 'up';
        });
        
        return `
            <div class="port-card ${isOpen ? 'port-open' : 'port-closed'}">
                <div class="port-number">${port}</div>
                <div class="port-status">${isOpen ? 'OPEN' : 'CLOSED'}</div>
            </div>
        `;
    }).join('');
}

// =================================================================
// MODAL FUNCTIONS
// =================================================================

function openDeviceModal(ip) {
    const device = devices.find(d => d.ip === ip);
    if (!device) return;
    
    const body = document.getElementById('deviceModalBody');
    const ports = device.ports || [];
    const portsList = Array.isArray(ports) 
        ? ports.map(p => typeof p === 'object' ? p.port || p.portid : p).filter(Boolean)
        : [];
    
    const threatLevel = getThreatLevel(device);
    const status = device.status === 'up' ? 'online' : 'offline';
    
    body.innerHTML = `
        <div class="detail-card">
            <div class="detail-label">Hostname</div>
            <div class="detail-value">${device.hostname || 'Unknown'}</div>
        </div>
        <div class="detail-card" style="border-color: #5eead4;">
            <div class="detail-label">IP Address</div>
            <div class="detail-value" style="color: #14b8a6;">${device.ip}</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">MAC Address</div>
            <div class="detail-value">${device.mac || 'Unknown'}</div>
        </div>
        <div class="detail-card" style="border-color: #5eead4;">
            <div class="detail-label">Status</div>
            <div class="detail-value" style="color: ${status === 'online' ? '#22c55e' : '#9ca3af'};">
                ${status.toUpperCase()}
            </div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Open Ports (${portsList.length})</div>
            <div class="port-tags">
                ${portsList.length > 0 
                    ? portsList.map(port => `<span class="port-tag">${port}</span>`).join('')
                    : '<span style="color: #6b7280;">No open ports</span>'}
            </div>
        </div>
        <div class="detail-card" style="border-color: #5eead4;">
            <div class="detail-label">Threat Level</div>
            <div style="margin-top: 0.5rem;">
                <span class="threat-badge threat-${threatLevel}">${threatLevel.toUpperCase()}</span>
            </div>
        </div>
        ${device.detectedAttacks && device.detectedAttacks.length > 0 ? `
            <div class="detail-card">
                <div class="detail-label">Detected Threats</div>
                <div style="margin-top: 0.5rem;">
                    ${device.detectedAttacks.map(attack => `
                        <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: #fef2f2; border-radius: 0.25rem;">
                            <div style="font-weight: 600; color: #ef4444;">${attack.type}</div>
                            <div style="font-size: 0.875rem; color: #6b7280;">${attack.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        <div class="detail-card" style="border-color: #5eead4;">
            <div class="detail-label">Last Seen</div>
            <div style="font-size: 1.1rem; font-weight: 600; color: #475569; margin-top: 0.25rem;">
                ${formatTimestamp(device.lastSeen || device.timestamp)}
            </div>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <button onclick="scanDevicePorts('${device.ip}')" class="btn" style="flex: 1;">
                🔍 Rescan Ports
            </button>
            <button onclick="closeDeviceModal()" class="btn" style="flex: 1; background: #6b7280;">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('deviceModal').classList.add('active');
}

function closeDeviceModal() {
    document.getElementById('deviceModal').classList.remove('active');
}

function openAlertsModal() {
    const modal = document.getElementById('alertsModal');
    const body = document.getElementById('alertsModalBody');
    
    if (alerts.length === 0) {
        body.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3.75rem; margin-bottom: 1rem;">✅</div>
                <p style="font-size: 1.125rem; font-weight: 600; color: #475569;">No alerts at this time! 🎉</p>
                <p style="color: #6b7280; margin-top: 0.5rem;">All systems are running smoothly</p>
            </div>
        `;
    } else {
        body.innerHTML = `
            <div style="margin-bottom: 1rem;">
                ${alerts.map((alert, index) => {
                    const severity = alert.severity || 'low';
                    const attackType = alert.attacks?.[0]?.type || 'Security Alert';
                    const description = alert.attacks?.[0]?.description || alert.message || 'Threat detected';
                    
                    return `
                        <div class="alert-card alert-${severity}" style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <span style="font-size: 1.75rem;">⚠️</span>
                                    <div>
                                        <div style="font-weight: bold; font-size: 1.125rem; color: #1e293b;">
                                            ${alert.ip || 'Unknown Device'}
                                        </div>
                                        <span class="threat-badge threat-${severity}" style="font-size: 0.75rem; display: inline-block; margin-top: 0.25rem;">
                                            ${severity.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <button onclick="dismissAlert(${index})" style="background: none; border: none; color: #6b7280; cursor: pointer; font-weight: bold; font-size: 1.125rem;">✕</button>
                            </div>
                            <div style="color: #1e293b; margin-bottom: 0.5rem; margin-left: 2.5rem; font-weight: 600;">
                                ${attackType}
                            </div>
                            <div style="color: #475569; margin-bottom: 0.75rem; margin-left: 2.5rem;">
                                ${description}
                            </div>
                            <div style="font-size: 0.75rem; color: #6b7280; margin-left: 2.5rem;">
                                ⏰ ${formatTimestamp(alert.timestamp)}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <button class="btn-full" onclick="clearAllAlerts()">Clear All Alerts</button>
        `;
    }
    modal.classList.add('active');
}

function closeAlertsModal() {
    document.getElementById('alertsModal').classList.remove('active');
}

function dismissAlert(index) {
    alerts.splice(index, 1);
    renderAlerts();
    openAlertsModal();
}

function clearAllAlerts() {
    alerts = [];
    renderAlerts();
    openAlertsModal();
}

function openWhitelistModal() {
    renderWhitelist();
    document.getElementById('whitelistModal').classList.add('active');
}

function closeWhitelistModal() {
    document.getElementById('whitelistModal').classList.remove('active');
}

function renderWhitelist() {
    const container = document.getElementById('whitelistEntries');
    
    if (whitelist.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <p>No whitelisted devices</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = whitelist.map(entry => `
        <div class="whitelist-entry">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.5rem;">🔓</span>
                <div>
                    <div style="font-weight: bold; color: #475569;">${entry.hostname || entry.ip}</div>
                    <div style="font-size: 0.875rem; color: #14b8a6;">${entry.ip}</div>
                    ${entry.addedBy ? `
                        <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">
                            Added by ${entry.addedBy} ${entry.date ? `on ${entry.date}` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
            <button class="btn-remove" onclick="removeFromWhitelist('${entry.ip}')">Remove</button>
        </div>
    `).join('');
}

async function addToWhitelist() {
    const ip = document.getElementById('whitelistIP').value;
    const hostname = document.getElementById('whitelistHostname').value;
    
    if (!ip) {
        showNotification('Please enter an IP address', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/monitoring/whitelist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip, hostname })
        });
        
        const data = await response.json();
        
        if (data.success) {
            whitelist.push({ ip, hostname });
            document.getElementById('whitelistIP').value = '';
            document.getElementById('whitelistHostname').value = '';
            renderWhitelist();
            showNotification('Device added to whitelist', 'success');
        } else {
            showNotification('Failed to add to whitelist', 'error');
        }
    } catch (error) {
        console.error('Error adding to whitelist:', error);
        showNotification('Failed to add to whitelist', 'error');
    }
}

async function removeFromWhitelist(ip) {
    try {
        const response = await fetch(`/api/monitoring/whitelist/${ip}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            whitelist = whitelist.filter(entry => entry.ip !== ip);
            renderWhitelist();
            showNotification('Device removed from whitelist', 'success');
        } else {
            showNotification('Failed to remove from whitelist', 'error');
        }
    } catch (error) {
        console.error('Error removing from whitelist:', error);
        showNotification('Failed to remove from whitelist', 'error');
    }
}

function closeModalOnOutside(event, modalId) {
    if (event.target.id === modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
}

// =================================================================
// CHARTS - Dynamic data from backend
// =================================================================

function updateCharts() {
    updateActivityChart();
    updatePortChart();
    updateStatusChart();
    updateThreatChart();
}

function updateActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (charts.activity) {
        charts.activity.destroy();
    }
    
    // Generate labels (last 7 time points)
    const labels = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const time = new Date(now - i * 10 * 60 * 1000);
        labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }
    
    // Count active devices and threats over time (simulated for now)
    const activeDevices = devices.filter(d => d.status === 'up').length;
    const activeData = new Array(7).fill(0).map((_, i) => 
        Math.max(0, activeDevices - Math.floor(Math.random() * 2))
    );
    
    const threatData = new Array(7).fill(0).map(() => 
        alerts.length > 0 ? Math.floor(Math.random() * alerts.length) : 0
    );
    
    charts.activity = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Active Devices',
                data: activeData,
                borderColor: '#14b8a6',
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
                fill: true,
                tension: 0.4
            }, {
                label: 'Detected Threats',
                data: threatData,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true } }
        }
    });
}

function updatePortChart() {
    const ctx = document.getElementById('portChart');
    if (!ctx) return;
    
    if (charts.port) {
        charts.port.destroy();
    }
    
    const commonPorts = [22, 80, 443, 3306, 8080, 8443, 9100];
    const portCounts = commonPorts.map(port => {
        return devices.filter(d => {
            const ports = d.ports || [];
            return ports.some(p => {
                const portNum = typeof p === 'object' ? (p.port || p.portid) : p;
                return portNum == port;
            });
        }).length;
    });
    
    charts.port = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: commonPorts.map(p => String(p)),
            datasets: [{
                label: 'Devices Using Port',
                data: portCounts,
                backgroundColor: '#14b8a6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true } }
        }
    });
}

function updateStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    if (charts.status) {
        charts.status.destroy();
    }
    
    const onlineCount = devices.filter(d => d.status === 'up').length;
    const offlineCount = devices.filter(d => d.status === 'down').length;
    
    charts.status = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Online', 'Offline'],
            datasets: [{
                data: [onlineCount, offlineCount],
                backgroundColor: ['#14b8a6', '#0ea5e9']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'bottom' }
            }
        }
    });
}

function updateThreatChart() {
    const ctx = document.getElementById('threatChart');
    if (!ctx) return;
    
    if (charts.threat) {
        charts.threat.destroy();
    }
    
    const safeCount = devices.filter(d => getThreatLevel(d) === 'safe').length;
    const mediumCount = devices.filter(d => getThreatLevel(d) === 'medium').length;
    const highCount = devices.filter(d => getThreatLevel(d) === 'high').length;
    
    charts.threat = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Safe', 'Medium Risk', 'High Risk'],
            datasets: [{
                data: [safeCount, mediumCount, highCount],
                backgroundColor: ['#14b8a6', '#fbbf24', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'bottom' }
            }
        }
    });
}

// =================================================================
// INITIALIZATION
// =================================================================

window.onload = function() {
    console.log('🚀 Network Security Monitor - Initializing...');
    
    // Charts will be initialized after data loads
    setTimeout(() => {
        updateCharts();
    }, 1000);
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
};