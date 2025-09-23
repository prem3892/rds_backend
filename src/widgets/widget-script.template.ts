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
        
        // Get positioning classes based on button_location
        getPositionClasses(buttonLocation) {
          const location = buttonLocation || 'bottom_right';
          
          switch (location) {
            case 'bottom_left':
              return {
                container: 'fixed bottom-8 left-8 font-sans',
                chatWindow: 'absolute bottom-16 left-0 w-80 max-h-[80vh] rounded-lg shadow-2xl border hidden flex flex-col'
              };
            case 'bottom_right':
              return {
                container: 'fixed bottom-8 right-8 font-sans',
                chatWindow: 'absolute bottom-16 right-0 w-80 max-h-[80vh] rounded-lg shadow-2xl border hidden flex flex-col'
              };
            case 'top_left':
              return {
                container: 'fixed top-8 left-8 font-sans',
                chatWindow: 'absolute top-16 left-0 w-80 max-h-[80vh] rounded-lg shadow-2xl border hidden flex flex-col'
              };
            case 'top_right':
              return {
                container: 'fixed top-8 right-8 font-sans',
                chatWindow: 'absolute top-16 right-0 w-80 max-h-[80vh] rounded-lg shadow-2xl border hidden flex flex-col'
              };
            default:
              // Default to bottom_right
              return {
                container: 'fixed bottom-8 right-8 font-sans',
                chatWindow: 'absolute bottom-16 right-0 w-80 max-h-[80vh] rounded-lg shadow-2xl border hidden flex flex-col'
              };
          }
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
            // Using Tailwind via a script tag can be slow and might conflict with the host page.
            // A better long-term solution is to use a scoped CSS build.
            await this.loadTailwindCSS(); 
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
    
        async loadTailwindCSS() {
          return new Promise((resolve, reject) => {
            if (document.querySelector('script[src*="tailwindcss.com"]')) {
              resolve();
              return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.tailwindcss.com';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
    
        createUI() {
          const buttonLocation = this.config.widgetConfig?.button_location || 'bottom_right';
          const positionClasses = utils.getPositionClasses(buttonLocation);
          
          this.container = document.createElement('div');
          this.container.id = 'chat-widget-container';
          this.container.className = positionClasses.container;
          // Ensure maximum z-index to stay on top of everything
          this.container.style.zIndex = '2147483647'; // Maximum 32-bit integer value
          
          this.createChatButton();
          this.createChatWindow();
          
          document.body.appendChild(this.container);
        }
    
        createChatButton() {
          const primaryColor = this.config.widgetConfig?.primaryColor || '#3B82F6';
          const buttonLabel = this.config.widgetConfig?.button_label || 'Chat with us';
          const textColor = this.config.widgetConfig?.widget_text_color || '#FFFFFF';
          
          this.chatButton = document.createElement('div');
          this.chatButton.className = 'relative cursor-pointer transform transition-transform hover:scale-105';
          
          this.chatButton.innerHTML = \`
            <div class="px-4 py-3 rounded-full shadow-lg flex items-center justify-center relative min-w-max" 
                 style="background-color: \${primaryColor}; color: \${textColor};">
              <span class="font-medium text-sm whitespace-nowrap">\${utils.escapeHtml(buttonLabel)}</span>
              <div id="unread-badge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hidden">
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
          const positionClasses = utils.getPositionClasses(buttonLocation);
          
          this.chatWindow = document.createElement('div');
          // Fixed height and width, added max-height to ensure it fits on smaller screens
          this.chatWindow.className = positionClasses.chatWindow;
          this.chatWindow.style.backgroundColor = bgColorWithOpacity;
          
          this.chatWindow.innerHTML = \`
            <!-- Header -->
            <div class="p-4 rounded-t-lg text-white flex-shrink-0" style="background-color: \${primaryColor}">
              <!-- Header Row -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2 flex-1 justify-center">
                  <span class="font-medium">\${utils.escapeHtml(headerText)}</span>
                </div>
                <button id="minimize-btn" class="text-white hover:text-gray-200 absolute top-4 right-4">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <!-- Agent Profiles Row -->
              <div id="agent-profiles" class="flex items-center justify-center space-x-3"></div>
            </div>
    
            <!-- Connection Status -->
            <div id="connection-status" class="px-4 py-2 bg-yellow-50 border-b text-sm text-yellow-800 hidden flex-shrink-0">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span>Connecting...</span>
              </div>
            </div>
    
            <!-- Chat Interface -->
            <div id="chat-interface" class="flex-1 flex flex-col hidden overflow-hidden">
              <!-- Chat Header -->
              <div id="chat-header" class="px-4 py-2 border-b bg-white flex-shrink-0">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs text-gray-500" id="agent-status">Connecting...</div>
                  </div>
                </div>
              </div>
    
              <!-- Messages Container - Fixed height issue with overflow -->
              <div id="messages-container" class="flex-1 overflow-y-auto p-4 space-y-3">
                <!-- Messages will be populated here -->
              </div>
    
              <!-- Typing Indicator -->
              <div id="typing-indicator" class="px-4 py-2 text-sm text-gray-500 hidden flex-shrink-0">
                <div class="flex items-center space-x-2">
                  <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                  </div>
                  <span>Agent is typing...</span>
                </div>
              </div>
    
              <!-- Message Input - Fixed to bottom -->
              <div class="border-t p-4 flex-shrink-0 bg-white">
                <div class="flex space-x-2">
                  <div class="flex-1 relative">
                    <input type="text" id="message-input" 
                           placeholder="Type your message..." 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <input type="file" id="file-input" class="hidden" accept="image/*,.pdf,.doc,.docx,.txt">
                    <button id="attach-btn" class="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                    </button>
                  </div>
                  <button id="send-btn" class="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity" 
                          style="background-color: \${primaryColor}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
    
            <!-- Customer Info Form -->
            <div id="customer-info-form" class="flex-1 p-4 border-t hidden flex flex-col overflow-y-auto bg-white">
              <div class="space-y-3 flex flex-col flex-1">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                  <input style="color: black;" type="text" id="customer-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                  <input  style="color: black;" type="email" id="customer-email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div class="flex-1 flex flex-col">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea id="initial-message" rows="3" class="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="How can we help you?"></textarea>
                </div>
                <button id="start-chat-btn" class="w-full py-2 text-white rounded-lg hover:opacity-90 transition-opacity" 
                        style="background-color: \${primaryColor}">
                  Start Chat
                </button>
              </div>
            </div>
            
            <!-- Offline Thank You Message -->
            <div id="offline-thank-you" class="flex-1 p-4 border-t hidden flex flex-col overflow-y-auto bg-white">
              <div class="space-y-3 flex flex-col flex-1 items-center justify-center text-center">
                <svg class="w-16 h-16 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 class="text-xl font-medium text-gray-900">Thank you!</h3>
                <p class="text-gray-600">We will get back to you via the email you provided.</p>
                <button id="close-thank-you-btn" class="mt-4 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity" 
                        style="background-color: \${primaryColor}">
                  Close
                </button>
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
          document.getElementById('chat-interface').classList.add('hidden');
          document.getElementById('customer-info-form').classList.remove('hidden');
          document.getElementById('customer-info-form').classList.add('flex');
        }
    
        showDepartmentSelection() {
          document.getElementById('chat-interface').classList.add('hidden');
          document.getElementById('customer-info-form').classList.remove('hidden');
          document.getElementById('customer-info-form').classList.add('flex');
        }
    
        showChatInterface(departmentId = null) {
          document.getElementById('customer-info-form').classList.add('hidden');
          
          const chatInterface = document.getElementById('chat-interface');
          chatInterface.classList.remove('hidden');
          chatInterface.classList.add('flex');
          
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
          const submitBtn = nameInput.closest('.space-y-3').querySelector('button');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitted';
            submitBtn.style.opacity = '0.5';
          }
        }
    
        updateHeaderText(agentsAvailable) {
          // Target only the header text in the chat window, not the button text
          const headerTextElement = document.querySelector('#chat-widget-container .p-4.rounded-t-lg .font-medium');
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
              emailLabel.innerHTML = 'Email <span class="text-red-500">*</span>';
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
            agentProfile.className = 'flex flex-col items-center space-y-1';
            
            // Create profile picture container with relative positioning for status dot
            const profilePicContainer = document.createElement('div');
            profilePicContainer.className = 'relative';
            
            // Create profile picture
            if (agent.profilePicture) {
              const profileImg = document.createElement('img');
              profileImg.src = \`\${API_BASE}\${agent.profilePicture}\`;
              profileImg.className = 'w-12 h-12 rounded-full border-2 border-white object-cover';
              profileImg.alt = 'Agent';
              
              // Add error handling for broken images
              profileImg.onerror = function() {
                // If image fails, show a default avatar
                this.style.display = 'none';
                const defaultAvatar = document.createElement('div');
                defaultAvatar.className = 'w-8 h-8 rounded-full border-2 border-white bg-white bg-opacity-20 flex items-center justify-center';
                defaultAvatar.innerHTML = '<span class="text-xs font-medium">A</span>';
                profilePicContainer.insertBefore(defaultAvatar, profilePicContainer.firstChild);
              };
              
              profilePicContainer.appendChild(profileImg);
            } else {
              // Show default avatar if no profile picture
              const defaultAvatar = document.createElement('div');
              defaultAvatar.className = 'w-8 h-8 rounded-full border-2 border-white bg-white bg-opacity-20 flex items-center justify-center';
              defaultAvatar.innerHTML = '<span class="text-xs font-medium">A</span>';
              profilePicContainer.appendChild(defaultAvatar);
            }
            
            // Add green status dot at bottom right
            const statusDot = document.createElement('div');
            statusDot.className = 'w-2 h-2 bg-green-400 rounded-full absolute -bottom-0 -right-0';
            profilePicContainer.appendChild(statusDot);
            
            agentProfile.appendChild(profilePicContainer);
            
            // Create name label
            const nameLabel = document.createElement('span');
            nameLabel.className = 'text-xs font-medium text-white opacity-90';
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
            if (!thankYouDiv.classList.contains('hidden') && this.currentChatSession) {
              this.showChatInterface();
              this.showAgentStatus('An agent is now available!');
              // remove the thankYouDiv from DOM
              thankYouDiv.classList.add('hidden');
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
          document.getElementById('customer-info-form').classList.add('hidden');
          document.getElementById('chat-interface').classList.add('hidden');
          
          // Show thank you message
          const thankYouDiv = document.getElementById('offline-thank-you');
          thankYouDiv.classList.remove('hidden');
          thankYouDiv.classList.add('flex');
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
          
          messageDiv.className = \`flex \${isCustomer ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'}\`;
          
          // Add message ID and sender type as data attributes for status updates
          if (message._id) {
            messageDiv.setAttribute('data-message-id', message._id);
          }
          messageDiv.setAttribute('data-sender-type', message.senderType);
          
          let messageContent = '';
          if (message.messageContent.type === 'customer_info_form') {
            const primaryColor = this.config.widgetConfig?.primaryColor || '#3B82F6';
            const formId = message.messageContent.formId || message._id;
            messageContent = \`
              <div class="space-y-3">
                <div class="text-sm text-gray-700 mb-3">\${utils.escapeHtml(message.messageContent.text)}</div>
                <div class="space-y-2">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                    <input type="text" id="info-request-name-\${formId}" class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" required>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input type="email" id="info-request-email-\${formId}" class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" required>
                  </div>
                  <div class="flex space-x-2 mt-3">
                    <button id="submit-info-request-\${formId}" class="flex-1 py-1 px-3 text-xs text-white rounded hover:opacity-90 transition-opacity" 
                            style="background-color: \${primaryColor}">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            \`;
          } else if (message.messageContent.text) {
            messageContent = utils.escapeHtml(message.messageContent.text);
          } else if (message.messageContent.type === 'file') {
            const isImage = message.messageContent.mimeType?.startsWith('image/');
            messageContent = \`
              <div class="border rounded-lg p-2 max-w-full">
                \${isImage ? \`<img src="\${message.messageContent.url}" alt="\${utils.escapeHtml(message.messageContent.filename)}" class="max-w-48 rounded">\` : ''}
                <div class="flex items-center space-x-2 mt-1">
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <a href="\${message.messageContent.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-sm truncate">
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
              <div class="message-status ml-2 flex items-center">
                <span class="text-xs text-blue-200">\${isRead ? 'Seen' : 'Sent'}</span>
              </div>
            \`;
          } else if (isCustomer && isPending) {
            statusIndicator = \`
              <div class="message-status ml-2 flex items-center">
                <span class="text-xs text-blue-200">Sending...</span>
              </div>
            \`;
          }
          
          // Special styling for customer info form
          const isInfoForm = message.messageContent.type === 'customer_info_form';
          const maxWidthClass = isInfoForm ? 'max-w-sm lg:max-w-md' : 'max-w-xs lg:max-w-md';
          
          // Check if this is an agent message (not customer, not system)
          const isAgent = !isCustomer && !isSystem;
          
          messageDiv.innerHTML = \`
            <div class="flex flex-col">
              <div class="\${maxWidthClass} px-3 py-2 rounded-lg \${
                isCustomer 
                  ? 'text-white' 
                  : isSystem 
                    ? isInfoForm 
                      ? 'bg-blue-50 border border-blue-200 text-gray-800 w-full' 
                      : 'bg-gray-100 text-gray-700 text-sm text-center w-full'
                    : 'text-white'
              } \${message.isUploading || isPending ? 'opacity-50' : ''}" \${
                isCustomer 
                  ? \`style="background-color: \${primaryColor}"\`
                  : !isSystem 
                    ? \`style="background-color: \${secondaryColor}"\`
                    : ''
              }>
                <div>\${messageContent}</div>
                \${!isInfoForm ? \`<div class="text-xs text-right mt-1 \${isCustomer ? 'text-blue-100' : isSystem ? 'text-gray-500' : 'text-gray-200'} flex items-center justify-end">
                  <span>\${utils.formatTime(message.timestamp)}</span>
                  \${statusIndicator}
                </div>\` : ''}
              </div>
              \${isAgent && message.agentInfo?.fullName ? \`<div class="text-xs text-gray-500 mt-1 ml-1">\${utils.escapeHtml(message.agentInfo.fullName)}</div>\` : ''}
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
          document.getElementById('typing-indicator').classList.remove('hidden'); 
          // Scroll to bottom when typing indicator appears
          const messagesContainer = document.getElementById('messages-container');
          utils.scrollToBottom(messagesContainer);
        }
        
        hideTypingIndicator() { document.getElementById('typing-indicator').classList.add('hidden'); }
        showAgentStatus(status) { document.getElementById('agent-status').textContent = status; }
    
        showConnectionStatus(message, type = 'yellow') {
          const statusEl = document.getElementById('connection-status');
          statusEl.classList.remove('hidden');
          statusEl.querySelector('span').textContent = message;
          statusEl.className = \`px-4 py-2 border-b text-sm flex-shrink-0 \${
            type === 'red' ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
          }\`;
        }
    
        hideConnectionStatus() { document.getElementById('connection-status').classList.add('hidden'); }
    
        // Message management methods
        addPendingMessage(messageText) {
          this.pendingMessages.add(messageText);
        }
        
        removePendingMessage(messageText) {
          this.pendingMessages.delete(messageText);
          // Remove pending message from UI
          const messagesContainer = document.getElementById('messages-container');
          const messageElements = messagesContainer.querySelectorAll('.flex');
          
          messageElements.forEach(element => {
            const messageDiv = element.querySelector('div');
            if (messageDiv && messageDiv.classList.contains('opacity-50')) {
              const textContent = messageDiv.querySelector('div').textContent;
              if (textContent === messageText) {
                element.remove();
              }
            }
          });
        }
        
        updateMessageStatus(messageId, status) {
          console.log('Updating message status:', messageId, status);
          const messageElement = document.querySelector(\`[data-message-id="\${messageId}"]\`);
          
          if (messageElement) {
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
          this.chatWindow.classList.toggle('hidden', this.isMinimized);
          if (!this.isMinimized) {
            this.resetUnreadCount();
            
            // Mark visible agent messages as read when chat is opened
            setTimeout(() => {
              this.markVisibleMessagesAsRead();
            }, 200);
            
            // If not in an active chat session, show customer info form directly
            if (!this.currentChatSession) {
              this.showCustomerInfoForm();
            } else if (!document.getElementById('chat-interface').classList.contains('hidden')) {
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
            badge.classList.remove('hidden');
            count.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
          } else {
            badge.classList.add('hidden');
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
          this.chatWindow.classList.remove('hidden');
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
