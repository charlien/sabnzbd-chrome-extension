let refreshInterval;

document.addEventListener('DOMContentLoaded', function() {
  // Start monitoring when popup opens
  loadSABnzbdStatus();
  
  // Event listeners
  document.getElementById('openSabnzbd').addEventListener('click', openSabnzbd);
  document.getElementById('refreshData').addEventListener('click', loadSABnzbdStatus);
  
  // Start auto-refresh every 5 seconds
  startAutoRefresh();
});

// Start auto-refresh timer
function startAutoRefresh() {
  refreshInterval = setInterval(() => {
    loadSABnzbdStatus();
  }, 5000); // Refresh every 5 seconds
}

// Stop auto-refresh when popup closes
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  } else {
    startAutoRefresh();
  }
});

function loadSABnzbdStatus() {
  // Show loading state if monitor is already visible
  const monitorContent = document.getElementById('monitorContent');
  if (monitorContent.style.display !== 'none') {
    showLoadingState();
  }
  
  chrome.storage.sync.get(['sabnzbdUrl', 'apiKey'], function(result) {
    if (!result.sabnzbdUrl || !result.apiKey) {
      showError('Please configure SABnzbd settings first');
      return;
    }
    
    // Clean up the URL
    let baseUrl = result.sabnzbdUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Fetch SABnzbd status
    fetchSABnzbdData(baseUrl, result.apiKey);
  });
}

function showLoadingState() {
  // Add a subtle loading indicator to the stats
  const statValues = document.querySelectorAll('.stat-value');
  statValues.forEach(stat => {
    if (stat.textContent !== 'N/A') {
      stat.style.opacity = '0.5';
    }
  });
}

function fetchSABnzbdData(baseUrl, apiKey) {
  // Get queue information (includes disk space)
  const queueUrl = `${baseUrl}/api?mode=queue&apikey=${apiKey}&output=json`;
  
  console.log('Fetching SABnzbd data from:', queueUrl);
  
  // Fetch queue data
  fetch(queueUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.text();
    })
    .then(queueText => {
      try {
        const queueData = JSON.parse(queueText);
        console.log('Queue data:', queueData);
        
        updateStatusIndicator('online');
        updateMonitorDisplay(queueData);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        if (queueText.includes('<!DOCTYPE') || queueText.includes('<html')) {
          throw new Error('Received HTML instead of JSON. Check URL and API key.');
        } else {
          throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
      }
    })
    .catch(error => {
      console.error('Error fetching SABnzbd data:', error);
      showError(error.message);
    });
}

function updateStatusIndicator(status) {
  const indicator = document.getElementById('statusIndicator');
  indicator.className = `status-indicator ${status}`;
}

function updateMonitorDisplay(queueData) {
  // Hide loading, show monitor content
  document.getElementById('loading').style.display = 'none';
  document.getElementById('monitorContent').style.display = 'block';
  
  // Update statistics
  updateStats(queueData);
  
  // Update queue
  updateQueue(queueData);
  
  // Reset loading state
  const statValues = document.querySelectorAll('.stat-value');
  statValues.forEach(stat => {
    stat.style.opacity = '1';
  });
  
  // Update timestamp
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  document.getElementById('lastUpdated').textContent = `Last updated: ${timeString}`;
}

