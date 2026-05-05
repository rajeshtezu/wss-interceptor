# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Build the Extension

```bash
cd /Volumes/data/repo/me/extensions/wss-interceptor
npm install
npm run build
```

### 2. Load in Chrome

1. Open Chrome and go to: **`chrome://extensions/`**
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the **`dist`** folder: `/Volumes/data/repo/me/extensions/wss-interceptor/dist`

### 3. Test It!

1. Visit: **https://websocket.org/demos/echo/**
2. Open **Chrome DevTools** (press F12 or Cmd+Option+I)
3. Click the **"WebSockets"** tab
4. Type a message and click **"Send"**
5. Watch your WebSocket messages appear! 🎉

---

## 📋 What You'll See

### Left Sidebar
- All WebSocket connections from the current page
- Connection status (open/closed)
- Message count for each connection

### Main Panel
- **Message Table** (like Chrome Network tab)
  - Direction: ↑ Outgoing / ↓ Incoming
  - Timestamp
  - Size
  - Status (passed/held/blocked)
  - Message preview

### Click any message to see:
- Full JSON formatted content
- Raw message data
- All message details

---

## 🎯 Try Creating a Filter

1. Click **"🔍 Filters"** button
2. Click **"+ Add Filter"**
3. Configure:
   ```
   Property Path: message
   Operator: contains
   Value: hello
   Direction: both
   ✓ Enabled
   ```
4. Click **"Save Filters"**
5. Send a message with "hello" in it
6. **A modal will pop up!** The message is held for your review
7. Click **"✓ Allow"** to let it through, or **"🚫 Block"** to stop it

---

## 🔧 Common Issues

**Extension not showing?**
- Make sure you selected the `dist` folder, not the root folder
- Reload the extension in `chrome://extensions`

**No connections appearing?**
- Refresh the page after loading the extension
- Make sure the website actually uses WebSocket

**DevTools tab missing?**
- Close and reopen DevTools
- Reload the extension and try again

---

## 📚 Next Steps

- Read [README.md](./README.md) for full documentation
- See [TESTING.md](./TESTING.md) for comprehensive testing guide
- Check the console logs if you encounter issues

---

## 💡 Pro Tips

### Best Test Websites

1. **WebSocket Echo** (Simple)
   - https://websocket.org/demos/echo/
   - Great for basic testing

2. **PieSocket Tester** (JSON)
   - https://www.piesocket.com/websocket-tester
   - Perfect for testing JSON filters

3. **Real Apps** (Advanced)
   - Try on Slack, Discord, or trading platforms
   - See the extension in action!

### Filter Examples

**Intercept login events:**
```
Property: event.type
Operator: equals
Value: login
```

**Match user IDs with regex:**
```
Property: user.id
Operator: regex
Value: ^user_\d+$
```

**Catch all errors:**
```
Property: error
Operator: exists
```

---

## ✨ Features at a Glance

- ✅ Intercept all WebSocket messages
- ✅ Filter by JSON properties
- ✅ Hold messages for review
- ✅ Support for regex patterns
- ✅ Both incoming & outgoing
- ✅ Multiple connections
- ✅ Chrome DevTools integration
- ✅ Persistent filters

---

**Need help?** Check the browser console for detailed logs!
