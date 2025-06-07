import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Res,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { WidgetsService } from './widgets.service';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { Types } from 'mongoose';
import { CreateWidgetDto } from 'src/departments/dto/create-widget.dto';

@Controller('widgets')
export class WidgetsController {
  constructor(private readonly widgetsService: WidgetsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(
    @Body() createWidgetDto: CreateWidgetDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    return this.widgetsService.create(
      createWidgetDto,
      new Types.ObjectId(user.sub),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.widgetsService.findAll();
  }

  // Admin endpoint to get full config for a widget
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':widgetId/config')
  findOneForAdmin(@Param('widgetId') widgetId: string) {
    if (!Types.ObjectId.isValid(widgetId)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    return this.widgetsService.findById(widgetId);
  }

  // Public endpoint for widget script loader
  @Get(':widgetId/script.js')
  async getWidgetScript(
    @Param('widgetId') widgetId: string,
    @Res() res: Response,
  ) {
    if (!Types.ObjectId.isValid(widgetId)) {
      res.status(HttpStatus.BAD_REQUEST).send('Invalid widget ID format');
      return;
    }
    const widget = await this.widgetsService.findByIdPublic(widgetId);
    if (!widget) {
      res.status(HttpStatus.NOT_FOUND).send('Widget not found or not enabled.');
      return;
    }

    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

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
  const API_BASE = 'http://localhost:5000'
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
      this.container = document.createElement('div');
      this.container.id = 'chat-widget-container';
      this.container.className = 'fixed bottom-4 right-4 z-50 font-sans';
      
      this.createChatButton();
      this.createChatWindow();
      
      document.body.appendChild(this.container);
    }

    createChatButton() {
      const primaryColor = this.config.widgetConfig?.primaryColor || '#3B82F6';
      
      this.chatButton = document.createElement('div');
      this.chatButton.className = 'relative cursor-pointer transform transition-transform hover:scale-105';
      
      this.chatButton.innerHTML = \`
        <div class="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white relative" 
             style="background-color: \${primaryColor}">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
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
      const headerText = this.config.widgetConfig?.headerText || 'Chat with us';
      
      this.chatWindow = document.createElement('div');
      this.chatWindow.className = 'absolute bottom-16 right-0 w-80 h-96 bg-white rounded-lg shadow-2xl border hidden flex flex-col';
      
      this.chatWindow.innerHTML = \`
        <!-- Header -->
        <div class="flex items-center justify-between p-4 rounded-t-lg text-white" style="background-color: \${primaryColor}">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-green-400 rounded-full"></div>
            <span class="font-medium">\${utils.escapeHtml(headerText)}</span>
          </div>
          <button id="minimize-btn" class="text-white hover:text-gray-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Connection Status -->
        <div id="connection-status" class="px-4 py-2 bg-yellow-50 border-b text-sm text-yellow-800 hidden">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span>Connecting...</span>
          </div>
        </div>

        <!-- Department Selection -->
        <div id="department-selection" class="flex-1 p-4 flex flex-col">
          <div class="text-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">How can we help you?</h3>
            <p class="text-sm text-gray-600 mt-1">\${utils.escapeHtml(this.config.widgetConfig?.welcomeMessage || 'Choose a department to start chatting')}</p>
          </div>
          <div id="departments-list" class="space-y-2 overflow-y-auto">
            <!-- Departments will be populated here -->
          </div>
        </div>

        <!-- Chat Interface -->
        <div id="chat-interface" class="flex-1 flex flex-col hidden">
          <!-- Chat Header -->
          <div id="chat-header" class="px-4 py-2 border-b bg-gray-50 flex-shrink-0">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium text-sm" id="selected-department">Department</div>
                <div class="text-xs text-gray-500" id="agent-status">Connecting...</div>
              </div>
              <button id="back-to-departments" class="text-gray-400 hover:text-gray-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Messages Container -->
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

          <!-- Message Input -->
          <div class="border-t p-4 flex-shrink-0">
            <div class="flex space-x-2">
              <div class="flex-1 relative">
                <input type="text" id="message-input" 
                       placeholder="Type your message..." 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <input type="file" id="file-input" class="hidden" accept="image/*,.pdf,.doc,.docx,.txt">
                <button id="attach-btn" class="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                  </svg>
                </button>
              </div>
              <button id="send-btn" class="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity" 
                      style="background-color: \${primaryColor}">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Customer Info Form -->
        <div id="customer-info-form" class="flex-1 p-4 border-t hidden flex flex-col">
          <div class="space-y-3 flex flex-col flex-1">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
              <input type="text" id="customer-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <input type="email" id="customer-email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
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
      \`;
      
      this.container.appendChild(this.chatWindow);
    }

    bindEvents() {
      document.getElementById('minimize-btn').addEventListener('click', () => this.toggleChat());
      document.getElementById('back-to-departments').addEventListener('click', () => this.showDepartmentSelection());
      
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
      this.socket = io(SOCKET_URL);
      
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
        this.populateDepartments(data.departments);
        
        if (data.activeSession) {
          this.currentChatSession = data.activeSession;
          this.showChatInterface(data.activeSession.departmentId);
          this.loadChatHistory();
        }
      });

      this.socket.on('server:initiate_chat_ack', (data) => {
        console.log('Chat initiated:', data);
        this.currentChatSession = { chatSessionId: data.chatSessionId };
        this.showChatInterface();
      });

      this.socket.on('server:new_message', (message) => {
        this.displayMessage(message);
        if (this.isMinimized) {
          this.incrementUnreadCount();
        }
      });

      this.socket.on('server:agent_typing_start', () => this.showTypingIndicator());
      this.socket.on('server:agent_typing_stop', () => this.hideTypingIndicator());
      this.socket.on('server:no_agents_available_for_request', () => this.showAgentStatus('No agents available. We\\'ll respond soon.'));
      this.socket.on('server:chat_session_pending', () => this.showAgentStatus('Looking for an available agent...'));
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
      this.socket.emit('customer:connect_widget', connectData);
    }

    populateDepartments(departments) {
      const departmentsList = document.getElementById('departments-list');
      departmentsList.innerHTML = '';
      if (!departments || departments.length === 0) {
          departmentsList.innerHTML = '<p class="text-center text-gray-500 text-sm">No departments are available right now.</p>';
          return;
      }

      departments.forEach(dept => {
        const deptButton = document.createElement('button');
        deptButton.className = 'w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors';
        deptButton.innerHTML = \`<div class="font-medium text-gray-900">\${utils.escapeHtml(dept.name)}</div>\`;
        deptButton.addEventListener('click', () => this.selectDepartment(dept));
        departmentsList.appendChild(deptButton);
      });
    }

    selectDepartment(department) {
      this.selectedDepartment = department;
      document.getElementById('selected-department').textContent = department.name;
      this.showCustomerInfoForm();
    }

    showCustomerInfoForm() {
      document.getElementById('department-selection').classList.add('hidden');
      document.getElementById('customer-info-form').classList.remove('hidden');
      document.getElementById('customer-info-form').classList.add('flex');
    }

    showDepartmentSelection() {
      document.getElementById('chat-interface').classList.add('hidden');
      document.getElementById('customer-info-form').classList.add('hidden');
      document.getElementById('department-selection').classList.remove('hidden');
    }

    showChatInterface(departmentId = null) {
      document.getElementById('department-selection').classList.add('hidden');
      document.getElementById('customer-info-form').classList.add('hidden');
      
      const chatInterface = document.getElementById('chat-interface');
      chatInterface.classList.remove('hidden');
      chatInterface.classList.add('flex');
      
      if (departmentId && this.config.departments) {
        const dept = this.config.departments.find(d => d.id === departmentId);
        if (dept) {
          document.getElementById('selected-department').textContent = dept.name;
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

      const chatData = {
        customerId: this.customerId,
        widgetId: WIDGET_ID,
        departmentId: this.selectedDepartment.id,
        initialMessage: initialMessage,
        name: name || undefined,
        email: email || undefined
      };

      this.socket.emit('customer:initiate_chat', chatData);
      this.showChatInterface();
      this.showAgentStatus('Starting chat...');
    }

    sendMessage() {
      const messageInput = document.getElementById('message-input');
      const messageText = messageInput.value.trim();
      if (!messageText || !this.currentChatSession?.chatSessionId) return;

      const messageData = {
        chatSessionId: this.currentChatSession.chatSessionId,
        messageContent: { type: 'text', text: messageText }
      };

      // Display message immediately for better UX
      this.displayMessage({
        senderType: 'customer',
        messageContent: messageData.messageContent,
        timestamp: new Date()
      });
      
      this.socket.emit('customer:send_message', messageData);
      messageInput.value = '';
      this.stopTyping();
    }

    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file || !this.currentChatSession?.chatSessionId) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatSessionId', this.currentChatSession.chatSessionId);

      this.displayMessage({
        senderType: 'customer',
        messageContent: { text: \`Uploading \${file.name}...\` },
        timestamp: new Date(),
        isUploading: true
      });

      fetch(\`\${API_BASE}/chat/upload\`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) throw new Error('Upload failed');
        return response.json();
      })
      .then(data => {
        const messageData = {
          chatSessionId: this.currentChatSession.chatSessionId,
          messageContent: {
            type: 'file',
            url: data.url,
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type
          }
        };
        this.socket.emit('customer:send_message', messageData);
      })
      .catch(error => {
        console.error('File upload failed:', error);
        this.displayMessage({
          senderType: 'system',
          messageContent: { text: 'File upload failed. Please try again.' },
          timestamp: new Date()
        });
      });

      event.target.value = '';
    }

    displayMessage(message) {
      const messagesContainer = document.getElementById('messages-container');
      const messageDiv = document.createElement('div');
      
      const isCustomer = message.senderType === 'customer';
      const isSystem = message.senderType === 'system';
      
      messageDiv.className = \`flex \${isCustomer ? 'justify-end' : 'justify-start'}\`;
      
      let messageContent = '';
      if (message.messageContent.text) {
        messageContent = utils.escapeHtml(message.messageContent.text);
      } else if (message.messageContent.type === 'file') {
        const isImage = message.messageContent.mimeType?.startsWith('image/');
        messageContent = \`
          <div class="border rounded-lg p-2 max-w-full">
            \${isImage ? \`<img src="\${message.messageContent.url}" alt="\${utils.escapeHtml(message.messageContent.filename)}" class="max-w-48 rounded">\` : ''}
            <div class="flex items-center space-x-2 mt-1">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <a href="\${message.messageContent.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-sm truncate">
                \${utils.escapeHtml(message.messageContent.filename)}
              </a>
            </div>
          </div>
        \`;
      }
      
      messageDiv.innerHTML = \`
        <div class="max-w-xs lg:max-w-md px-3 py-2 rounded-lg \${
          isCustomer 
            ? 'bg-blue-500 text-white' 
            : isSystem 
              ? 'bg-gray-100 text-gray-700 text-sm text-center w-full' 
              : 'bg-gray-200 text-gray-900'
        } \${message.isUploading ? 'opacity-50' : ''}">
          <div>\${messageContent}</div>
          <div class="text-xs text-right mt-1 \${isCustomer ? 'text-blue-100' : 'text-gray-500'}">
            \${utils.formatTime(message.timestamp)}
          </div>
        </div>
      \`;
      
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

    showTypingIndicator() { document.getElementById('typing-indicator').classList.remove('hidden'); }
    hideTypingIndicator() { document.getElementById('typing-indicator').classList.add('hidden'); }
    showAgentStatus(status) { document.getElementById('agent-status').textContent = status; }

    showConnectionStatus(message, type = 'yellow') {
      const statusEl = document.getElementById('connection-status');
      statusEl.classList.remove('hidden');
      statusEl.querySelector('span').textContent = message;
      statusEl.className = \`px-4 py-2 border-b text-sm \${
        type === 'red' ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
      }\`;
    }

    hideConnectionStatus() { document.getElementById('connection-status').classList.add('hidden'); }

    toggleChat() {
      this.isMinimized = !this.isMinimized;
      this.chatWindow.classList.toggle('hidden', this.isMinimized);
      if (!this.isMinimized) {
        this.resetUnreadCount();
        if (!document.getElementById('chat-interface').classList.contains('hidden')) {
          setTimeout(() => document.getElementById('message-input')?.focus(), 100);
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
          const response = await fetch(\`\${API_BASE}/chat/sessions/\${this.currentChatSession.chatSessionId}/messages\`);
          if (!response.ok) throw new Error('Failed to fetch history');
          const messages = await response.json();
          messages.forEach(message => this.displayMessage(message));
        } catch (error) {
          console.error('Failed to load chat history:', error);
        }
      }
    }
  }

  // Initialize the widget
  window.ChatWidget = new ChatWidget();

})();
`;

    res.send(widgetScript);
  }

  // Public endpoint for widget configuration (JSON)
  @Get(':widgetId/public-config')
  async getWidgetPublicConfig(
    @Param('widgetId') widgetId: string,
    @Res() res: Response,
  ) {
    if (!Types.ObjectId.isValid(widgetId)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    const widgetPublicData = await this.widgetsService.findByIdPublic(widgetId);
    if (!widgetPublicData) {
      throw new NotFoundException('Widget not found or not enabled.');
    }

    // Expose only necessary fields for the public widget script
    const publicConfig = {
      widgetId: widgetPublicData._id?.toString() ?? '',
      name: widgetPublicData.name,
      departments: (widgetPublicData.departmentIds ?? []).map((dep: any) => ({
        id: dep._id.toString(),
        name: dep.name,
      })), // Assuming departmentIds is populated
      widgetConfig: {
        primaryColor: widgetPublicData.primaryColor,
        welcomeMessage: widgetPublicData.welcomeMessage,
        headerText: widgetPublicData.headerText,
      },
      // Add socket endpoint, etc.
      socketUrl: '/', // Or your specific WebSocket server URL
      socketNamespace: '/chat',
    };
    return res.status(HttpStatus.OK).json(publicConfig);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id') // This can be the same as :widgetId/config if you prefer to have one endpoint for admin
  findOne(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    return this.widgetsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateWidgetDto: UpdateWidgetDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    return this.widgetsService.update(id, updateWidgetDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    return this.widgetsService.remove(id);
  }
}
