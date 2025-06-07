# Chat Widget Implementation

## Overview

This implementation provides a complete, production-ready chat widget that can be embedded into any website. The widget is dynamically generated as JavaScript and includes a full-featured chat UI built with Tailwind CSS.

## Features

### 🎨 **UI/UX Features**

- **Responsive Design**: Built with Tailwind CSS for consistent styling across devices
- **Customizable Branding**: Primary color, header text, and welcome message configurable per widget
- **Floating Chat Button**: Bottom-right positioned with hover animations
- **Unread Message Badge**: Visual indicator for new messages when minimized
- **Typing Indicators**: Real-time typing status from agents
- **Connection Status**: Visual feedback for connection state

### 💬 **Chat Features**

- **Department Selection**: Customers can choose which department to chat with
- **Customer Information**: Optional name and email collection
- **Real-time Messaging**: Instant message delivery via Socket.IO
- **File Uploads**: Support for images and documents
- **Chat History**: Automatic restoration of previous conversations
- **Message Read Receipts**: Track when messages are read

### 🔧 **Technical Features**

- **Self-contained**: Loads all dependencies (Tailwind CSS, Socket.IO) automatically
- **Browser Fingerprinting**: Unique customer identification
- **Error Handling**: Graceful degradation and error recovery
- **Caching**: 5-minute cache headers for performance
- **Security**: Input sanitization and XSS protection

## Implementation Details

### Widget Script Generation

The widget script is dynamically generated in `widgets.controller.ts` at the endpoint:

```
GET /widgets/:widgetId/script.js
```

### Key Components

1. **ChatWidget Class**: Main widget controller
2. **Socket Integration**: Real-time communication with server
3. **UI Management**: Dynamic DOM manipulation for chat interface
4. **File Upload**: Handles image and document uploads
5. **State Management**: Tracks chat sessions, typing status, and connection state

### Socket Events

#### Customer → Server Events:

- `customer:connect_widget` - Initial widget connection
- `customer:initiate_chat` - Start new chat session
- `customer:send_message` - Send text/file messages
- `customer:typing_start/stop` - Typing indicators
- `customer:mark_messages_read` - Read receipts

#### Server → Customer Events:

- `server:widget_initialized` - Widget setup complete
- `server:new_message` - Incoming messages
- `server:agent_typing_start/stop` - Agent typing status
- `server:initiate_chat_ack` - Chat session created
- `server:no_agents_available_for_request` - No agents online

## Usage

### For Website Owners

Add this single script tag to your website:

```html
<script src="https://your-domain.com/widgets/WIDGET_ID/script.js"></script>
```

Replace `WIDGET_ID` with the actual widget ID from your admin panel.

### For Developers

The widget automatically:

1. Loads configuration from `/widgets/:widgetId/public-config`
2. Loads Tailwind CSS if not already present
3. Establishes Socket.IO connection
4. Creates and manages the chat UI
5. Handles all user interactions

## Configuration

Widget behavior is controlled by the widget configuration stored in MongoDB:

```typescript
{
  name: string;
  domains: string[];
  departmentIds: ObjectId[];
  isEnabled: boolean;
  primaryColor?: string;
  welcomeMessage?: string;
  headerText?: string;
}
```

## File Upload Support

The widget supports file uploads with the following features:

- **Accepted Types**: Images (jpg, png, gif), Documents (pdf, doc, docx, txt)
- **Upload Endpoint**: `POST /chat/upload` (needs to be implemented)
- **Preview**: Image files show inline previews
- **Progress**: Upload progress indication

## Browser Compatibility

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Features Used**: ES6 classes, async/await, fetch API, Canvas API
- **Fallbacks**: Graceful degradation for older browsers

## Security Considerations

1. **XSS Protection**: All user input is HTML-escaped
2. **Domain Validation**: Widget checks allowed domains
3. **File Upload**: Server-side validation required
4. **Rate Limiting**: Implement on server for message sending
5. **CORS**: Configure appropriately for cross-origin requests

## Performance Optimizations

1. **CDN Loading**: Tailwind CSS and Socket.IO loaded from CDN
2. **Caching**: 5-minute cache headers on widget script
3. **Lazy Loading**: Socket.IO loaded only when needed
4. **Debounced Typing**: Typing events throttled to reduce server load
5. **Message Queuing**: Handles offline scenarios

## Testing

Use the provided `widget-demo.html` file to test the widget:

1. Start your NestJS server
2. Create a widget in the admin panel
3. Update the widget ID in the demo file
4. Open the demo file in a browser

## Customization

### Styling

The widget uses Tailwind CSS classes. To customize:

1. Modify the `createChatWindow()` method
2. Update CSS classes as needed
3. Ensure Tailwind CSS supports your custom classes

### Functionality

Key methods to modify for custom behavior:

- `connectWidget()` - Connection logic
- `displayMessage()` - Message rendering
- `handleFileUpload()` - File upload handling
- `createUI()` - UI structure

## Production Deployment

1. **Environment Variables**: Set `APP_DOMAIN` in your configuration
2. **HTTPS**: Ensure SSL certificates for secure WebSocket connections
3. **CDN**: Consider hosting Tailwind CSS locally for better performance
4. **Monitoring**: Add error tracking and analytics
5. **Backup**: Implement message persistence and backup strategies

## Future Enhancements

- **Emoji Support**: Add emoji picker
- **Voice Messages**: Audio recording and playback
- **Video Chat**: WebRTC integration
- **Chatbot Integration**: AI-powered responses
- **Multi-language**: Internationalization support
- **Mobile App**: React Native or Flutter implementation
- **Analytics**: Detailed chat analytics and reporting
