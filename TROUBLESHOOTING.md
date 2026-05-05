# Troubleshooting Guide

## "Extension context invalidated" Error

### Problem
```
[App] Error loading connections: Error: Extension context invalidated.
```

DevTools panel shows "Loading WebSocket Interceptor..." indefinitely.

### Cause
This happens when you reload the extension while DevTools is still open. Chrome invalidates the extension context, breaking the connection between the DevTools panel and the service worker.

### Solution

**Option 1: Close and Reopen DevTools (Recommended)**
1. Close the DevTools window
2. Reload the extension in `chrome://extensions`
3. Reopen DevTools
4. The WebSocket tab should now work

**Option 2: Refresh the Page**
1. Keep DevTools open
2. Reload the extension
3. Refresh the page you're inspecting
4. Wait 1-2 seconds for automatic reconnection

**Option 3: Close and Reopen the Tab**
1. Close the tab with DevTools open
2. Reload the extension
3. Open a new tab
4. Open DevTools → WebSockets tab

### Prevention

**Best Practice:**
- Close DevTools before reloading the extension
- Or reload the inspected page after reloading the extension

### Technical Details

The extension now includes automatic reconnection logic:
- Detects when the extension context is invalidated
- Attempts to reconnect after 1 second
- Retries connection on failure
- All pending requests are gracefully handled

However, the cleanest solution is still to close DevTools before reloading the extension.

---

## DevTools Panel Shows "Loading..." Forever

### Symptoms
- WebSocket tab shows loading spinner
- Console shows connection errors
- No connections appear

### Checklist

1. **Is the extension loaded?**
   - Go to `chrome://extensions`
   - Verify "WebSocket Interceptor" is enabled
   - Check for error badges

2. **Is the service worker running?**
   - Go to `chrome://extensions`
   - Find "WebSocket Interceptor"
   - Click "service worker" link
   - Check console for errors

3. **Did you reload the extension with DevTools open?**
   - See "Extension context invalidated" section above
   - Close and reopen DevTools

4. **Check browser console:**
   - Open normal browser console (not DevTools console)
   - Look for `[DevTools Bridge]` messages
   - Should see "Connected for tab: ..."

### Expected Console Messages

**Normal startup:**
```
[DevTools Bridge] Connected for tab: 123
[Content Script] WebSocket Interceptor loaded
[WS Interceptor] Initializing in MAIN world...
[WS Interceptor] Initialized successfully in MAIN world
```

**After extension reload (with auto-reconnect):**
```
[DevTools Bridge] Disconnected
[DevTools Bridge] Attempting to reconnect...
[DevTools Bridge] Connected for tab: 123
```

---

## No WebSocket Connections Detected

### Problem
DevTools panel loads, but no connections appear even when page uses WebSocket.

### Checklist

1. **Refresh the page**
   - Content scripts only inject at page load
   - Refresh the page after loading the extension

2. **Check if page actually uses WebSocket**
   - Open browser console
   - Type: `window.WebSocket`
   - Should show the proxied function

3. **Check console for interceptor logs**
   - Look for `[WS Interceptor]` messages
   - Should see "New connection" when WebSocket is created

4. **Verify content scripts loaded**
   - Browser console should show:
     - `[WS Interceptor] Initializing in MAIN world...`
     - `[Content Script] WebSocket Interceptor loaded`

5. **Check for CSP errors**
   - Although fixed, verify no CSP violations
   - The MAIN world approach should work on all sites

### Test on Known Working Sites

Try these sites to verify the extension works:
- https://websocket.org/demos/echo/
- https://www.piesocket.com/websocket-tester

If it works on these but not your site, the issue is site-specific.

---

## Messages Not Appearing in DevTools

### Problem
Connections appear, but messages don't show up.

### Checklist

1. **Check message direction**
   - Messages should show ↑ (outgoing) or ↓ (incoming)
   - Verify messages are actually being sent/received

2. **Look for console logs**
   - Should see `[WS Interceptor] Outgoing message: ...`
   - Should see `[WS Interceptor] Incoming message: ...`

3. **Check if messages are held by filters**
   - Click "Filters" button
   - Check if filters are enabled
   - Messages might be in held state (modal)

4. **Verify service worker is processing**
   - Check service worker console
   - Should see `[Service Worker] Processing message: ...`

---

## Filters Not Working

### Problem
Filters are configured but messages pass through anyway.

### Checklist

1. **Is filter enabled?**
   - Check the checkbox next to the filter
   - Only enabled filters are applied

2. **Check property path**
   - Must match exact JSON structure
   - Case-sensitive
   - Use dot notation: `user.id`, `event.type`

