import { ApiProperty } from '@nestjs/swagger';

export class WidgetResponseDto {
  @ApiProperty({
    description: 'Widget unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Widget name for identification',
    example: 'Main Website Chat Widget',
  })
  name: string;

  @ApiProperty({
    description: 'Array of domains where this widget can be embedded',
    type: [String],
    example: ['example.com', 'www.example.com'],
  })
  domains: string[];

  @ApiProperty({
    description:
      'Array of department information that this widget can route chats to',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
        name: { type: 'string', example: 'Technical Support' },
      },
    },
  })
  departmentIds: Array<{
    _id: string;
    name: string;
  }>;

  @ApiProperty({
    description: 'Whether the widget is enabled and can be used',
    example: true,
  })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Primary color for the widget theme (hex color)',
    example: '#3b82f6',
  })
  primaryColor: string;

  @ApiProperty({
    description: 'Welcome message displayed when chat widget opens',
    example: 'Hello! How can we help you today?',
  })
  welcomeMessage: string;

  @ApiProperty({
    description: 'Header text displayed in the chat widget',
    example: 'Customer Support',
  })
  headerText: string;

  @ApiProperty({
    description: 'Admin ID who created this widget',
    example: '507f1f77bcf86cd799439013',
  })
  adminId: string;

  @ApiProperty({
    description: 'Widget creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Widget last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: string;
}

export class WidgetPublicConfigResponseDto {
  @ApiProperty({
    description: 'Widget unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  widgetId: string;

  @ApiProperty({
    description: 'Widget name',
    example: 'Main Website Chat Widget',
  })
  name: string;

  @ApiProperty({
    description: 'Available departments for chat routing',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '507f1f77bcf86cd799439012' },
        name: { type: 'string', example: 'Technical Support' },
      },
    },
  })
  departments: Array<{
    id: string;
    name: string;
  }>;

  @ApiProperty({
    description: 'Widget configuration settings',
    type: 'object',
    properties: {
      primaryColor: { type: 'string', example: '#3b82f6' },
      welcomeMessage: {
        type: 'string',
        example: 'Hello! How can we help you today?',
      },
      headerText: { type: 'string', example: 'Customer Support' },
    },
  })
  widgetConfig: {
    primaryColor: string;
    welcomeMessage: string;
    headerText: string;
  };

  @ApiProperty({
    description: 'Socket.IO server URL for real-time communication',
    example: '/',
  })
  socketUrl: string;

  @ApiProperty({
    description: 'Socket.IO namespace for chat communication',
    example: '/chat',
  })
  socketNamespace: string;
}

export class WidgetScriptResponseDto {
  @ApiProperty({
    description: 'JavaScript code for embedding the chat widget',
    example: '(function(){/* Widget script code */})();',
  })
  script: string;
}
