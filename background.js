// Create context menu on installation
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "sendToSabnzbd",
    title: "Send to SABnzbd",
    contexts: ["link", "page"]
  });
  
  // Start periodic badge updates
  startBadgeUpdates();
});

// Start periodic badge updates
function startBadgeUpdates() {
  // Update badge immediately
  updateBadgeFromSABnzbd();
  
  // Create alarm for periodic updates (every 30 seconds)
  chrome.alarms.create('badgeUpdate', { periodInMinutes: 0.5 });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "sendToSabnzbd") {
    let url = info.linkUrl || info.pageUrl;
    
    if (url && isNzbUrl(url)) {
      sendToSabnzbd(url);
    }
  }
});

// Handle alarm for periodic badge updates
chrome.alarms.onAlarm.addListener(function(alarm) {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === 'badgeUpdate' || alarm.name === 'badgeUpdateAfterSend') {
    console.log('Updating badge from alarm:', alarm.name);
    updateBadgeFromSABnzbd();
  }
});



function sendToSabnzbd(nzbUrl) {
  console.log('sendToSabnzbd called with URL:', nzbUrl);
  chrome.storage.sync.get(['sabnzbdUrl', 'nzbApiKey', 'showNotifications'], function(result) {
    if (!result.sabnzbdUrl || !result.nzbApiKey) {
      console.error('SABnzbd settings not configured');
      return;
    }
    
    // Clean up the URL - remove trailing slash if present
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
        return response.text(); // Get response as text first
      })
      .then(text => {
        try {
          const data = JSON.parse(text);
          if (data.status === true) {
            console.log('NZB sent successfully, scheduling badge update');
            // Show notification if enabled
            if (result.showNotifications !== false) {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'SABnzbd NZB Downloader',
                message: 'NZB file sent to SABnzbd successfully!'
              });
            }
            // Update badge after successful send with a delay to allow SABnzbd to process
            chrome.alarms.create('badgeUpdateAfterSend', { delayInMinutes: 0.1 }); // 6 seconds
            console.log('Badge update alarm created for 6 seconds from now');
          } else {
            console.error('Failed to send NZB:', data.error);
          }
        } catch (parseError) {
          // If it's not JSON, it might be HTML (login page, error page, etc.)
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            console.error('Connection failed: Received HTML instead of JSON. Check URL and API key.');
          } else {
            console.error('Error parsing response:', parseError.message);
          }
        }
      })
      .catch(error => {
        console.error('Error sending NZB:', error);
      });
  });
}

function updateBadgeFromSABnzbd() {
  console.log('updateBadgeFromSABnzbd called');
  chrome.storage.sync.get(['sabnzbdUrl', 'apiKey'], function(result) {
    if (!result.sabnzbdUrl || !result.apiKey) {
      // Clear badge if no settings configured
      chrome.action.setBadgeText({ text: '' });
      console.log('No SABnzbd settings found, clearing badge');
      return;
    }
    
    let baseUrl = result.sabnzbdUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    const queueUrl = `${baseUrl}/api?mode=queue&apikey=${result.apiKey}&output=json`;
    
    fetch(queueUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(text => {
        try {
          const data = JSON.parse(text);
          const slots = data.queue?.slots || [];
          const queueSize = slots.length;
          
          if (queueSize > 0) {
            chrome.action.setBadgeText({ text: queueSize.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
            console.log(`Badge updated: ${queueSize} items in queue`);
          } else {
            chrome.action.setBadgeText({ text: '' });
            console.log('Badge cleared: queue is empty');
          }
        } catch (parseError) {
          // Show error badge if parsing fails
          chrome.action.setBadgeText({ text: '!' });
          chrome.action.setBadgeBackgroundColor({ color: '#f44336' });
          console.log('Badge error: JSON parsing failed');
        }
      })
      .catch(error => {
        // Show error badge if connection fails
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#f44336' });
        console.log('Badge error: Connection failed');
      });
  });
}

function isNzbUrl(url) {
  return url.toLowerCase().includes('.nzb') || 
         url.toLowerCase().includes('nzb') ||
         url.toLowerCase().includes('download');
}