function updateStats(queueData) {
  console.log('Updating stats with queue data:', queueData);
  
  const queue = queueData.queue || {};
  const slots = queue.slots || [];
  
  // Download speed from SABnzbd API (kbpersec field)
  let downloadSpeed = 0;
  if (queue.kbpersec) {
    downloadSpeed = parseFloat(queue.kbpersec);
  }
  
  // Only show speed if there are active downloads (not all paused)
  const hasActiveDownloads = slots.some(slot => slot.status === 'Downloading');
  if (hasActiveDownloads && downloadSpeed > 0) {
    // Convert from KB/s to MB/s
    const speedMBps = (downloadSpeed / 1024).toFixed(1);
    document.getElementById('downloadSpeed').textContent = speedMBps;
  } else {
    document.getElementById('downloadSpeed').textContent = '0';
  }
  
  // Queue size
  const queueSize = slots.length;
  document.getElementById('queueSize').textContent = queueSize;
  
  // Update extension icon badge
  updateExtensionBadge(queueSize);
  
  // Disk free (from queue API - according to SABnzbd API docs)
  let diskFree = 'N/A';
  let diskPath = '';
  
  console.log('Processing queue data for disk space:', queueData);
  
  // According to the API docs, disk space info is in the queue response as diskspace1, diskspace2, etc.
  if (queueData.queue) {
    console.log('Queue data keys:', Object.keys(queueData.queue));
    
    // Look for diskspace properties (diskspace1, diskspace2, etc.)
    const diskSpaceKeys = Object.keys(queueData.queue).filter(key => key.startsWith('diskspace') && !key.includes('total'));
    const diskTotalKeys = Object.keys(queueData.queue).filter(key => key.startsWith('diskspacetotal'));
    
    console.log('Disk space keys found:', diskSpaceKeys);
    console.log('Disk total keys found:', diskTotalKeys);
    
    if (diskSpaceKeys.length > 0) {
      // Use the first available disk space (diskspace1)
      const firstDiskKey = diskSpaceKeys[0];
      const firstTotalKey = diskTotalKeys[0];
      
      const freeGB = parseFloat(queueData.queue[firstDiskKey] || 0);
      const totalGB = parseFloat(queueData.queue[firstTotalKey] || 0);
      
      if (freeGB > 0) {
        diskFree = freeGB.toFixed(1);
        diskPath = `Disk ${firstDiskKey.replace('diskspace', '')}`;
        console.log(`Disk free space: ${freeGB} GB (${firstDiskKey})`);
        console.log(`Disk total space: ${totalGB} GB (${firstTotalKey})`);
      } else {
        console.log('No valid free space found in disk data');
      }
    } else {
      console.log('No disk space keys found in queue response');
    }
  } else {
    console.log('No queue data found in response');
  }
  
  document.getElementById('diskFree').textContent = diskFree;
  document.getElementById('diskPath').textContent = diskPath;
}

