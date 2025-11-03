# Chat Widget Public API

## Overview

The Chat Widget exposes a public API (`window.ChatWidgetAPI`) that allows 3rd party websites to programmatically control the chat widget behavior.

## Installation

After embedding the widget script on your website, the API will be automatically available at `window.ChatWidgetAPI`.

```html
<script src="YOUR_WIDGET_SCRIPT_URL"></script>
```

## API Methods

### `ChatWidgetAPI.toggle()`

Toggles the chat window state (opens if closed, closes if open).

**Example:**

```javascript
// Toggle chat on button click
document
  .getElementById('my-custom-button')
  .addEventListener('click', function () {
    window.ChatWidgetAPI.toggle();
  });
```

---

### `ChatWidgetAPI.open()`

Opens the chat window. If already open, does nothing.

**Example:**

```javascript
// Open chat after 5 seconds
setTimeout(function () {
  window.ChatWidgetAPI.open();
}, 5000);

// Open chat when user clicks a help link
document.querySelector('.help-link').addEventListener('click', function (e) {
  e.preventDefault();
  window.ChatWidgetAPI.open();
});
```

---

### `ChatWidgetAPI.close()`

Closes the chat window. If already closed, does nothing.

**Example:**

```javascript
// Close chat programmatically
window.ChatWidgetAPI.close();
```

---

### `ChatWidgetAPI.isOpen()`

Returns `true` if the chat window is currently open, `false` otherwise.

**Returns:** `boolean`

**Example:**

```javascript
if (window.ChatWidgetAPI.isOpen()) {
  console.log('Chat is currently open');
} else {
  console.log('Chat is currently closed');
}
```

---

### `ChatWidgetAPI.getInfo()`

Returns information about the widget's current state.

**Returns:** `object`

```javascript
{
  initialized: boolean,      // Whether widget is initialized
  isOpen: boolean,           // Whether chat window is open
  isConnected: boolean,      // Whether socket connection is active
  hasActiveSession: boolean, // Whether user has an active chat session
  widgetId: string          // The widget ID
}
```

**Example:**

```javascript
const info = window.ChatWidgetAPI.getInfo();
console.log('Widget Info:', info);

if (info.hasActiveSession) {
  console.log('User has an active chat session');
}
```

---

## Common Use Cases

### 1. Custom Chat Button

Replace or supplement the default chat button with your own:

```javascript
// Hide the default chat button (optional, via CSS)
// Then create your own button
document.getElementById('my-chat-btn').addEventListener('click', function () {
  window.ChatWidgetAPI.toggle();
});
```

### 2. Open Chat from Navigation Menu

```javascript
document
  .querySelector('.nav-contact-us')
  .addEventListener('click', function (e) {
    e.preventDefault();
    window.ChatWidgetAPI.open();
  });
```

### 3. Conditional Chat Opening

```javascript
// Open chat for users who have been on page for 30 seconds
setTimeout(function () {
  if (!window.ChatWidgetAPI.isOpen()) {
    window.ChatWidgetAPI.open();
  }
}, 30000);
```

### 4. Open Chat Based on User Action

```javascript
// Open chat when user clicks "Need Help?" button
document.querySelectorAll('.need-help').forEach(function (btn) {
  btn.addEventListener('click', function () {
    window.ChatWidgetAPI.open();
  });
});
```

### 5. Close Chat on Page Navigation

```javascript
// Close chat before navigating away
window.addEventListener('beforeunload', function () {
  window.ChatWidgetAPI.close();
});
```

### 6. Check Widget Status

```javascript
// Wait for widget to initialize before using API
function waitForWidget(callback) {
  if (window.ChatWidgetAPI) {
    callback();
  } else {
    setTimeout(function () {
      waitForWidget(callback);
    }, 100);
  }
}

waitForWidget(function () {
  console.log('Widget is ready!');
  window.ChatWidgetAPI.open();
});
```

---

## Error Handling

All API methods include built-in error handling and will log warnings/errors to the console if something goes wrong. The widget will not throw errors that break your page.

```javascript
// Safe to call even if widget isn't ready
window.ChatWidgetAPI.toggle(); // Will log warning if not initialized
```

---

## Browser Compatibility

The API works in all modern browsers that support:

- ES5 JavaScript
- `window` object
- Basic DOM manipulation

---

## Support

For issues or questions about the Widget API, please contact your widget provider or refer to the main documentation.
