# WebSocket Interceptor - Chrome Extension

A powerful Chrome DevTools extension for intercepting, filtering, and debugging WebSocket communications in real-time.

## Features

- 🔍 **Intercept WebSocket Messages**: Capture all incoming and outgoing WebSocket messages
- 📊 **Chrome DevTools Integration**: Seamless integration as a DevTools panel
- 🎯 **Smart Filtering**: Filter messages based on JSON property paths with regex support
- ⏸️ **Hold & Review**: Intercept and review messages before they reach the application
- 📝 **Network Tab Style UI**: Familiar interface similar to Chrome's Network tab
- 🔄 **Multi-Connection Support**: Monitor multiple WebSocket connections simultaneously
- 💾 **Persistent Filters**: Filters are saved and restored automatically

## Installation

### From Source

1. Clone or download this repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right corner)
   - Click "Load unpacked"
   - Select the `dist` directory

## Usage

### Basic Workflow

1. **Open DevTools** (F12 or Cmd+Option+I)
2. **Navigate to WebSockets tab** (appears alongside Console, Network, etc.)
3. **Connections appear automatically** when a page opens WebSocket connections
4. **View messages** in the message table
5. **Configure filters** to intercept specific messages

### Creating Filters

1. Click the **"🔍 Filters"** button in the message panel
2. Click **"+ Add Filter"**
3. Configure the filter:
   - **Property Path**: JSON property path (e.g., `user.id`, `event.type`)
   - **Operator**: Choose from:
     - `equals` - Exact match
     - `contains` - Substring match
     - `regex` - Regular expression pattern
     - `exists` - Property exists (value ignored)
   - **Value**: The value to match (not needed for `exists`)
   - **Direction**: Choose which messages to filter:
     - `Both` - Incoming and outgoing
     - `Incoming` - Only server → client
     - `Outgoing` - Only client → server
4. Enable the filter with the checkbox
5. Click **"Save Filters"**

### Filter Examples

**Example 1: Intercept login messages**
```
Property Path: type
Operator: equals
Value: login
Direction: both
```

**Example 2: Filter by user ID with regex**
```
Property Path: user.id
Operator: regex
Value: ^user_\d{5}$
Direction: both
```

**Example 3: Catch all error events**
```
Property Path: event.error
Operator: exists
Direction: incoming
```

### Reviewing Held Messages

When a message matches a filter:
1. A modal appears showing all held messages
2. Review the message content
3. Choose an action:
   - **✓ Allow** - Let the message pass through
   - **🚫 Block** - Prevent the message from being sent/delivered
   - **Allow All** - Approve all held messages at once

## Architecture

The extension uses a three-layer architecture:

```
┌─────────────────────────────────────────────┐
│ Page Context (WebSocket Proxy)             │
│ - Intercepts native WebSocket API          │
└──────────────┬──────────────────────────────┘
               │ window.postMessage
               ↓
┌─────────────────────────────────────────────┐
│ Content Script                              │
│ - Forwards events to service worker         │
└──────────────┬──────────────────────────────┘
               │ chrome.runtime.sendMessage
               ↓
┌─────────────────────────────────────────────┐
│ Service Worker                              │
│ - Connection Manager                        │
│ - Filter Engine                             │
│ - Message Queue                             │
└──────────────┬──────────────────────────────┘
               │ chrome.runtime.Port
               ↓
┌─────────────────────────────────────────────┐
│ DevTools Panel (React)                      │
│ - Connection List                           │
│ - Message Table                             │
│ - Filter Configuration                      │
│ - Held Message Modal                        │
└─────────────────────────────────────────────┘
```

## Development

### Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run type-check
```

### Project Structure

```
src/
├── content-script/        # WebSocket interception
│   └── websocket-interceptor.ts
├── service-worker/        # Background processing
│   ├── service-worker.ts
│   ├── connection-manager.ts
│   ├── filter-engine.ts
│   └── message-queue.ts
├── devtools/             # DevTools entry points
│   ├── devtools.html
│   ├── devtools.ts
│   └── panel.html
├── panel/                # React UI
│   ├── App.tsx
│   ├── components/
│   ├── hooks/
│   └── services/
└── shared/               # Shared utilities
    ├── types.ts
    └── utils.ts
```

## Testing

See [TESTING.md](./TESTING.md) for comprehensive testing guide.

Quick test:
1. Visit https://websocket.org/demos/echo/
2. Open DevTools → WebSockets tab
3. Send a message
4. Verify it appears in the message table

## Technical Details

### Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Chrome Extension Manifest V3** - Latest extension standard

### Key Features

- **WebSocket Proxying**: Intercepts WebSocket at the native API level
- **JSON Property Filtering**: Deep property path matching (e.g., `user.profile.settings.theme`)
- **Regex Support**: Full regular expression support for pattern matching
- **Bidirectional Filtering**: Separate filters for incoming/outgoing or both
- **Connection Lifecycle Tracking**: Monitors open, close, and error events
- **Message Queuing**: Holds messages until user approval
- **Auto-saving Filters**: Filters persist across page reloads

### Limitations

- Cannot intercept WebSockets created before extension loads (refresh page after installation)
- Cannot intercept WebSockets in service workers (they run in a different context)
- Some sites with strict Content Security Policy may block injection
- Binary messages (ArrayBuffer/Blob) have limited display capabilities
- Message history cleared on extension reload

## Troubleshooting

### Extension not appearing in DevTools

1. Reload the extension in `chrome://extensions`
2. Close and reopen DevTools
3. Refresh the page

### No connections detected

1. Ensure the page actually uses WebSocket
2. Refresh the page after installing the extension
3. Check browser console for errors

### Filters not working

1. Verify the property path matches your message structure
2. Enable the filter with the checkbox
3. Test regex patterns in a regex tester first
4. Check console logs for filter errors

### Service Worker issues

1. Go to `chrome://extensions`
2. Find "WebSocket Interceptor"
3. Click "service worker" to view logs
4. Check for errors

## Contributing

Contributions are welcome! Please ensure:
- Code follows TypeScript best practices
- All builds complete without errors
- Test on multiple WebSocket implementations

## License

MIT License - Feel free to use and modify

## Support

For issues, questions, or feature requests, please check the console logs from:
- Page context: Browser console
- Content script: Browser console
- Service worker: `chrome://extensions` → service worker link
- DevTools panel: DevTools console

## Changelog

### Version 1.0.0
- Initial release
- WebSocket interception
- JSON property filtering with regex
- Hold & review functionality
- Multi-connection support
- Chrome DevTools integration
