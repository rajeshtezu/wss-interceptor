/**
 * DevTools entry point
 * Creates the WebSockets panel in Chrome DevTools
 */

console.log('[DevTools] Initializing...');

chrome.devtools.panels.create(
  'WebSockets',
  '', // icon path (empty for now)
  'devtools/panel.html',
  (panel) => {
    console.log('[DevTools] WebSockets panel created');
  }
);
