/**
 * Generates the widget script with the required parameters.
 *
 * @param {string} widgetId - The ID of the widget.
 * @param {string} baseUrl - The base URL for API calls.
 * @returns {string} The generated widget script as a string.
 */
export function generateWidgetScript(
  widgetId: string,
  baseUrl: string,
): string {
  const widgetScript = `
    (function() {
      'use strict';
      
      // Prevent multiple initializations
      if (window.ChatWidget) {
        console.warn('Chat widget already initialized');
        return;
      }
      
      // Add CSS animations
      const style = document.createElement('style');
      style.textContent = \`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }
      \`;
      document.head.appendChild(style);
    
      // Widget configuration (injected from server)
      const WIDGET_ID = '${widgetId}';
      const API_BASE = '${baseUrl}';
      const SOCKET_URL = API_BASE;
      const SOCKET_NAMESPACE = '/chat';
      
      // Utility functions
      const utils = {
        generateFingerprint() {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillText('Browser fingerprint', 2, 2);
          const fingerprint = canvas.toDataURL();
          return btoa(fingerprint).substring(0, 32);
        },
        
        getBrowserInfo() {
          return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            screenResolution: \`\${screen.width}x\${screen.height}\`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString()
          };
        },
        
        formatTime(date) {
          return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).format(new Date(date));
        },
        
        escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        },
        
        debounce(func, wait) {
          let timeout;
          return function executedFunction(...args) {
            const later = () => {
              clearTimeout(timeout);
              func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
          };
        },
        
        // Added utility function to safely scroll to bottom
        scrollToBottom(element) {
          if (element) {
            setTimeout(() => {
              element.scrollTop = element.scrollHeight;
            }, 0);
          }
        },
        
        // Convert hex color to rgba with opacity
        hexToRgba(hex, percent) {
          if (!hex) return '#ffffff';

          // Remove # if present
          hex = hex.replace('#', '');

          // Parse hex values
          let r = parseInt(hex.substring(0, 2), 16);
          let g = parseInt(hex.substring(2, 4), 16);
          let b = parseInt(hex.substring(4, 6), 16);

          // Increase each channel toward 255 by given percent
          r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
          g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
          b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

          // Convert back to hex and pad if necessary
          const toHex = (c) => c.toString(16).padStart(2, '0');

          return \`#\${toHex(r)}\${toHex(g)}\${toHex(b)}\`;
        },
        
        // Get positioning styles based on button_location
        getPositionStyles(buttonLocation) {
          const location = buttonLocation || 'bottom_right';
          
          const baseContainerStyle = {
            position: 'fixed',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            zIndex: '2147483647'
          };
          
          const baseChatWindowStyle = {
            position: 'absolute',
            width: '380px',
            maxWidth: 'calc(100vw - 64px)', // Ensure it doesn't exceed viewport width minus margins
            maxHeight: '80vh',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e5e7eb',
            display: 'none',
            flexDirection: 'column',
            overflow: 'hidden' // Prevent content from overflowing
          };
          
          switch (location) {
            case 'bottom_left':
              return {
                container: { ...baseContainerStyle, bottom: '32px', left: '32px' },
                chatWindow: { ...baseChatWindowStyle, bottom: '64px', left: '0', minWidth: '320px' }
              };
            case 'bottom_right':
              return {
                container: { ...baseContainerStyle, bottom: '32px', right: '32px' },
                chatWindow: { ...baseChatWindowStyle, bottom: '64px', right: '0', minWidth: '320px' }
              };
            case 'top_left':
              return {
                container: { ...baseContainerStyle, top: '32px', left: '32px' },
                chatWindow: { ...baseChatWindowStyle, top: '64px', left: '0', minWidth: '320px' }
              };
            case 'top_right':
              return {
                container: { ...baseContainerStyle, top: '32px', right: '32px' },
                chatWindow: { ...baseChatWindowStyle, top: '64px', right: '0', minWidth: '320px' }
              };
            default:
              // Default to bottom_right
              return {
                container: { ...baseContainerStyle, bottom: '32px', right: '32px' },
                chatWindow: { ...baseChatWindowStyle, bottom: '64px', right: '0', minWidth: '320px' }
              };
          }
        },
        
        // Apply styles to element
        applyStyles(element, styles) {
          Object.assign(element.style, styles);
        },
        
        // Create button-like div with proper styling and accessibility
        createButtonDiv(id, styles = {}) {
          const div = document.createElement('div');
          div.id = id;
          div.setAttribute('role', 'button');
          div.setAttribute('tabindex', '0');
          div.style.cursor = 'pointer';
          div.style.userSelect = 'none';
          div.style.outline = 'none';
          
          // Apply default button styles
          const defaultStyles = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            border: 'none',
            background: 'none'
          };
          
          this.applyStyles(div, { ...defaultStyles, ...styles });
          
          // Add keyboard support
          div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              div.click();
            }
          });
          
          return div;
        }
      };
    
      // Chat Widget Class
      class ChatWidget {
        constructor() {
          this.config = null;
          this.socket = null;
          this.customerId = null;
          this.currentChatSession = null;
          this.isConnected = false;
          this.isTyping = false;
          this.typingTimeout = null;
          this.isMinimized = true;
          this.unreadCount = 0;
          this.messages = new Map(); // Track messages by their _id
          this.pendingMessages = new Set(); // Track messages being sent
          this.messageReadObserver = null; // IntersectionObserver for tracking message visibility
          this.availableAgents = []; // Track current agent availability
          this.isOfflineMode = false; // Track if we're in offline mode
          this.autoMessageShown = false; // Track if auto-message has been displayed
          
          this.init();
        }
    
        async init() {
          try {
            await this.loadConfig();
            this.createUI();
            this.connectSocket();
            this.bindEvents();
            this.scheduleAutoMessage();
          } catch (error) {
            console.error('Failed to initialize chat widget:', error);
          }
        }
    
        async loadConfig() {
          const response = await fetch(\`\${API_BASE}/widgets/\${WIDGET_ID}/public-config\`);
          if (!response.ok) throw new Error('Failed to load widget config');
          this.config = await response.json();
        }
    

    
        createUI() {
          // Inject CSS for proper box-sizing within the widget
          this.injectWidgetCSS();
          
          const buttonLocation = this.config.widgetConfig?.button_location || 'bottom_right';
          const positionStyles = utils.getPositionStyles(buttonLocation);
          
          this.container = document.createElement('div');
          this.container.id = 'chat-widget-container';
          utils.applyStyles(this.container, positionStyles.container);
          
          this.createChatButton();
          this.createChatWindow();
          
          document.body.appendChild(this.container);
        }
        
        injectWidgetCSS() {
          // Only inject once
          if (document.getElementById('chat-widget-styles')) return;
          
          const style = document.createElement('style');
          style.id = 'chat-widget-styles';
          style.textContent = \`
            #chat-widget-container *, 
            #chat-widget-container *::before, 
            #chat-widget-container *::after {
              box-sizing: border-box !important;
            }
            
            #chat-widget-container {
              font-family: system-ui, -apple-system, sans-serif !important;
            }
            
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          \`;
          document.head.appendChild(style);
        }
    
        createChatButton() {
          const primaryColor = this.config.widgetConfig?.primaryColor || '#3B82F6';
          const buttonLabel = this.config.widgetConfig?.button_label || 'Chat with us';
          const textColor = this.config.widgetConfig?.widget_text_color || '#FFFFFF';
          
          this.chatButton = document.createElement('div');
          utils.applyStyles(this.chatButton, {
            position: 'relative',
            cursor: 'pointer',
            transform: 'scale(1)',
            transition: 'transform 0.2s ease',
            userSelect: 'none'
          });
          
          // Add hover effect
          this.chatButton.addEventListener('mouseenter', () => {
            this.chatButton.style.transform = 'scale(1.05)';
          });
          this.chatButton.addEventListener('mouseleave', () => {
            this.chatButton.style.transform = 'scale(1)';
          });
          
          this.chatButton.innerHTML = \`
            <div style="
              padding: 12px 16px;
              border-radius: 9999px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              min-width: max-content;
              background-color: \${primaryColor};
              color: \${textColor};
            ">
              <span style="
                font-weight: 500;
                font-size: 14px;
                white-space: nowrap;
              ">\${utils.escapeHtml(buttonLabel)}</span>
              <div id="unread-badge" style="
                position: absolute;
                top: -4px;
                right: -4px;
                background-color: #ef4444;
                color: white;
                font-size: 12px;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: none;
                align-items: center;
                justify-content: center;
              ">
                <span id="unread-count">0</span>
              </div>
            </div>
          \`;
          
          this.chatButton.addEventListener('click', () => this.toggleChat());
          this.container.appendChild(this.chatButton);
        }
    
        createChatWindow() {
          const primaryColor = this.config.widgetConfig?.primaryColor || '#3B82F6';
          const secondaryColor = this.config.widgetConfig?.secondaryColor || '#64748B';
          const headerText = this.config.widgetConfig?.headerText || 'Chat with us';
          const buttonLocation = this.config.widgetConfig?.button_location || 'bottom_right';
          const bgColorWithOpacity = utils.hexToRgba(secondaryColor, 90);
          const positionStyles = utils.getPositionStyles(buttonLocation);
          
          this.chatWindow = document.createElement('div');
          utils.applyStyles(this.chatWindow, positionStyles.chatWindow);
          this.chatWindow.style.backgroundColor = bgColorWithOpacity;
          
          this.chatWindow.innerHTML = \`
            <!-- Header -->
            <div style="
              padding: 16px;
              border-radius: 8px 8px 0 0;
              color: white;
              flex-shrink: 0;
              background-color: \${primaryColor};
            ">
              <!-- Header Row -->
              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  flex: 1;
                  justify-content: center;
                ">
                  <span id="chat-header-text" style="font-weight: 500; text-align: center;">\${utils.escapeHtml(headerText)}</span>
                </div>
                <div id="minimize-btn" role="button" tabindex="0" style="
                  color: white;
                  cursor: pointer;
                  transition: color 0.2s ease;
                  user-select: none;
                  outline: none;
                " onmouseover="this.style.color='#d1d5db'" onmouseout="this.style.color='white'">
                  <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </div>
              </div>
              <!-- Agent Profiles Row -->
              <div id="agent-profiles" style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
              "></div>
            </div>
    
            <!-- Connection Status -->
            <div id="connection-status" style="
              padding: 8px 16px;
              background-color: #fefce8;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
              color: #92400e;
              display: none;
              flex-shrink: 0;
            ">
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
              ">
                <div style="
                  width: 8px;
                  height: 8px;
                  background-color: #fbbf24;
                  border-radius: 50%;
                  animation: pulse 2s infinite;
                "></div>
                <span>Connecting...</span>
              </div>
            </div>
    
            <!-- Chat Interface -->
            <div id="chat-interface" style="
              flex: 1;
              display: none;
              flex-direction: column;
              overflow: hidden;
            ">
              <!-- Chat Header -->
              <div id="chat-header" style="
                padding: 8px 16px;
                border-bottom: 1px solid #e5e7eb;
                background-color: white;
                flex-shrink: 0;
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                ">
                  <div>
                    <div style="
                      font-size: 12px;
                      color: #6b7280;
                    " id="agent-status">Connecting...</div>
                  </div>
                </div>
              </div>
    
              <!-- Messages Container - Fixed height issue with overflow -->
              <div id="messages-container" style="
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
              ">
                <!-- Messages will be populated here -->
              </div>
    
              <!-- Typing Indicator -->
              <div id="typing-indicator" style="
                padding: 8px 16px;
                font-size: 14px;
                color: #6b7280;
                display: none;
                flex-shrink: 0;
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="display: flex; gap: 4px;">
                    <div style="
                      width: 8px;
                      height: 8px;
                      background-color: #9ca3af;
                      border-radius: 50%;
                      animation: bounce 1.4s infinite ease-in-out both;
                    "></div>
                    <div style="
                      width: 8px;
                      height: 8px;
                      background-color: #9ca3af;
                      border-radius: 50%;
                      animation: bounce 1.4s infinite ease-in-out both;
                      animation-delay: 0.16s;
                    "></div>
                    <div style="
                      width: 8px;
                      height: 8px;
                      background-color: #9ca3af;
                      border-radius: 50%;
                      animation: bounce 1.4s infinite ease-in-out both;
                      animation-delay: 0.32s;
                    "></div>
                  </div>
                  <span>Agent is typing...</span>
                </div>
              </div>
    
              <!-- Message Input - Fixed to bottom -->
              <div style="
                border-top: 1px solid #e5e7eb;
                padding: 16px;
                flex-shrink: 0;
                background-color: white;
              ">
                <div style="
                  display: flex;
                  gap: 8px;
                ">
                  <div style="
                    flex: 1;
                    position: relative;
                  ">
                    <input type="text" id="message-input" 
                           placeholder="Type your message..." 
                           style="
                             width: 100%;
                             color: black;
                             padding: 8px 50px 8px 12px;
                             border: 1px solid #d1d5db;
                             border-radius: 8px;
                             outline: none;
                             box-sizing: border-box;
                             transition: border-color 0.2s ease, box-shadow 0.2s ease;
                           "
                           onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                           onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
                    <input type="file" id="file-input" style="display: none;" accept="image/*,.pdf,.doc,.docx,.txt">
                    <div id="attach-btn" role="button" tabindex="0" style="
                      position: absolute;
                      right: 20px;
                      top: 50%;
                      transform: translateY(-50%);
                      color: #9ca3af;
                      cursor: pointer;
                      transition: color 0.2s ease;
                      user-select: none;
                      outline: none;
                    " onmouseover="this.style.color='#6b7280'" onmouseout="this.style.color='#9ca3af'">
                      <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                    </div>
                  </div>
                  <div id="send-btn" role="button" tabindex="0" style="
                    padding: 8px 16px;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                    user-select: none;
                    outline: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: \${primaryColor};
                  " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                    <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
    
            <!-- Customer Info Form -->
            <div id="customer-info-form" style="
              flex: 1;
              padding: 16px;
              border-top: 1px solid #e5e7eb;
              display: none;
              flex-direction: column;
              overflow-y: auto;
              background-color: white;
            ">
              <div style="
                display: flex;
                flex-direction: column;
                gap: 12px;
                flex: 1;
              ">
                <div>
                  <label style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 4px;
                  ">Name (optional)</label>
                  <input type="text" id="customer-name" style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    outline: none;
                    color: black;
                    box-sizing: border-box;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                  " onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                     onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
                </div>
                <div>
                  <label style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 4px;
                  ">Email (optional)</label>
                  <input type="email" id="customer-email" style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    outline: none;
                    color: black;
                    box-sizing: border-box;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                  " onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                     onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
                </div>
                <div style="
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                ">
                  <label style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 4px;
                  ">Message</label>
                  <textarea id="initial-message" rows="3" placeholder="How can we help you?" style="
                    flex: 1;
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    outline: none;
                    resize: vertical;
                    box-sizing: border-box;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                  " onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                     onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"></textarea>
                </div>
                <div id="start-chat-btn" role="button" tabindex="0" style="
                  width: 100%;
                  padding: 8px;
                  color: white;
                  border-radius: 8px;
                  cursor: pointer;
                  transition: opacity 0.2s ease;
                  user-select: none;
                  outline: none;
                  text-align: center;
                  background-color: \${primaryColor};
                " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                  Start Chat
                </div>
              </div>
            </div>
            
            <!-- Offline Thank You Message -->
            <div id="offline-thank-you" style="
              flex: 1;
              padding: 16px;
              border-top: 1px solid #e5e7eb;
              display: none;
              flex-direction: column;
              overflow-y: auto;
              background-color: white;
            ">
              <div style="
                display: flex;
                flex-direction: column;
                gap: 12px;
                flex: 1;
                align-items: center;
                justify-content: center;
                text-align: center;
              ">
                <svg style="
                  width: 64px;
                  height: 64px;
                  color: #10b981;
                  margin-bottom: 8px;
                " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 style="
                  font-size: 20px;
                  font-weight: 500;
                  color: #111827;
                ">Thank you!</h3>
                <p style="
                  color: #6b7280;
                ">We will get back to you via the email you provided.</p>
                <div id="close-thank-you-btn" role="button" tabindex="0" style="
                  margin-top: 16px;
                  padding: 8px 16px;
                  color: white;
                  border-radius: 8px;
                  cursor: pointer;
                  transition: opacity 0.2s ease;
                  user-select: none;
                  outline: none;
                  background-color: \${primaryColor};
                " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                  Close
                </div>
              </div>
            </div>
          \`;
          
          this.container.appendChild(this.chatWindow);
        }
    
        bindEvents() {
          document.getElementById('minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            this.toggleChat();
          });
          
          const messageInput = document.getElementById('message-input');
          messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              this.sendMessage();
            }
          });
          
          messageInput.addEventListener('input', utils.debounce(() => this.handleTyping(), 300));
          document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
          document.getElementById('attach-btn').addEventListener('click', () => document.getElementById('file-input').click());
          document.getElementById('file-input').addEventListener('change', (e) => this.handleFileUpload(e));
          document.getElementById('start-chat-btn').addEventListener('click', () => this.initiateChat());
          
          // Add event listener for the close button in the thank you message
          const closeThankYouBtn = document.getElementById('close-thank-you-btn');
          if (closeThankYouBtn) {
            closeThankYouBtn.addEventListener('click', () => this.toggleChat());
          }
          
          // Add resize observer to adjust scrolling when window size changes
          if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
              const messagesContainer = document.getElementById('messages-container');
              if (messagesContainer) {
                utils.scrollToBottom(messagesContainer);
              }
            });
            resizeObserver.observe(this.chatWindow);
          }
        }
    
        connectSocket() {
          if (typeof io === 'undefined') {
            this.loadSocketIO().then(() => this.establishSocketConnection()).catch(err => console.error("Failed to load Socket.IO", err));
          } else {
            this.establishSocketConnection();
          }
        }
    
        async loadSocketIO() {
          return new Promise((resolve, reject) => {
            if (window.io) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
    
        establishSocketConnection() {
          // Connect to the specific namespace path
          this.socket = io(SOCKET_URL + "/chat");
          
          this.socket.on('connect', () => {
            console.log('Connected to chat server');
            this.isConnected = true;
            this.hideConnectionStatus();
            this.connectWidget();
          });
    
          this.socket.on('disconnect', () => {
            console.log('Disconnected from chat server');
            this.isConnected = false;
            this.showConnectionStatus('Reconnecting...', 'yellow');
          });
    
          this.socket.on('server:widget_initialized', (data) => {
            console.log('Widget initialized:', data);
            this.customerId = data.customerId;
            
            // Store initial agent availability and ensure no duplicates
            const initialAgents = data.initialAgentAvailability || [];
            const uniqueAgents = [];
            const seenIds = new Set();
            
            for (const agent of initialAgents) {
              const normalizedId = String(agent.userId);
              if (!seenIds.has(normalizedId)) {
                seenIds.add(normalizedId);
                uniqueAgents.push(agent);
              }
            }
            
            this.availableAgents = uniqueAgents;
            
            // Update header with agent profile pictures
            this.updateAgentProfilePictures(this.availableAgents);
            
            if (data.activeSession) {
              this.currentChatSession = data.activeSession;
              this.showChatInterface();
              this.loadChatHistory();
            }
          });
    
          this.socket.on('server:initiate_chat_ack', (data) => {
            console.log('Chat initiated:', data);
            this.currentChatSession = { chatSessionId: data.chatSessionId };

            if (!this.isOfflineMode) {
              this.showChatInterface();
              
              // Load chat history if this is an existing session
              if (data.status === 'EXISTING') {
                this.loadChatHistory();
              }
            }
            
          });

          this.socket.on('server:agent_initiated_chat', (data) => {
            console.log('Agent initiated chat:', data);
            
            // Set up the chat session
            this.currentChatSession = { 
              chatSessionId: data.chatSessionId,
              agentId: data.agentId,
              agentName: data.agentName
            };
            
            // Show the chat interface
            this.showChatInterface();
            
            // Update agent status with the agent's name
            if (data.agentName) {
              this.showAgentStatus(\`Chatting with \${data.agentName}\`);
            }
            
            // Display the initial message from the agent if provided
            if (data.initialMessage) {
              this.displayMessage({
                _id: \`agent_init_\${Date.now()}\`, // Generate a temporary ID
                senderType: 'agent',
                messageContent: { 
                  text: data.initialMessage, 
                  type: 'text'
                },
                timestamp: new Date().toISOString(),
                readByAgent: true, // Agent messages are considered read by default
                agentInfo: data.agentName ? { fullName: data.agentName } : null
              });
            }
            
            // Display welcome message from widget if available and different from initial message
            if (data.widget && data.widget.welcomeMessage && data.widget.welcomeMessage !== data.initialMessage) {
              this.displayMessage({
                _id: \`welcome_\${Date.now()}\`, // Generate a temporary ID
                senderType: 'system',
                messageContent: { 
                  text: data.widget.welcomeMessage, 
                  type: 'text'
                },
                timestamp: new Date().toISOString(),
                readByAgent: true
              });
            }
            
            // If the chat window is minimized, show notification
            if (this.isMinimized) {
              this.incrementUnreadCount();
            }
          });

          this.socket.on('server:new_message', (message) => {
            console.log('Received server:new_message:', message);
            console.log('Message content:', message.content);
            console.log('Message type:', message.messageType);
            
            // Remove from pending messages if this was a customer message we sent
            if (message.senderType.toLowerCase() === 'customer') {
              // For text messages, remove by text content
              if (message.content.text) {
                this.removePendingMessage(message.content.text);
              }
              // For file messages, remove by filename (since we show "Uploading filename..." as pending)
              else if (message.content.filename) {
                this.removePendingMessage(\`Uploading \${message.content.filename}...\`);
              }
            }
            
            // Only display messages if we're not in offline mode
            if (!this.isOfflineMode) {
              this.displayMessage({
                _id: message._id,
                senderType: message.senderType.toLowerCase(),
                messageContent: { 
                  text: message.content.text, 
                  type: message.content.type || message.messageType.toLowerCase(),
                  url: \`\${API_BASE}\${message.content.url}\`,
                  filename: message.content.filename,
                  fileSize: message.content.fileSize,
                  mimeType: message.content.mimeType
                },
                timestamp: message.timestamp,
                readByAgent: message.readByAgent || false,
                agentInfo: message.agentInfo
              });
            } else {
              console.log('Message received in offline mode - not displaying:', message);
            }
            
            // Store message reference for status updates
            this.messages.set(message._id, message);
            
            if (this.isMinimized && message.senderType.toLowerCase() !== 'customer') {
              this.incrementUnreadCount();
            }
          });
    
          this.socket.on('server:agent_typing_start', () => this.showTypingIndicator());
          this.socket.on('server:agent_typing_stop', () => this.hideTypingIndicator());
          this.socket.on('server:no_agents_available_for_request', () => this.showAgentStatus('No agents available. We\\'ll respond soon.'));
          this.socket.on('server:chat_session_pending', () => this.showAgentStatus('Looking for an available agent...'));
          
          // Listen for message seen by agent event
          this.socket.on('server:message_seen_by_agent', (data) => {
            console.log('Message seen by agent:', data);
            this.updateMessageStatus(data.messageId, 'seen');
          });
          
          // Mark agent messages as read when they become visible
          this.setupMessageReadTracking();
          
          // Listen for agent details when chat is accepted
          this.socket.on('server:agent_details_on_accept', (data) => {
            console.log('Agent accepted chat:', data);
            if (data && data.agent) {
              this.showAgentStatus(\`Chatting with \${data.agent.name}\`);
              // If we need to update other UI elements with agent info, add here
            }
          });

          this.socket.on('server:agent_ended_chat', (data) => {
            console.log('Agent ended chat:', data);
            this.showAgentStatus(\`Chat ended, please refresh the page for new chat\`);
          });

          // Listen for agent status changes
          this.socket.on('server:agent_status_changed', (data) => {
            console.log('Agent status changed:', data);
            this.handleAgentStatusChange(data);
          });

          // Listen for customer info request from server
          this.socket.on('server:customer_info_requested', (data) => {
            console.log('Customer info requested:', data);
            this.showCustomerInfoRequestForm();
          });
        }
    
        connectWidget() {
          const connectData = {
            widgetId: WIDGET_ID,
            domain: window.location.hostname,
            customerId: this.customerId,
            fingerprint: utils.generateFingerprint(),
            currentPageUrl: window.location.href,
            browserInfo: utils.getBrowserInfo()
          };
          console.log('Sending connection request:', connectData);
          this.socket.emit('customer:connect_widget', connectData);
        }
        
        showCustomerInfoForm() {
          document.getElementById('chat-interface').style.display = 'none';
          const infoForm = document.getElementById('customer-info-form');
          infoForm.style.display = 'flex';
        }
    
        showDepartmentSelection() {
          document.getElementById('chat-interface').style.display = 'none';
          const infoForm = document.getElementById('customer-info-form');
          infoForm.style.display = 'flex';
        }
    
        showChatInterface(departmentId = null) {
          document.getElementById('customer-info-form').style.display = 'none';
          
          const chatInterface = document.getElementById('chat-interface');
          chatInterface.style.display = 'flex';
          
          // Focus the input field for better UX
          setTimeout(() => {
            const messageInput = document.getElementById('message-input');
            if (messageInput) messageInput.focus();
          }, 100);
        }

        showCustomerInfoRequestForm() {
          // Display the form as a chat message
          const primaryColor = this.config.widgetConfig?.primaryColor || '#3B82F6';
          
          const formId = \`info_request_\${Date.now()}\`;
          const formMessage = {
            _id: formId,
            senderType: 'system',
            messageContent: { 
              type: 'customer_info_form',
              text: 'Please provide your contact information to continue:',
              formId: formId // Add unique form ID
            },
            timestamp: new Date().toISOString(),
            readByAgent: true
          };
          
          this.displayMessage(formMessage);
          
          // Scroll to bottom to show the form
          const messagesContainer = document.getElementById('messages-container');
          utils.scrollToBottom(messagesContainer);
        }

        submitCustomerInfoRequest(nameInput, emailInput) {
          if (!nameInput || !emailInput) {
            console.error('Customer info form inputs not found');
            return;
          }
          
          const name = nameInput.value.trim();
          const email = emailInput.value.trim();
          
          // Basic validation
          if (!name) {
            alert('Please enter your name.');
            nameInput.focus();
            return;
          }
          
          if (!email) {
            alert('Please enter your email.');
            emailInput.focus();
            return;
          }
          
          // Create a formatted message with the customer information
          const infoMessage = \`Name: \${name}\\nEmail: \${email}\`;
          
          // Send the information as a regular message
          if (this.currentChatSession?.chatSessionId) {
            const messageData = {
              chatSessionId: this.currentChatSession.chatSessionId,
              messageContent: { type: 'text', text: infoMessage }
            };
            
            // Show pending message state
            this.addPendingMessage(infoMessage);
            this.displayMessage({
              senderType: 'customer',
              messageContent: messageData.messageContent,
              timestamp: new Date(),
              isPending: true
            });
            
            this.socket.emit('customer:send_message', messageData);
          }
          
          // Disable the form to prevent multiple submissions
          nameInput.disabled = true;
          emailInput.disabled = true;
          const submitBtn = document.getElementById(\`submit-info-request-\${formId}\`);
          if (submitBtn) {
            submitBtn.style.pointerEvents = 'none';
            submitBtn.textContent = 'Submitted';
            submitBtn.style.opacity = '0.5';
          }
        }
    
        updateHeaderText(agentsAvailable) {
          // Target the header text in the chat window
          const headerTextElement = document.getElementById('chat-header-text');
          if (!headerTextElement) return;
          
          let displayText;
          if (agentsAvailable) {
            displayText = this.config.widgetConfig?.headerText || 'Chat with us';
          } else {
            displayText = this.config.widgetConfig?.offline_text || this.config.widgetConfig?.headerText || 'Chat with us';
          }
          
          headerTextElement.innerHTML = utils.escapeHtml(displayText);
        }
    
        updateAgentProfilePictures(agents) {
          const profileContainer = document.getElementById('agent-profiles');
          if (!profileContainer) return;
          
          // Update header text based on agent availability
          this.updateHeaderText(agents.length > 0);
          
          // Clear existing profiles
          profileContainer.innerHTML = '';
          
          // Update the start chat button text based on agent availability
          const startChatBtn = document.getElementById('start-chat-btn');
          if (startChatBtn) {
            startChatBtn.textContent = agents.length > 0 ? 'Start Chat' : 'Submit';
          }
          
          // Update email field requirement based on agent availability
          // Find the email label by looking for the label that's a sibling of the customer-email input's parent
          const emailInput = document.getElementById('customer-email');
          const emailLabel = emailInput ? emailInput.parentElement.querySelector('label') : null;
          
          if (emailLabel && emailInput) {
            if (agents.length === 0) {
              // Offline mode - email is required
              emailLabel.innerHTML = 'Email <span style="color: #ef4444;">*</span>';
              emailInput.setAttribute('required', 'required');
            } else {
              // Online mode - email is optional
              emailLabel.textContent = 'Email (optional)';
              emailInput.removeAttribute('required');
            }
          }
          
          // Show max 3 agents
          const agentsToShow = agents.slice(0, 3);
          
          agentsToShow.forEach((agent, index) => {
            // Create agent profile container (vertical stack)
            const agentProfile = document.createElement('div');
            utils.applyStyles(agentProfile, {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            });
            
            // Create profile picture container with relative positioning for status dot
            const profilePicContainer = document.createElement('div');
            profilePicContainer.style.position = 'relative';
            
            // Create profile picture
            if (agent.profilePicture) {
              const profileImg = document.createElement('img');
              profileImg.src = \`\${API_BASE}\${agent.profilePicture}\`;
              utils.applyStyles(profileImg, {
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '2px solid white',
                objectFit: 'cover'
              });
              profileImg.alt = 'Agent';
              
              // Add error handling for broken images
              profileImg.onerror = function() {
                // If image fails, show a default avatar
                this.style.display = 'none';
                const defaultAvatar = document.createElement('div');
                utils.applyStyles(defaultAvatar, {
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid white',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                });
                defaultAvatar.innerHTML = '<span style="font-size: 12px; font-weight: 500;">A</span>';
                profilePicContainer.insertBefore(defaultAvatar, profilePicContainer.firstChild);
              };
              
              profilePicContainer.appendChild(profileImg);
            } else {
              // Show default avatar if no profile picture
              const defaultAvatar = document.createElement('div');
              utils.applyStyles(defaultAvatar, {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid white',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              });
              defaultAvatar.innerHTML = '<span style="font-size: 12px; font-weight: 500;">A</span>';
              profilePicContainer.appendChild(defaultAvatar);
            }
            
            // Add green status dot at bottom right
            const statusDot = document.createElement('div');
            utils.applyStyles(statusDot, {
              width: '8px',
              height: '8px',
              backgroundColor: '#4ade80',
              borderRadius: '50%',
              position: 'absolute',
              bottom: '0',
              right: '0'
            });
            profilePicContainer.appendChild(statusDot);
            
            agentProfile.appendChild(profilePicContainer);
            
            // Create name label
            const nameLabel = document.createElement('span');
            utils.applyStyles(nameLabel, {
              fontSize: '12px',
              fontWeight: '500',
              color: 'white',
              opacity: '0.9'
            });
            nameLabel.textContent = agent.firstName || 'Agent';
            agentProfile.appendChild(nameLabel);
            
            profileContainer.appendChild(agentProfile);
          });
        }

        handleAgentStatusChange(data) {
          // Expected payload: { chatSessionId, agentId, agentName, isOnline, timestamp }
          const { agentId, agentName, isOnline } = data;
          
          // Store previous agent availability state to detect transitions
          const wasOffline = this.availableAgents.length === 0;
          
          // Convert agentId to string for consistent comparison
          const normalizedAgentId = String(agentId);
          
          // Find the agent in our current availability list using userId for comparison
          const agentIndex = this.availableAgents.findIndex(agent => String(agent.userId) === normalizedAgentId);
          
          if (isOnline) {
            // Agent came online
            if (agentIndex === -1) {
              // Agent not in list, add them (we might not have all agent details, so create a minimal object)
              this.availableAgents.push({
                userId: agentId,
                firstName: agentName,
                isOnline: true
              });
            } else {
              // Agent already in list, update their status
              this.availableAgents[agentIndex].isOnline = true;
            }
          } else {
            // Agent went offline
            if (agentIndex !== -1) {
              // Remove agent from available list
              this.availableAgents.splice(agentIndex, 1);
            }
          }
          
          // Remove any potential duplicates based on userId (defensive programming)
          const uniqueAgents = [];
          const seenIds = new Set();
          
          for (const agent of this.availableAgents) {
            const normalizedId = String(agent.userId);
            if (!seenIds.has(normalizedId)) {
              seenIds.add(normalizedId);
              uniqueAgents.push(agent);
            }
          }
          
          this.availableAgents = uniqueAgents;
          
          // Update the UI with the new agent availability
          this.updateAgentProfilePictures(this.availableAgents);
          
          // Check if we transitioned from offline to online mode
          const isNowOnline = this.availableAgents.length > 0;
          
          if (wasOffline && isNowOnline) {
            console.log('Transitioned from offline to online mode');
            
            // Reset offline mode flag
            this.isOfflineMode = false;
            
            // If the thank you message is currently displayed, and we have an active chat session,
            // switch to the chat interface to show the agent is now available
            const thankYouDiv = document.getElementById('offline-thank-you');
            if (thankYouDiv.style.display !== 'none' && this.currentChatSession) {
              this.showChatInterface();
              this.showAgentStatus('An agent is now available!');
              // remove the thankYouDiv from DOM
              thankYouDiv.style.display = 'none';
            }
          }
        }
    
        initiateChat() {
          const name = document.getElementById('customer-name').value.trim();
          const email = document.getElementById('customer-email').value.trim();
          const initialMessage = document.getElementById('initial-message').value.trim();
    
          if (!initialMessage) {
            alert('Please enter a message to start the chat.');
            return;
          }
          
          // Check if email is required in offline mode
          if (this.availableAgents.length === 0 && !email) {
            alert('Please enter your email so we can get back to you.');
            return;
          }
    
          const chatData = {
            customerId: this.customerId,
            widgetId: WIDGET_ID,
            initialMessage: initialMessage,
            name: name || undefined,
            email: email || undefined
          };
          
          // Check if we're in offline mode (no agents available)
          if (this.availableAgents.length === 0) {
            console.log("Offline mode - storing message for later", chatData);
            this.isOfflineMode = true; // Set offline mode flag
            this.socket.emit('customer:initiate_chat', chatData);
            
            // Show thank you message instead of chat interface
            this.showOfflineThankYou();
            return;
          }
          
          // Reset offline mode flag for online mode
          this.isOfflineMode = false;
          
          // Online mode - proceed with normal chat
          console.log("customer:initiate_chat", chatData);
          this.socket.emit('customer:initiate_chat', chatData);
          this.showChatInterface();
          this.showAgentStatus('Starting chat...');
          
          // Show pending state for initial message
          this.addPendingMessage(initialMessage);
          this.displayMessage({
            senderType: 'customer',
            messageContent: { type: 'text', text: initialMessage },
            timestamp: new Date(),
            isPending: true
          });
        }
        
        showOfflineThankYou() {
          // Hide other interfaces
          document.getElementById('customer-info-form').style.display = 'none';
          document.getElementById('chat-interface').style.display = 'none';
          
          // Show thank you message
          const thankYouDiv = document.getElementById('offline-thank-you');
          thankYouDiv.style.display = 'flex';
        }
    
        sendMessage() {
          const messageInput = document.getElementById('message-input');
          const messageText = messageInput.value.trim();
          if (!messageText || !this.currentChatSession?.chatSessionId) return;
    
          const messageData = {
            chatSessionId: this.currentChatSession.chatSessionId,
            messageContent: { type: 'text', text: messageText }
          };
    
          // Show pending message state
          this.addPendingMessage(messageText);
          this.displayMessage({
            senderType: 'customer',
            messageContent: messageData.messageContent,
            timestamp: new Date(),
            isPending: true
          });
          
          this.socket.emit('customer:send_message', messageData);
          messageInput.value = '';
          this.stopTyping();
          
          // Focus the input field after sending
          setTimeout(() => messageInput.focus(), 0);
        }
    
        handleFileUpload(event) {
          const file = event.target.files[0];
          if (!file || !this.currentChatSession?.chatSessionId) return;
    
          const formData = new FormData();
          formData.append('image', file);
          formData.append('chatSessionId', this.currentChatSession.chatSessionId);
    
          // Show uploading state
          const uploadingText = \`Uploading \${file.name}...\`;
          this.addPendingMessage(uploadingText);
          this.displayMessage({
            senderType: 'customer',
            messageContent: { text: uploadingText },
            timestamp: new Date(),
            isPending: true,
            isUploading: true
          });
    
          fetch(\`\${API_BASE}/public/chat/upload-image\`, {
            method: 'POST',
            body: formData
          })
          .then(response => {
            if (!response.ok) throw new Error('Upload failed');
            return response.json();
          })
          .then(data => {
            // Remove the uploading message from pending
            this.removePendingMessage(uploadingText);
            
            const messageData = {
              chatSessionId: this.currentChatSession.chatSessionId,
              messageContent: {
                type: 'file',
                url: data.imageUrl,
                filename: data.originalName,
                fileSize: data.size,
                mimeType: data.mimetype
              }
            };
            this.socket.emit('customer:send_message', messageData);
          })
          .catch(error => {
            console.error('File upload failed:', error);
            // Remove the uploading message from pending
            this.removePendingMessage(uploadingText);
            
            // Show error message
            this.displayMessage({
              senderType: 'system',
              messageContent: { text: 'File upload failed. Please try again.' },
              timestamp: new Date()
            });
          });
    
          event.target.value = '';
        }
    
        displayMessage(message) {
          console.log('[displayMessage]: Received message:', message);
          const messagesContainer = document.getElementById('messages-container');
          const messageDiv = document.createElement('div');
          
          const isCustomer = message.senderType === 'customer';
          const isSystem = message.senderType === 'system';
          const isPending = message.isPending || false;
          const primaryColor = this.config.widgetConfig?.primaryColor || '#3B82F6';
          const secondaryColor = this.config.widgetConfig?.secondaryColor || '#64748B';
          
          utils.applyStyles(messageDiv, {
            display: 'flex',
            justifyContent: isCustomer ? 'flex-end' : isSystem ? 'center' : 'flex-start'
          });
          
          // Add message ID and sender type as data attributes for status updates
          if (message._id) {
            messageDiv.setAttribute('data-message-id', message._id);
          }
          messageDiv.setAttribute('data-sender-type', message.senderType);
          
          // Add pending attribute for pending messages
          if (isPending) {
            messageDiv.setAttribute('data-pending', 'true');
            messageDiv.setAttribute('data-pending-text', message.messageContent.text || '');
          }
          
          let messageContent = '';
          if (message.messageContent.type === 'customer_info_form') {
            const primaryColor = this.config.widgetConfig?.primaryColor || '#3B82F6';
            const formId = message.messageContent.formId || message._id;
            messageContent = \`
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="font-size: 14px; color: #374151; margin-bottom: 12px;">\${utils.escapeHtml(message.messageContent.text)}</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div>
                    <label style="display: block; font-size: 12px; font-weight: 500; color: #4b5563; margin-bottom: 4px;">Name *</label>
                    <input type="text" id="info-request-name-\${formId}" 
                           style="width: 100%; padding: 4px 8px; font-size: 14px; border: 1px solid #d1d5db; border-radius: 4px; outline: none;" 
                           onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 1px #3b82f6';"
                           onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none';"
                           required>
                  </div>
                  <div>
                    <label style="display: block; font-size: 12px; font-weight: 500; color: #4b5563; margin-bottom: 4px;">Email *</label>
                    <input type="email" id="info-request-email-\${formId}" 
                           style="width: 100%; padding: 4px 8px; font-size: 14px; border: 1px solid #d1d5db; border-radius: 4px; outline: none;" 
                           onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 1px #3b82f6';"
                           onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none';"
                           required>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <div id="submit-info-request-\${formId}" role="button" tabindex="0"
                         style="flex: 1; padding: 4px 12px; font-size: 12px; color: white; border-radius: 4px; background-color: \${primaryColor}; cursor: pointer; transition: opacity 0.2s; text-align: center;"
                         onmouseover="this.style.opacity='0.9'" 
                         onmouseout="this.style.opacity='1'"
                         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
                      Submit
                    </div>
                  </div>
                </div>
              </div>
            \`;
          } else if (message.messageContent.text) {
            messageContent = utils.escapeHtml(message.messageContent.text);
          } else if (message.messageContent.type === 'file') {
            const isImage = message.messageContent.mimeType?.startsWith('image/');
            messageContent = \`
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; max-width: 100%;">
                \${isImage ? \`<img src="\${message.messageContent.url}" alt="\${utils.escapeHtml(message.messageContent.filename)}" style="max-width: 192px; border-radius: 4px;">\` : ''}
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                  <svg style="width: 16px; height: 16px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <a href="\${message.messageContent.url}" target="_blank" rel="noopener noreferrer" 
                     style="color: #2563eb; font-size: 14px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;"
                     onmouseover="this.style.textDecoration='underline'"
                     onmouseout="this.style.textDecoration='none'">
                    \${utils.escapeHtml(message.messageContent.filename)}
                  </a>
                </div>
              </div>
            \`;
          }
          
          // Create status indicator for customer messages
          let statusIndicator = '';
          if (isCustomer && !isPending) {
            const isRead = message.readByAgent || false;
            statusIndicator = \`
              <div class="message-status" style="margin-left: 8px; display: flex; align-items: center;">
                <span style="font-size: 12px; color: #bfdbfe;">\${isRead ? 'Seen' : 'Sent'}</span>
              </div>
            \`;
          } else if (isCustomer && isPending) {
            statusIndicator = \`
              <div class="message-status" style="margin-left: 8px; display: flex; align-items: center;">
                <span style="font-size: 12px; color: #bfdbfe;">Sending...</span>
              </div>
            \`;
          }
          
          // Special styling for customer info form
          const isInfoForm = message.messageContent.type === 'customer_info_form';
          const maxWidth = isInfoForm ? '384px' : '288px';
          
          // Check if this is an agent message (not customer, not system)
          const isAgent = !isCustomer && !isSystem;
          
          // Build message styles
          let messageStyles = \`
            max-width: \${maxWidth};
            padding: 8px 12px;
            border-radius: 8px;
            \${message.isUploading || isPending ? 'opacity: 0.5;' : ''}
          \`;
          
          if (isCustomer) {
            messageStyles += \`
              color: white;
              background-color: \${primaryColor};
            \`;
          } else if (isSystem) {
            if (isInfoForm) {
              messageStyles += \`
                background-color: #eff6ff;
                border: 1px solid #bfdbfe;
                color: #1f2937;
                width: 100%;
              \`;
            } else {
              messageStyles += \`
                background-color: #f3f4f6;
                color: #374151;
                font-size: 14px;
                text-align: center;
                width: 100%;
              \`;
            }
          } else {
            messageStyles += \`
              color: white;
              background-color: \${secondaryColor};
            \`;
          }
          
          // Build timestamp styles
          const timestampColor = isCustomer ? '#bfdbfe' : isSystem ? '#6b7280' : '#d1d5db';
          
          messageDiv.innerHTML = \`
            <div style="display: flex; flex-direction: column;">
              <div style="\${messageStyles}">
                <div>\${messageContent}</div>
                \${!isInfoForm ? \`<div style="font-size: 12px; text-align: right; margin-top: 4px; color: \${timestampColor}; display: flex; align-items: center; justify-content: flex-end;">
                  <span>\${utils.formatTime(message.timestamp)}</span>
                  \${statusIndicator}
                </div>\` : ''}
              </div>
              \${isAgent && message.agentInfo?.fullName ? \`<div style="font-size: 12px; color: #6b7280; margin-top: 4px; margin-left: 4px;">\${utils.escapeHtml(message.agentInfo.fullName)}</div>\` : ''}
            </div>
          \`;
          
          messagesContainer.appendChild(messageDiv);
          
          // Bind events for customer info form if this is a form message
          if (message.messageContent.type === 'customer_info_form') {
            const formId = message.messageContent.formId || message._id;
            const submitBtn = messageDiv.querySelector(\`#submit-info-request-\${formId}\`);
            const nameInput = messageDiv.querySelector(\`#info-request-name-\${formId}\`);
            const emailInput = messageDiv.querySelector(\`#info-request-email-\${formId}\`);
            
            if (submitBtn) {
              submitBtn.addEventListener('click', () => {
                this.submitCustomerInfoRequest(nameInput, emailInput);
              });
            }
            
            // Handle Enter key submission
            [nameInput, emailInput].forEach(input => {
              if (input) {
                input.addEventListener('keypress', (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submitCustomerInfoRequest(nameInput, emailInput);
                  }
                });
              }
            });
            
            // Focus the name input
            setTimeout(() => {
              if (nameInput) nameInput.focus();
            }, 100);
          }
          
          // Start observing this message for read tracking if it has an ID and is from agent
          if (message._id && !isCustomer && this.messageReadObserver) {
            this.messageReadObserver.observe(messageDiv);
          }
          
          // Use the utility function to scroll to bottom
          utils.scrollToBottom(messagesContainer);
        }
    
        handleTyping() {
          if (!this.currentChatSession?.chatSessionId || this.isTyping) return;
          this.isTyping = true;
          this.socket.emit('customer:typing_start', { chatSessionId: this.currentChatSession.chatSessionId });
          clearTimeout(this.typingTimeout);
          this.typingTimeout = setTimeout(() => this.stopTyping(), 3000);
        }
    
        stopTyping() {
          if (!this.isTyping || !this.currentChatSession?.chatSessionId) return;
          this.isTyping = false;
          this.socket.emit('customer:typing_stop', { chatSessionId: this.currentChatSession.chatSessionId });
          clearTimeout(this.typingTimeout);
        }
    
        showTypingIndicator() { 
          document.getElementById('typing-indicator').style.display = 'block'; 
          // Scroll to bottom when typing indicator appears
          const messagesContainer = document.getElementById('messages-container');
          utils.scrollToBottom(messagesContainer);
        }
        
        hideTypingIndicator() { document.getElementById('typing-indicator').style.display = 'none'; }
        showAgentStatus(status) { document.getElementById('agent-status').textContent = status; }
    
        showConnectionStatus(message, type = 'yellow') {
          const statusEl = document.getElementById('connection-status');
          statusEl.style.display = 'block';
          statusEl.querySelector('span').textContent = message;
          
          const baseStyles = {
            padding: '8px 16px',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '14px',
            flexShrink: '0'
          };
          
          const typeStyles = type === 'red' 
            ? { backgroundColor: '#fef2f2', color: '#991b1b' }
            : { backgroundColor: '#fffbeb', color: '#92400e' };
            
          utils.applyStyles(statusEl, { ...baseStyles, ...typeStyles });
        }
    
        hideConnectionStatus() { document.getElementById('connection-status').style.display = 'none'; }
    
        // Message management methods
        addPendingMessage(messageText) {
          this.pendingMessages.add(messageText);
        }
        
        removePendingMessage(messageText) {
          this.pendingMessages.delete(messageText);
          // Remove pending message from UI using data attributes
          const messagesContainer = document.getElementById('messages-container');
          const pendingElements = messagesContainer.querySelectorAll('div[data-pending="true"]');
          
          pendingElements.forEach(element => {
            const pendingText = element.getAttribute('data-pending-text');
            if (pendingText && pendingText.trim() === messageText.trim()) {
              element.remove();
            }
          });
        }
        
        updateMessageStatus(messageId, status) {
          console.log('Updating message status:', messageId, status);
          const messageElement = document.querySelector(\`[data-message-id="\${messageId}"]\`);
          
          if (messageElement) {
            // Find the status span using the message-status class
            const statusElement = messageElement.querySelector('.message-status span');
            if (statusElement && status === 'seen') {
              // Update text to "Seen"
              statusElement.textContent = 'Seen';
            }
            
            // Update stored message data
            if (this.messages.has(messageId)) {
              const message = this.messages.get(messageId);
              message.readByAgent = status === 'seen';
              this.messages.set(messageId, message);
            }
          }
        }
        
        setupMessageReadTracking() {
          // Set up intersection observer to track when messages become visible
          if (!window.IntersectionObserver) {
            // Fallback for older browsers - mark messages as read when chat is opened
            this.markVisibleMessagesAsRead();
            return;
          }
          
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const messageElement = entry.target;
                const messageId = messageElement.getAttribute('data-message-id');
                
                if (messageId && !messageElement.hasAttribute('data-read-sent')) {
                  // Check if this is an agent message (not customer message)
                  const isAgentMessage = messageElement.getAttribute('data-sender-type') === 'agent';
                  
                  if (isAgentMessage && this.currentChatSession?.chatSessionId) {
                    this.markMessageAsRead(messageId);
                    messageElement.setAttribute('data-read-sent', 'true');
                  }
                }
              }
            });
          }, {
            root: document.getElementById('messages-container'),
            threshold: 0.5 // Message is considered "seen" when 50% visible
          });
          
          this.messageReadObserver = observer;
          
          // Observe existing messages
          this.observeExistingMessages();
        }
        
        observeExistingMessages() {
          if (!this.messageReadObserver) return;
          
          const messageElements = document.querySelectorAll('[data-message-id]');
          messageElements.forEach(element => {
            this.messageReadObserver.observe(element);
          });
        }
        
        markMessageAsRead(messageId) {
          if (!this.currentChatSession?.chatSessionId || !messageId) return;
          
          console.log('Marking message as read:', messageId);
          this.socket.emit('customer:mark_messages_read', {
            chatSessionId: this.currentChatSession.chatSessionId,
            messageId: messageId
          });
        }
        
        markVisibleMessagesAsRead() {
          // Fallback method for browsers without IntersectionObserver
          if (!this.currentChatSession?.chatSessionId) return;
          
          const messageElements = document.querySelectorAll('[data-message-id]');
          messageElements.forEach(element => {
            const messageId = element.getAttribute('data-message-id');
            const isAgentMessage = element.getAttribute('data-sender-type') === 'agent';
            
            if (messageId && isAgentMessage && !element.hasAttribute('data-read-sent')) {
              this.markMessageAsRead(messageId);
              element.setAttribute('data-read-sent', 'true');
            }
          });
        }
    
        toggleChat() {
          this.isMinimized = !this.isMinimized;
          this.chatWindow.style.display = this.isMinimized ? 'none' : 'flex';
          if (!this.isMinimized) {
            this.resetUnreadCount();
            
            // Mark visible agent messages as read when chat is opened
            setTimeout(() => {
              this.markVisibleMessagesAsRead();
            }, 200);
            
            // If not in an active chat session, show customer info form directly
            if (!this.currentChatSession) {
              this.showCustomerInfoForm();
            } else if (document.getElementById('chat-interface').style.display !== 'none') {
              setTimeout(() => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) messageInput.focus();
                
                // Ensure messages are scrolled to bottom when opening chat
                const messagesContainer = document.getElementById('messages-container');
                utils.scrollToBottom(messagesContainer);
              }, 100);
            }
          }
        }
    
        incrementUnreadCount() { this.unreadCount++; this.updateUnreadBadge(); }
        resetUnreadCount() { this.unreadCount = 0; this.updateUnreadBadge(); }
    
        updateUnreadBadge() {
          const badge = document.getElementById('unread-badge');
          const count = document.getElementById('unread-count');
          if (this.unreadCount > 0) {
            badge.style.display = 'flex';
            count.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
          } else {
            badge.style.display = 'none';
          }
        }
    
        async loadChatHistory() {
          if (this.currentChatSession?.chatSessionId) {
            try {
              const response = await fetch(\`\${API_BASE}/public/chat/sessions/\${this.currentChatSession.chatSessionId}/messages\`);
              if (!response.ok) throw new Error('Failed to fetch history');
              const messages = await response.json();

              // reverse the array so that oldest messages appear first
              messages.reverse();
              
              // Clear existing messages before loading history
              const messagesContainer = document.getElementById('messages-container');
              messagesContainer.innerHTML = '';
              
              // Transform messages from history format to displayMessage format
              messages.forEach(message => {
                const transformedMessage = {
                  _id: message._id,
                  senderType: message.senderType.toLowerCase(), // Convert to lowercase
                  messageContent: {
                    text: message.content.text,
                    type: message.content.type || message.messageType.toLowerCase(),
                    url: \`\${API_BASE}\${message.content.url}\`,
                    filename: message.content.filename,
                    mimeType: message.content.mimeType
                  },
                  timestamp: message.timestamp,
                  readByAgent: message.readByAgent,
                  readByCustomer: message.readByCustomer,
                  agentInfo: message.agentInfo
                };
                
                this.displayMessage(transformedMessage);
              });
            } catch (error) {
              console.error('Failed to load chat history:', error);
            }
          }
        }

        // Auto-message functionality
        processAutoMessages() {
          console.log("Processing auto-messages...");
          if (!this.config.autoMessages || this.config.autoMessages.length === 0) {
            console.log("No auto-messages configured.");
            return null;
          }

          // Check for sitewide auto-message first (highest priority)
          const sitewideMessage = this.config.autoMessages.find(msg => msg.sitewide === true);
          if (sitewideMessage) {
            console.log("Showing sitewide auto-message:", sitewideMessage);
            return sitewideMessage;
          }

          console.log("Checking page-specific auto-messages...");

          // Check for path-specific auto-messages
          const currentPath = window.location.pathname;
          const currentFullUrl = window.location.href;
          
          for (const autoMessage of this.config.autoMessages) {
            if (autoMessage.pagePaths && autoMessage.pagePaths.length > 0) {
              // Check if current path matches any of the specified paths
              const pathMatches = autoMessage.pagePaths.some(path => {
                // Handle both relative paths and full URLs
                if (path.startsWith('http')) {
                  return currentFullUrl === path;
                } else {
                  return currentPath === path || currentPath.endsWith(path);
                }
              });
              
              if (pathMatches) {
                return autoMessage;
              }
            }
          }

          return null;
        }

        scheduleAutoMessage() {
          // Don't show auto-message if already shown or if there's an active chat session
          if (this.autoMessageShown || this.currentChatSession) {
            return;
          }

          const autoMessage = this.processAutoMessages();
          if (!autoMessage) {
            return;
          }

          const delaySeconds = autoMessage.showAfterSeconds || 0;
          
          // Wait for socket connection before showing auto-message
          const showAutoMessageWhenReady = () => {
            if (this.isConnected) {
              this.showAutoMessage(autoMessage);
            } else {
              // If not connected yet, wait a bit more and try again
              setTimeout(showAutoMessageWhenReady, 500);
            }
          };
          
          setTimeout(showAutoMessageWhenReady, delaySeconds * 1000);
        }

        showAutoMessage(autoMessage) {
          // Don't show if already shown or if user has started a chat
          if (this.autoMessageShown || this.currentChatSession) {
            return;
          }

          this.autoMessageShown = true;

          // Create a dummy agent message
          const autoMessageObj = this.createAutoMessage(autoMessage);
          
          // Open the widget and show chat interface
          this.isMinimized = false;
          this.chatWindow.style.display = 'flex';
          this.showChatInterface();
          
          // Ensure connection status is hidden since we're connected
          this.hideConnectionStatus();
          
          // Update agent status to show we're ready to chat
          this.showAgentStatus('Assistant is ready to help!');
          
          // Display the auto-message
          this.displayMessage(autoMessageObj);
          
          // Automatically initiate a chat session for seamless experience
          this.initiateAutoChat(autoMessage.message);
          
          // Scroll to bottom to ensure message is visible
          setTimeout(() => {
            const messagesContainer = document.getElementById('messages-container');
            utils.scrollToBottom(messagesContainer);
          }, 100);
        }

        createAutoMessage(autoMessage) {
          return {
            _id: \`auto_\${Date.now()}\`,
            senderType: 'agent',
            messageContent: {
              type: 'text',
              text: autoMessage.message
            },
            timestamp: new Date().toISOString(),
            readByAgent: true,
            readByCustomer: false,
            agentInfo: {
              name: 'Assistant',
              avatar: null
            },
            isAutoMessage: true
          };
        }

        initiateAutoChat(autoMessageText) {
          // Create a chat session automatically for auto-messages
          const chatData = {
            customerId: this.customerId,
            widgetId: WIDGET_ID,
            initialMessage: \`Auto-message shown: "\${autoMessageText}"\`,
            name: undefined,
            email: undefined,
            isAutoMessage: true
          };
          
          console.log("Initiating auto-chat session", chatData);
          this.socket.emit('customer:initiate_chat', chatData);
        }
      }
    
      // Initialize the widget
      window.ChatWidget = new ChatWidget();
    
    })();
    `;
  return widgetScript;
}
