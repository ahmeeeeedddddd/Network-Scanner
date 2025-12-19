// ADD THIS TO THE TOP OF YOUR EXISTING public/js/script.js
// Initialize Socket.io connection
const socket = io();

// Connection status handlers
socket.on('connect', () => {
    console.log('Connected to server via Socket.io');
    updateConnectionStatus(true);
    
    // Request initial data when connected
    socket.emit('request-devices');
    socket.emit('request-stats');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus(false);
});

// Listen for devices updates
socket.on('devices-updated', (data) => {
    console.log('Received devices update:', data.count, 'devices');
    
    // Call your existing renderDevices function (from Person 4's code)
    if (typeof renderDevices === 'function') {
        renderDevices(data.devices);
    }
    
    // Update device count in UI
    updateDeviceCount(data.count);
});

// Listen for new device discoveries
socket.on('new-device', (data) => {
    console.log('New device discovered:', data.device.ip);
    
    // Add visual notification
    showNotification(`New device found: ${data.device.ip}`, 'info');
    
    // If you have a function to add a single device to the UI
    if (typeof addDeviceToUI === 'function') {
        addDeviceToUI(data.device);
    }
});

// Listen for scan progress
socket.on('scan-progress', (data) => {
    console.log('Scan progress:', data.percentage + '%', data.message);
    
    // Update progress bar if it exists
    updateScanProgress(data.percentage, data.message);
});

// Listen for scan completion
socket.on('scan-complete', (data) => {
    console.log('Scan complete:', data);
    
    if (data.success) {
        showNotification(`Scan complete: ${data.deviceCount} devices found`, 'success');
    } else {
        showNotification(`Scan failed: ${data.error}`, 'error');
    }
    
    // Reset progress bar
    updateScanProgress(100, 'Complete');
    setTimeout(() => {
        updateScanProgress(0, '');
    }, 2000);
});

// Listen for network statistics updates
socket.on('stats-updated', (data) => {
    console.log('Stats updated:', data.stats);
    
    // Call your existing function to render stats (from Person 4's code)
    if (typeof updateNetworkStats === 'function') {
        updateNetworkStats(data.stats);
    }
});

// Listen for device status changes
socket.on('device-status-changed', (data) => {
    console.log('Device status changed:', data.device);
    
    // Update specific device in the UI
    if (typeof updateDeviceStatus === 'function') {
        updateDeviceStatus(data.device);
    }
});

// Listen for errors
socket.on('scan-error', (data) => {
    console.error('Scan error:', data.error);
    showNotification(`Error: ${data.error}`, 'error');
});

// Helper function to update connection status indicator
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.className = isConnected ? 'connected' : 'disconnected';
        statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
    }
}