function updateQueue(data) {
  const queue = data.queue || {};
  const slots = queue.slots || [];
  const queueContainer = document.getElementById('activeQueue');
  
  // Remove existing event listener to prevent duplicates
  queueContainer.removeEventListener('click', handleControlButtonClick);
  
  if (slots.length === 0) {
    queueContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✨</div>
        <div>Queue is empty</div>
      </div>
    `;
    // Update badge to show empty queue
    updateExtensionBadge(0);
    return;
  }
  
  // Show up to 2 active downloads (more compact)
  const activeSlots = slots.slice(0, 2);
  queueContainer.innerHTML = activeSlots.map(slot => {
    const name = slot.filename || 'Unknown';
    const progress = slot.percentage || 0;
    const mbleft = parseFloat(slot.mbleft || 0).toFixed(1);
    const mb = parseFloat(slot.mb || 0).toFixed(1);
    const status = slot.status || 'Unknown';
    const nzoId = slot.nzo_id || '';
    
    // Truncate long names
    const displayName = name.length > 30 ? name.substring(0, 27) + '...' : name;
    
    // Determine which control buttons to show based on status
    const isPaused = status === 'Paused';
    const isDownloading = status === 'Downloading';
    
    return `
      <div class="queue-item" data-nzo-id="${nzoId}">
        <div class="queue-item-name" title="${name}">${displayName}</div>
        <div class="queue-item-progress">
          <div class="queue-item-progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="queue-item-details">
          <span>${progress}%</span>
          <span>${mbleft}MB / ${mb}MB</span>
          <div class="queue-item-controls">
            ${isDownloading ? `<button class="control-btn pause" data-action="pause" data-nzo-id="${nzoId}" title="Pause">⏸</button>` : ''}
            ${isPaused ? `<button class="control-btn resume" data-action="resume" data-nzo-id="${nzoId}" title="Resume">▶</button>` : ''}
            <button class="control-btn stop" data-action="stop" data-nzo-id="${nzoId}" title="Stop">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Add event delegation for control buttons
  queueContainer.addEventListener('click', handleControlButtonClick);
  
  if (slots.length > 2) {
    queueContainer.innerHTML += `
      <div class="queue-item" style="text-align: center; opacity: 0.7; font-size: 10px;">
        +${slots.length - 2} more in queue
      </div>
    `;
  }
}

function handleControlButtonClick(e) {
  if (e.target.classList.contains('control-btn')) {
    e.preventDefault();
    e.stopPropagation();
    
    const action = e.target.getAttribute('data-action');
    const nzoId = e.target.getAttribute('data-nzo-id');
    
    console.log(`Button clicked: ${action} for nzo_id: ${nzoId}`);
    
    switch(action) {
      case 'pause':
        pauseDownload(nzoId);
        break;
      case 'resume':
        resumeDownload(nzoId);
        break;
      case 'stop':
        stopDownload(nzoId);
        break;
      default:
        console.error('Unknown action:', action);
    }
  }
}

function openSabnzbd() {
  chrome.storage.sync.get(['sabnzbdUrl'], function(result) {
    if (result.sabnzbdUrl) {
      chrome.tabs.create({ url: result.sabnzbdUrl });
    } else {
      showNotification('SABnzbd URL not configured', 'error');
    }
  });
}

function pauseDownload(nzoId) {
  console.log('pauseDownload called with nzoId:', nzoId);
  if (!nzoId) {
    console.error('No nzoId provided for pause');
    showNotification('Error: No download ID found', 'error');
    return;
  }
  
  setButtonLoading(nzoId, 'pause');
  sendSABnzbdCommand('pause', nzoId, 'Download paused', () => {
    clearButtonLoading(nzoId, 'pause');
  });
}

function resumeDownload(nzoId) {
  console.log('resumeDownload called with nzoId:', nzoId);
  if (!nzoId) {
    console.error('No nzoId provided for resume');
    showNotification('Error: No download ID found', 'error');
    return;
  }
  
  setButtonLoading(nzoId, 'resume');
  sendSABnzbdCommand('resume', nzoId, 'Download resumed', () => {
    clearButtonLoading(nzoId, 'resume');
  });
}

function stopDownload(nzoId) {
  console.log('stopDownload called with nzoId:', nzoId);
  if (!nzoId) {
    console.error('No nzoId provided for stop');
    showNotification('Error: No download ID found', 'error');
    return;
  }
  
  if (confirm('Are you sure you want to stop this download?')) {
    setButtonLoading(nzoId, 'stop');
    sendSABnzbdCommand('delete', nzoId, 'Download stopped', () => {
      clearButtonLoading(nzoId, 'stop');
    });
  }
}

function setButtonLoading(nzoId, buttonType) {
  console.log(`setButtonLoading: ${buttonType} for ${nzoId}`);
  const queueItem = document.querySelector(`[data-nzo-id="${nzoId}"]`);
  if (queueItem) {
    const button = queueItem.querySelector(`.control-btn.${buttonType}`);
    if (button) {
      button.disabled = true;
      button.classList.add('loading');
      console.log(`Button ${buttonType} set to loading state`);
    } else {
      console.error(`Button ${buttonType} not found for nzoId ${nzoId}`);
    }
  } else {
    console.error(`Queue item not found for nzoId ${nzoId}`);
  }
}

function clearButtonLoading(nzoId, buttonType) {
  console.log(`clearButtonLoading: ${buttonType} for ${nzoId}`);
  const queueItem = document.querySelector(`[data-nzo-id="${nzoId}"]`);
  if (queueItem) {
    const button = queueItem.querySelector(`.control-btn.${buttonType}`);
    if (button) {
      button.disabled = false;
      button.classList.remove('loading');
      console.log(`Button ${buttonType} cleared from loading state`);
    } else {
      console.error(`Button ${buttonType} not found for nzoId ${nzoId}`);
    }
  } else {
    console.error(`Queue item not found for nzoId ${nzoId}`);
  }
}

function sendSABnzbdCommand(mode, nzoId, successMessage, callback) {
  chrome.storage.sync.get(['sabnzbdUrl', 'apiKey'], function(result) {
    if (!result.sabnzbdUrl || !result.apiKey) {
      showNotification('SABnzbd settings not configured', 'error');
      return;
    }
    
    let baseUrl = result.sabnzbdUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Use the correct API parameters for queue control
    let commandUrl;
    if (mode === 'pause') {
      commandUrl = `${baseUrl}/api?mode=queue&name=pause&value=${encodeURIComponent(nzoId)}&apikey=${result.apiKey}&output=json`;
    } else if (mode === 'resume') {
      commandUrl = `${baseUrl}/api?mode=queue&name=resume&value=${encodeURIComponent(nzoId)}&apikey=${result.apiKey}&output=json`;
    } else if (mode === 'delete') {
      commandUrl = `${baseUrl}/api?mode=queue&name=delete&value=${encodeURIComponent(nzoId)}&apikey=${result.apiKey}&output=json`;
    } else {
      showNotification(`Unknown command: ${mode}`, 'error');
      return;
    }
    
    console.log(`Sending ${mode} command for ${nzoId}:`, commandUrl);
    
    fetch(commandUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(text => {
        console.log(`Raw response for ${mode}:`, text);
        try {
          const data = JSON.parse(text);
          console.log(`Parsed response for ${mode}:`, data);
          
          if (data.status === true || data.result === true) {
            showNotification(successMessage, 'success');
            // Refresh the data after a short delay
            setTimeout(loadSABnzbdStatus, 1000);
          } else {
            const errorMsg = data.error || data.message || 'Unknown error';
            showNotification(`Failed to ${mode} download: ${errorMsg}`, 'error');
          }
          
          // Call callback to clear loading state
          if (callback) callback();
        } catch (parseError) {
          console.error(`Parse error for ${mode}:`, parseError, 'Raw text:', text);
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            showNotification('Connection failed: Received HTML instead of JSON. Check URL and API key.', 'error');
          } else {
            showNotification(`Error parsing response: ${parseError.message}`, 'error');
          }
          if (callback) callback();
        }
      })
      .catch(error => {
        console.error(`Fetch error for ${mode}:`, error);
        showNotification(`Error ${mode}ing download: ${error.message}`, 'error');
        if (callback) callback();
      });
  });
}

function sendToSabnzbd(nzbUrl) {
  chrome.storage.sync.get(['sabnzbdUrl', 'nzbApiKey'], function(result) {
    if (!result.sabnzbdUrl || !result.nzbApiKey) {
      showNotification('Please configure SABnzbd settings first', 'error');
      return;
    }
    
    let baseUrl = result.sabnzbdUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    const addUrl = `${baseUrl}/api?mode=addurl&name=${encodeURIComponent(nzbUrl)}&apikey=${result.nzbApiKey}&output=json`;
    
    fetch(addUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(text => {
        try {
          const data = JSON.parse(text);
          if (data.status === true) {
            showNotification('NZB file sent to SABnzbd successfully!', 'success');
            // Refresh the monitor display
            setTimeout(loadSABnzbdStatus, 1000);
          } else {
            showNotification(`Failed to send NZB: ${data.error || 'Unknown error'}`, 'error');
          }
        } catch (parseError) {
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            showNotification('Connection failed: Received HTML instead of JSON. Check URL and API key.', 'error');
          } else {
            showNotification(`Error parsing response: ${parseError.message}`, 'error');
          }
        }
      })
      .catch(error => {
        showNotification(`Error sending NZB: ${error.message}`, 'error');
      });
  });
}

function isNzbUrl(url) {
  return url.toLowerCase().includes('.nzb') || 
         url.toLowerCase().includes('nzb') ||
         url.toLowerCase().includes('download');
}

function showError(message) {
  updateStatusIndicator('offline');
  document.getElementById('loading').style.display = 'none';
  document.getElementById('errorMessage').style.display = 'block';
  document.getElementById('monitorContent').style.display = 'none';
  
  // Show error badge when there's an error
  updateExtensionBadge(0, true);
}

function updateExtensionBadge(queueSize, isError = false) {
  if (isError) {
    // Show error state with red badge
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#f44336' }); // Red for error
  } else if (queueSize > 0) {
    // Show the number of items in the queue
    chrome.action.setBadgeText({ text: queueSize.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green for active downloads
  } else {
    // Clear the badge when queue is empty
    chrome.action.setBadgeText({ text: '' });
  }
}

function showNotification(message, type) {
  // Create a temporary notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style); 