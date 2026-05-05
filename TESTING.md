# Testing the WebSocket Interceptor Extension

## Installation

1. **Build the extension:**
   ```bash
   cd /Volumes/data/repo/me/extensions/wss-interceptor
   npm run build
   ```

2. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` directory: `/Volumes/data/repo/me/extensions/wss-interceptor/dist`

3. **Verify installation:**
   - The extension should appear in your extensions list
   - No errors should be shown

## Basic Testing

### Test 1: Detect WebSocket Connections

1. Open a website with WebSocket connections. Try these:
   - https://websocket.org/demos/echo/
   - https://www.piesocket.com/websocket-tester
   - https://demos.kaazing.com/echo/

2. Open Chrome DevTools (F12 or Cmd+Option+I)

3. Look for the "WebSockets" tab in DevTools (next to Console, Network, etc.)

4. Click on the WebSockets tab

5. **Expected Result:**
   - The connection should appear in the left sidebar
   - Connection URL and status should be visible
   - Connection should be selected by default

### Test 2: View Messages

1. With a WebSocket connection open, send a test message:
   - On websocket.org/demos/echo, type a message and click "Send"

2. **Expected Result:**
   - Outgoing message (↑) appears in the message table
   - Incoming echo message (↓) appears in the message table
   - Messages show timestamp, size, and preview
   - Clicking a message shows full details below

### Test 3: Create and Test Filters

1. Click the "🔍 Filters" button in the message panel

2. Click "+ Add Filter"

3. Configure a filter:
   - Property Path: `message` (or any property in your JSON)
   - Operator: `contains`
   - Value: `hello`
   - Direction: `both`
   - Check "Enabled"

4. Click "Save Filters"

5. Send a message containing "hello"

6. **Expected Result:**
   - A modal appears showing "Messages Held for Review"
   - The message is displayed in the modal
   - You can click "✓ Allow" to let it through
   - Or click "🚫 Block" to prevent it

### Test 4: Regex Filters

1. Open filter configuration

2. Create a filter:
   - Property Path: `type`
   - Operator: `regex`
   - Value: `^(login|auth)$`
   - Direction: `both`

3. Send messages with `{"type": "login"}` and `{"type": "message"}`

4. **Expected Result:**
   - Only messages with type "login" or "auth" are held
   - Other messages pass through immediately

### Test 5: Multiple Connections

1. Open multiple tabs with different WebSocket endpoints

2. Open DevTools WebSockets panel

3. **Expected Result:**
   - All connections appear in the left sidebar
   - Switching between connections shows their respective messages
   - Filters are per-connection (independent)

## Debugging

### Check Console Logs

Open the browser console and look for logs:
- `[WS Interceptor]` - Page context logs
- `[Content Script]` - Content script logs
- `[Service Worker]` - Service worker logs (check in `chrome://extensions` → extension details → "service worker" link)
- `[DevTools Bridge]` - DevTools panel logs
- `[App]` - React app logs

### Common Issues

**No connections appearing:**
- Refresh the page after loading the extension
- Check that content script is injecting (look for `[WS Interceptor] Initializing...` in console)
- Verify the website actually uses WebSocket

**Messages not held by filters:**
- Check that filter is enabled (checkbox)
- Verify the property path matches your message structure
- Test regex patterns in a regex tester first
- Check console for filter matching errors

**DevTools panel not showing:**
- Close and reopen DevTools
- Reload the extension (`chrome://extensions` → reload icon)
- Check service worker logs for errors

## Test Websites

### 1. WebSocket Echo Test (Simple)
URL: https://websocket.org/demos/echo/

**What to test:**
- Basic message interception
- Simple text filters
- Bidirectional message flow

### 2. PieSocket Tester (JSON)
URL: https://www.piesocket.com/websocket-tester

**What to test:**
- JSON property filters
- Multiple message types
- Connection management

### 3. Real Applications
Try the extension on real websites that use WebSocket:
- Slack (https://slack.com)
- Discord Web (https://discord.com/app)
- Binance (https://www.binance.com)
- Any trading platform

**Note:** Some sites may have Content Security Policy that prevents injection. This is expected behavior.

## Advanced Testing

### Performance Test

1. Send 100+ messages rapidly
2. Verify:
   - All messages are captured
   - UI remains responsive
   - Memory usage stays reasonable

### Filter Stress Test

1. Create 10+ filters
2. Send various messages
3. Verify:
   - Correct messages are held
   - No false positives/negatives
   - Performance is acceptable

### Connection Lifecycle

1. Open a WebSocket connection
2. Send messages
3. Close the connection
4. Verify status changes from "open" → "closed"

## Expected Behavior

### ✅ Should Work:
- Detect all WebSocket connections on a page
- Intercept all incoming and outgoing messages
- Hold messages matching filter rules
- Display messages in Chrome DevTools style
- Allow/block held messages individually
- Persist filters across page reloads
- Handle multiple simultaneous connections

### ❌ Known Limitations:
- Cannot intercept WebSockets created before extension loads (refresh page after install)
- Cannot intercept WebSockets in service workers
- Some sites with strict CSP may block injection
- Binary messages (ArrayBuffer) have limited display
- Message history is cleared on extension reload

## Troubleshooting

### Extension won't load:
```bash
# Rebuild and check for errors
npm run build
# Check for build errors

# Verify dist structure
ls -la dist/
# Should contain: devtools/, sw/, content/, assets/, manifest.json
```

### Service Worker errors:
1. Go to `chrome://extensions`
2. Find "WebSocket Interceptor"
3. Click "service worker" link
4. Check console for errors

### DevTools panel not working:
1. Close DevTools
2. Reload the extension
3. Refresh the page
4. Reopen DevTools
5. Check for the WebSockets tab

## Success Criteria

The extension is working correctly if:
- ✅ WebSocket connections appear in the sidebar
- ✅ Messages are displayed in the table with direction, time, size
- ✅ Filters can be created and saved
- ✅ Messages matching filters are held in a modal
- ✅ Held messages can be approved or blocked
- ✅ Both incoming and outgoing messages are intercepted
- ✅ UI resembles Chrome Network tab style
- ✅ Multiple connections can be managed simultaneously

## Reporting Issues

If you encounter issues, collect:
1. Chrome version: `chrome://version`
2. Extension version: Check manifest.json
3. Console logs from all contexts (page, content script, service worker, devtools)
4. Screenshots of the issue
5. Steps to reproduce
6. Test website URL