// Helper function to update device count
function updateDeviceCount(count) {
    const countElement = document.getElementById('device-count');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Helper function to update scan progress
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
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // If Person 4 has a notification function, use it
    // Otherwise, use simple console log or implement basic notification
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Optional: Create a simple toast notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// REPLACE YOUR MOCK DATA CALLS WITH REAL SOCKET.IO DATA
// For example, if you have fetchDevices() that uses mock data:
/*
// OLD CODE (remove this):
async function fetchDevices() {
    const mockDevices = [...];
    renderDevices(mockDevices);
}

// NEW CODE: Data comes automatically via Socket.io
// Just make sure renderDevices() is ready to receive real data
// The socket.on('devices-updated') handler above will call it
*/


// Data
let devices = [
    { id: 1, ip: '192.168.1.100', hostname: 'WorkstationA', status: 'online', ports: [22, 80, 443], threat: 'none', lastSeen: new Date() },
    { id: 2, ip: '192.168.1.101', hostname: 'ServerB', status: 'online', ports: [22, 3306, 8080], threat: 'low', lastSeen: new Date() },
    { id: 3, ip: '192.168.1.102', hostname: 'PrinterC', status: 'offline', ports: [9100], threat: 'none', lastSeen: new Date(Date.now() - 300000) },
    { id: 4, ip: '192.168.1.103', hostname: 'RouterD', status: 'online', ports: [80, 443, 8443], threat: 'high', lastSeen: new Date() }
];

let alerts = [
    { id: 1, device: 'RouterD', message: 'Unusual port scanning activity detected', severity: 'high', time: new Date() },
    { id: 2, device: 'ServerB', message: 'Multiple failed login attempts', severity: 'medium', time: new Date(Date.now() - 120000) },
    { id: 3, device: 'WorkstationA', message: 'New service detected on port 8888', severity: 'low', time: new Date(Date.now() - 300000) }
];

let whitelist = [
    { id: 1, ip: '192.168.1.100', hostname: 'WorkstationA', addedBy: 'admin', date: '2024-12-01' },
    { id: 2, ip: '192.168.1.50', hostname: 'LaptopE', addedBy: 'admin', date: '2024-12-02' }
];

// Format timestamp
function formatTimestamp(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}

// Render devices
function renderDevices() {
    const container = document.getElementById('devicesList');
    container.innerHTML = devices.map(device => `
        <div class="device-card" onclick="openDeviceModal(${device.id})">
            <div class="device-header">
                <div class="device-info">
                    <div class="status-dot status-${device.status}"></div>
                    <div>
                        <div style="font-weight: bold; color: #475569;">${device.hostname}</div>
                        <div style="font-size: 0.875rem; color: #14b8a6;">${device.ip}</div>
                    </div>
                </div>
                <div class="threat-badge threat-${device.threat}">${device.threat.toUpperCase()}</div>
            </div>
            <div class="device-footer">
                <div>
                    <span style="color: #475569; font-weight: 600;">Ports:</span>
                    <span style="color: #14b8a6; font-weight: 600;">${device.ports.join(', ')}</span>
                </div>
                <span style="color: #6b7280;">${formatTimestamp(device.lastSeen)}</span>
            </div>
        </div>
    `).join('');
}

// Render alerts
function renderAlerts() {
    const container = document.getElementById('alertsList');
    container.innerHTML = alerts.slice(0, 3).map(alert => `
        <div class="alert-card alert-${alert.severity}">
            <div style="font-weight: bold; color: #1e293b; margin-bottom: 0.5rem;">${alert.device}</div>
            <div style="font-size: 0.875rem; color: #475569; margin-bottom: 0.5rem;">${alert.message}</div>
            <div style="font-size: 0.75rem; color: #6b7280;">${formatTimestamp(alert.time)}</div>
        </div>
    `).join('');
    document.getElementById('alertCount').textContent = alerts.length;
}

// Render ports
function renderPorts() {
    const ports = [22, 80, 443, 3306, 8080, 8443, 9100, 8888];
    const container = document.getElementById('portGrid');
    container.innerHTML = ports.map(port => {
        const isOpen = devices.some(d => d.ports.includes(port) && d.status === 'online');
        return `
            <div class="port-card ${isOpen ? 'port-open' : 'port-closed'}">
                <div class="port-number">${port}</div>
                <div class="port-status">${isOpen ? 'OPEN' : 'CLOSED'}</div>
            </div>
        `;
    }).join('');
}

// Modal functions
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
                ${alerts.map((alert, index) => `
                    <div class="alert-card alert-${alert.severity}" style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <span style="font-size: 1.75rem;">⚠️</span>
                                <div>
                                    <div style="font-weight: bold; font-size: 1.125rem; color: #1e293b;">${alert.device}</div>
                                    <span class="threat-badge threat-${alert.severity}" style="font-size: 0.75rem; display: inline-block; margin-top: 0.25rem;">
                                        ${alert.severity.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <button onclick="dismissAlert(${index})" style="background: none; border: none; color: #6b7280; cursor: pointer; font-weight: bold; font-size: 1.125rem;">✕</button>
                        </div>
                        <div style="color: #1e293b; margin-bottom: 0.75rem; margin-left: 2.5rem;">${alert.message}</div>
                        <div style="font-size: 0.75rem; color: #6b7280; margin-left: 2.5rem;">⏰ ${formatTimestamp(alert.time)}</div>
                    </div>
                `).join('')}
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
    container.innerHTML = whitelist.map(entry => `
        <div class="whitelist-entry">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.5rem;">🔓</span>
                <div>
                    <div style="font-weight: bold; color: #475569;">${entry.hostname}</div>
                    <div style="font-size: 0.875rem; color: #14b8a6;">${entry.ip}</div>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">
                        Added by ${entry.addedBy} on ${entry.date}
                    </div>
                </div>
            </div>
            <button class="btn-remove" onclick="removeFromWhitelist(${entry.id})">Remove</button>
        </div>
    `).join('');
}