3. **Verify message is JSON**
   - Filters only work on JSON messages
   - Plain text messages are not filtered

4. **Test regex patterns**
   - Use a regex tester (regex101.com)
   - JavaScript regex syntax
   - No delimiters needed (just the pattern)

5. **Check filter direction**
   - "incoming" only filters server → client
   - "outgoing" only filters client → server
   - "both" filters all messages

### Example Filters

**Match specific event type:**
```
Property Path: type
Operator: equals
Value: login
Direction: both
```

**Match user IDs with regex:**
```
Property Path: user.id
Operator: regex
Value: ^user_\d+$
Direction: both
```

**Check if error exists:**
```
Property Path: error
Operator: exists
Direction: incoming
```

---

## Performance Issues

### Problem
Extension causes lag or high memory usage.

### Solutions

1. **Limit polling frequency**
   - The extension polls every 2 seconds
   - Close unused DevTools panels

2. **Clear old connections**
   - Extension keeps up to 1000 messages per connection
   - Old messages are automatically pruned

3. **Disable when not debugging**
   - Disable the extension in `chrome://extensions`
   - Only enable when needed

4. **Use specific filters**
   - Don't leave all messages in "hold" mode
   - Only filter what you need to debug

---

## Service Worker Issues

### Problem
Service worker not running or crashing.

### How to Check

1. Go to `chrome://extensions`
2. Find "WebSocket Interceptor"
3. Click "service worker" link
4. Check for errors in console

### Common Issues

**Service worker not starting:**
- Syntax error in service-worker.js
- Check build output for errors
- Rebuild: `npm run build`

**Service worker crashing:**
- Memory issues (too many messages stored)
- Refresh the page to clear state
- Check for error logs

**Service worker not receiving messages:**
- Content script not loaded
- Check content script console logs
- Verify `window.postMessage` is working

---

## Build Issues

### Problem
`npm run build` fails or produces errors.

### Solutions

**TypeScript errors:**
```bash
npm run type-check
```

**Clean build:**
```bash
rm -rf dist node_modules
npm install
npm run build
```

**Vite errors:**
- Check `vite.config.js` syntax
- Verify all entry points exist
- Check file paths are correct

---

## Browser Compatibility

### Supported Browsers

✅ **Supported:**
- Chrome 95+ (Manifest V3 with `world: 'MAIN'`)
- Edge 95+
- Opera 81+

❌ **Not Supported:**
- Firefox (uses different extension API)
- Safari (uses different extension API)
- Chrome < 95 (lacks `world: 'MAIN'` support)

### Feature Detection

The extension uses:
- Manifest V3 (Chrome 88+)
- Content Script `world: 'MAIN'` (Chrome 95+)
- Service Workers (Chrome 88+)

---

## Getting Help

### Before Reporting Issues

1. **Check all console logs:**
   - Browser console
   - DevTools console  
   - Service worker console
   - Content script console

2. **Try the test sites:**
   - https://websocket.org/demos/echo/
   - https://www.piesocket.com/websocket-tester

3. **Verify clean state:**
   - Close all DevTools
   - Reload extension
   - Open fresh tab
   - Open DevTools

4. **Collect information:**
   - Chrome version: `chrome://version`
   - Extension version: Check manifest.json
   - Error messages: Screenshots or copy/paste
   - Steps to reproduce

### Useful Commands

**Check extension is loaded:**
```javascript
// In browser console
chrome.runtime.getManifest()
```

**Check WebSocket is proxied:**
```javascript
// In browser console
window.WebSocket.toString()
// Should show custom implementation
```

**Force reload extension:**
```bash
# In chrome://extensions
# Click reload button
# Or use keyboard shortcut: Cmd+R (Mac) / Ctrl+R (Windows)
```

---

## Quick Fixes Summary

| Problem | Quick Fix |
|---------|-----------|
| "Extension context invalidated" | Close DevTools, reload extension, reopen DevTools |
| Loading forever | Refresh the page after loading extension |
| No connections | Ensure page has WebSocket, refresh page |
| No messages | Check filters, verify messages are being sent |
| Filters not working | Check JSON property path and enable filter |
| High memory | Close unused DevTools, limit filters |
| CSP errors | Should be fixed with MAIN world approach |

---

## Still Having Issues?

1. Check the browser console for `[DevTools Bridge]`, `[Content Script]`, and `[WS Interceptor]` logs
2. Verify the service worker is running in `chrome://extensions`
3. Test on https://websocket.org/demos/echo/ to rule out site-specific issues
4. Try a clean rebuild: `rm -rf dist && npm run build`
