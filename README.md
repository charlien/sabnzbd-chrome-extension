# SABnzbd NZB Downloader Chrome Extension

A Chrome extension that allows you to send NZB file URLs directly to your local SABnzbd server from any website.

## Features

- 📊 Real-time SABnzbd monitoring dashboard
- 🔗 Send NZB URLs directly to SABnzbd with one click
- ⚙️ Dedicated configuration page for server settings

- 📋 Context menu integration
- 🎨 Modern, beautiful UI with status indicators
- 🔒 Secure API key storage
- 📈 Queue progress tracking
- 💾 Disk space monitoring

## Installation

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your extensions list

### Method 2: Install from Chrome Web Store (When Available)

1. Search for "SABnzbd NZB Downloader" in the Chrome Web Store
2. Click "Add to Chrome"
3. Follow the installation prompts

## Configuration

1. Right-click the extension icon and select "Options"
2. Enter your SABnzbd server URL (e.g., `http://localhost:8080`)
3. Enter your API keys:
   - **Control API Key**: Used for monitoring and controlling downloads (found in SABnzbd → Config → General → API Key)
   - **NZB Upload API Key**: Used for uploading NZB files (can be the same as Control API Key, or different for security)
4. Configure behavior settings (notifications)
5. Click "Save Settings"
6. Test the connection using the "Test Connection" button

### Finding Your SABnzbd API Key

1. Open your SABnzbd web interface
2. Go to Config → General
3. Look for "API Key" in the "SABnzbd" section
4. Copy the API key and paste it into the extension

## Usage

### Method 1: Using the Extension Popup (Monitor)

1. Click the extension icon to open the monitoring dashboard
2. View real-time SABnzbd status, queue information, and download progress
3. Click "Send Current URL" to send the current page's NZB file to SABnzbd
4. Click "Settings" to access configuration options

### Method 2: Using Context Menu

1. Right-click on any NZB link or page
2. Select "Send to SABnzbd" from the context menu
3. The file will be sent to your SABnzbd server



## File Structure

```
sabnzb-extension/
├── manifest.json          # Extension manifest
├── popup.html            # Monitoring dashboard UI
├── popup.js              # Monitoring functionality
├── options.html          # Configuration page UI
├── options.js            # Configuration functionality
├── background.js         # Background service worker

├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## Development

### Prerequisites

- Google Chrome browser
- Local SABnzbd server running
- Basic knowledge of Chrome extensions

### Testing

1. Load the extension as described in the installation section
2. Configure your SABnzbd settings
3. Test with a sample NZB URL
4. Check the browser console for any errors

### Building Icons

The extension requires icons in the following sizes:
- 16x16 pixels (icon16.png)
- 48x48 pixels (icon48.png)
- 128x128 pixels (icon128.png)

You can create these using any image editor or icon generator.

## Troubleshooting

### Common Issues

1. **Connection Failed**: 
   - Verify your SABnzbd URL is correct
   - Check that SABnzbd is running and accessible
   - Ensure your API key is correct

2. **Extension Not Working**:
   - Check the browser console for errors
   - Verify the extension is enabled
   - Try reloading the extension

3. **NZB Files Not Detected**:
   - The extension looks for URLs containing '.nzb', 'nzb', or 'download'
   - Some sites may use different URL patterns

### Debug Mode

To enable debug logging:
1. Open Chrome DevTools
2. Go to the Console tab
3. Look for messages from the extension

## Security

- API keys are stored securely in Chrome's sync storage
- No data is sent to external servers
- All communication is between your browser and your local SABnzbd server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Privacy Policy

### Data Collection
This extension does not collect, store, or transmit any personal data from users.

### Data Usage
All data remains on your local network and is only communicated with your SABnzbd server. No data is sent to external servers or third parties.

### Network Communication
The extension only communicates with your local SABnzbd server using the API keys you provide. All connections are made to your own server on your local network.

### Storage
The extension stores your SABnzbd configuration settings locally in your browser using Chrome's storage API. This data is not transmitted anywhere.

### Third-Party Services
The extension includes an optional donation link to Buy Me a Coffee. This is user-initiated and the extension does not automatically communicate with this service.

### Contact
If you have any questions about this privacy policy, please contact the developer through this repository.

*Last updated: August 2024*

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Look for similar issues in the repository
3. Create a new issue with detailed information

## Changelog

### Version 1.0
- Initial release
- Real-time SABnzbd monitoring dashboard
- NZB file sending via context menu
- Download controls (pause/resume/stop)
- Automatic badge updates
- Dark theme with professional UI
- Donation support via Buy Me a Coffee
- Dual API key support (control + NZB upload)
- Error handling and notifications
