document.addEventListener('DOMContentLoaded', function() {
  console.log('Options page loaded');
  
  // Check if all elements exist
  const elements = [
    'saveSettings', 'resetSettings', 'testConnection', 
    'sabnzbdUrl', 'apiKey', 'nzbApiKey', 'autoDetect', 'showNotifications',
    'autoDetectToggle', 'notificationsToggle'
  ];
  
  elements.forEach(id => {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Element with id '${id}' not found!`);
    } else {
      console.log(`Element '${id}' found`);
    }
  });
  
  // Load saved settings
  loadSettings();
  
  // Event listeners
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  document.getElementById('testConnection').addEventListener('click', testConnection);
  
  // Toggle functionality
  setupToggles();
});

function setupToggles() {
  const toggles = [
    { id: 'showNotifications', toggleId: 'notificationsToggle' }
  ];
  
  toggles.forEach(toggle => {
    const checkbox = document.getElementById(toggle.id);
    const toggleElement = document.getElementById(toggle.toggleId);
    
    if (checkbox && toggleElement) {
      toggleElement.addEventListener('click', function() {
        checkbox.checked = !checkbox.checked;
        toggleElement.classList.toggle('active', checkbox.checked);
      });
    }
  });
}

function loadSettings() {
  console.log('Loading settings...');
  chrome.storage.sync.get(['sabnzbdUrl', 'apiKey', 'nzbApiKey', 'showNotifications'], function(result) {
    console.log('Settings loaded:', result);
    
    const urlInput = document.getElementById('sabnzbdUrl');
    const apiInput = document.getElementById('apiKey');
    const nzbApiInput = document.getElementById('nzbApiKey');
    const notificationsCheckbox = document.getElementById('showNotifications');
    
    if (urlInput) urlInput.value = result.sabnzbdUrl || '';
    if (apiInput) apiInput.value = result.apiKey || '';
    if (nzbApiInput) nzbApiInput.value = result.nzbApiKey || result.apiKey || ''; // Default to control API key if not set
    if (notificationsCheckbox) notificationsCheckbox.checked = result.showNotifications !== false;
    
    // Update toggle visual states
    const notificationsToggle = document.getElementById('notificationsToggle');
    
    if (notificationsToggle) notificationsToggle.classList.toggle('active', result.showNotifications !== false);
  });
}

function saveSettings() {
  const sabnzbdUrl = document.getElementById('sabnzbdUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const nzbApiKey = document.getElementById('nzbApiKey').value.trim();
  const showNotifications = document.getElementById('showNotifications').checked;
  
  if (!sabnzbdUrl || !apiKey) {
    showStatus('Please fill in both SABnzbd URL and Control API Key', 'error');
    return;
  }
  
  // If NZB API key is empty, use the control API key
  const finalNzbApiKey = nzbApiKey || apiKey;
  
  chrome.storage.sync.set({
    sabnzbdUrl: sabnzbdUrl,
    apiKey: apiKey,
    nzbApiKey: finalNzbApiKey,
    showNotifications: showNotifications
  }, function() {
    showStatus('Settings saved successfully!', 'success');
  });
}

function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    chrome.storage.sync.clear(function() {
      loadSettings();
      showStatus('Settings reset to defaults', 'success');
    });
  }
}

function testConnection() {
  chrome.storage.sync.get(['sabnzbdUrl', 'apiKey'], function(result) {
    if (!result.sabnzbdUrl || !result.apiKey) {
      showStatus('Please save your settings first', 'error');
      return;
    }
    
    // Clean up the URL - remove trailing slash if present
    let baseUrl = result.sabnzbdUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    const testUrl = `${baseUrl}/api?mode=version&apikey=${result.apiKey}&output=json`;
    
    console.log('Testing connection to:', testUrl);
    
    fetch(testUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text(); // Get response as text first
      })
      .then(text => {
        try {
          const data = JSON.parse(text);
          if (data.version) {
            showStatus(`Connection successful! SABnzbd version: ${data.version}`, 'success');
          } else {
            showStatus('Connection failed: Invalid response format', 'error');
          }
        } catch (parseError) {
          // If it's not JSON, it might be HTML (login page, error page, etc.)
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            showStatus('Connection failed: Received HTML instead of JSON. Check URL and API key.', 'error');
          } else {
            showStatus(`Connection failed: Invalid JSON response: ${parseError.message}`, 'error');
          }
        }
      })
      .catch(error => {
        showStatus(`Connection failed: ${error.message}`, 'error');
      });
  });
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}