function addToWhitelist() {
    const ip = document.getElementById('whitelistIP').value;
    const hostname = document.getElementById('whitelistHostname').value;
    if (ip && hostname) {
        whitelist.push({
            id: whitelist.length + 1,
            ip, hostname,
            addedBy: 'admin',
            date: new Date().toISOString().split('T')[0]
        });
        document.getElementById('whitelistIP').value = '';
        document.getElementById('whitelistHostname').value = '';
        renderWhitelist();
    }
}

function removeFromWhitelist(id) {
    whitelist = whitelist.filter(entry => entry.id !== id);
    renderWhitelist();
}

function openDeviceModal(id) {
    const device = devices.find(d => d.id === id);
    const body = document.getElementById('deviceModalBody');
    body.innerHTML = `
        <div class="detail-card">
            <div class="detail-label">Hostname</div>
            <div class="detail-value">${device.hostname}</div>
        </div>
        <div class="detail-card" style="border-color: #5eead4;">
            <div class="detail-label">IP Address</div>
            <div class="detail-value" style="color: #14b8a6;">${device.ip}</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Status</div>
            <div class="detail-value" style="color: ${device.status === 'online' ? '#22c55e' : '#9ca3af'};">
                ${device.status.toUpperCase()}
            </div>
        </div>
        <div class="detail-card" style="border-color: #5eead4;">
            <div class="detail-label">Open Ports</div>
            <div class="port-tags">
                ${device.ports.map(port => `<span class="port-tag">${port}</span>`).join('')}
            </div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Threat Level</div>
            <div style="margin-top: 0.5rem;">
                <span class="threat-badge threat-${device.threat}">${device.threat.toUpperCase()}</span>
            </div>
        </div>
        <div class="detail-card" style="border-color: #5eead4;">
            <div class="detail-label">Last Seen</div>
            <div style="font-size: 1.1rem; font-weight: 600; color: #475569; margin-top: 0.25rem;">
                ${device.lastSeen.toLocaleString()}
            </div>
        </div>
    `;
    document.getElementById('deviceModal').classList.add('active');
}

function closeDeviceModal() {
    document.getElementById('deviceModal').classList.remove('active');
}

function closeModalOnOutside(event, modalId) {
    if (event.target.id === modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
}

// Update real-time data
setInterval(() => {
    devices = devices.map(device => ({
        ...device,
        lastSeen: device.status === 'online' ? new Date() : device.lastSeen
    }));
    renderDevices();
}, 5000);

// Initialize Charts
function initCharts() {
    // Activity Chart
    new Chart(document.getElementById('activityChart'), {
        type: 'line',
        data: {
            labels: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00'],
            datasets: [{
                label: 'Active Devices',
                data: [2, 3, 4, 3, 4, 4, 4],
                borderColor: '#14b8a6',
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
                fill: true,
                tension: 0.4
            }, {
                label: 'Detected Threats',
                data: [0, 1, 1, 2, 2, 1, 2],
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });

    // Port Chart
    new Chart(document.getElementById('portChart'), {
        type: 'bar',
        data: {
            labels: ['22', '80', '443', '3306', '8080', '8443', '9100'],
            datasets: [{
                label: 'Devices Using Port',
                data: [2, 2, 2, 1, 1, 1, 1],
                backgroundColor: '#14b8a6'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });

    // Status Pie Chart
    new Chart(document.getElementById('statusChart'), {
        type: 'pie',
        data: {
            labels: ['Online', 'Offline'],
            datasets: [{
                data: [3, 1],
                backgroundColor: ['#14b8a6', '#0ea5e9']
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });

    // Threat Pie Chart
    new Chart(document.getElementById('threatChart'), {
        type: 'pie',
        data: {
            labels: ['Safe', 'Low Risk', 'High Risk'],
            datasets: [{
                data: [2, 1, 1],
                backgroundColor: ['#14b8a6', '#fbbf24', '#ef4444']
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

// Initialize on load
window.onload = function() {
    renderDevices();
    renderAlerts();
    renderPorts();
    initCharts();
};