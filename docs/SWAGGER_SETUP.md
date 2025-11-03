# Swagger API Documentation Setup Guide

## Overview

This guide explains how the Swagger documentation is set up in the Live Chat Application and how to extend it.

## Current Implementation

### 1. Main Configuration (`src/main.ts`)

The Swagger documentation is configured in the main application bootstrap:

```typescript
const config = new DocumentBuilder()
  .setTitle('Live Chat Application API')
  .setDescription('A comprehensive real-time chat system...')
  .setVersion('1.0')
  .setContact(
    'Development Team',
    'https://github.com/your-repo',
    'dev@yourcompany.com',
  )
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .addTag('Authentication', 'User authentication and authorization endpoints')
  .addTag('Agents', 'Agent management and profile operations')
  .addTag('Chat', 'Real-time chat sessions and message management')
  .addTag('Departments', 'Department management and organization')
  .addTag('Widgets', 'Embeddable chat widget configuration and deployment')
  .addTag('Users', 'User management and profile operations')
  .addTag('Appointments', 'Appointment scheduling and management')
  .build();
```

### 2. Common Response DTOs (`src/shared/dto/common-responses.dto.ts`)

Standardized response schemas for consistent API documentation:

- `ApiResponseDto<T>` - Generic API response wrapper
- `PaginatedResponseDto<T>` - Paginated response format
- `ErrorResponseDto` - Error response format
- `UnauthorizedResponseDto` - 401 error format
- `ForbiddenResponseDto` - 403 error format
- `NotFoundResponseDto` - 404 error format
- `SuccessMessageResponseDto` - Simple success message

### 3. Module-Specific Response DTOs

Each module has its own response DTOs:

- `src/auth/dto/auth-responses.dto.ts`
- `src/agents/dto/agent-responses.dto.ts`
- `src/chat/dto/chat-responses.dto.ts`
- `src/widgets/dto/widget-responses.dto.ts`

### 4. Controller Documentation

Controllers are documented with:

```typescript
@ApiTags('ModuleName')
@ApiBearerAuth('JWT-auth')
@Controller('endpoint')
export class ExampleController {
  @Get()
  @ApiOperation({
    summary: 'Brief description',
    description: 'Detailed description',
  })
  @ApiResponse({
    status: 200,
    description: 'Success response description',
    type: ResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  async getExample() {
    // Implementation
  }
}
```

### 5. DTO Documentation

DTOs are enhanced with `@ApiProperty` decorators:

```typescript
export class ExampleDto {
  @ApiProperty({
    description: 'Field description',
    example: 'example value',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  field?: string;
}
```

## Accessing Documentation

Once the application is running, access the Swagger UI at:

- **Local Development**: `http://localhost:5000/api/docs`
- **Production**: `https://your-domain.com/api/docs`

## Features Implemented

### ✅ Completed Features

1. **Authentication Integration**

   - JWT Bearer token authentication
   - Login/logout flow documentation
   - Role-based access control documentation

2. **Comprehensive Endpoint Documentation**

   - All REST endpoints documented
   - Request/response schemas
   - Error response documentation
   - Parameter validation documentation

3. **Interactive Testing**

   - Try-it-out functionality
   - Authentication persistence
   - Real request/response examples

4. **Organized Structure**

   - Logical grouping by tags
   - Consistent naming conventions
   - Detailed descriptions

5. **Response Schema Documentation**
   - Standardized response formats
   - Pagination documentation
   - Error handling documentation

### 🔄 Partially Implemented

1. **WebSocket Documentation**

   - Socket.IO events are documented in markdown
   - Could be enhanced with OpenAPI 3.0 WebSocket support

2. **File Upload Documentation**
   - Basic documentation present
   - Could add more detailed examples

## Extending Documentation

### Adding New Endpoints

1. **Create Response DTOs**:

```typescript
// src/module/dto/module-responses.dto.ts
export class NewFeatureResponseDto {
  @ApiProperty({
    description: 'Description',
    example: 'example',
  })
  field: string;
}
```

2. **Document Controller**:

```typescript
@ApiTags('ModuleName')
@Controller('module')
export class ModuleController {
  @Post('new-feature')
  @ApiOperation({
    summary: 'Create new feature',
    description: 'Detailed description of what this endpoint does',
  })
  @ApiResponse({
    status: 201,
    description: 'Feature created successfully',
    type: NewFeatureResponseDto,
  })
  async createFeature() {
    // Implementation
  }
}
```

3. **Update DTOs**:

```typescript
export class CreateFeatureDto {
  @ApiProperty({
    description: 'Feature name',
    example: 'My Feature',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
```

### Adding New Tags

Update the main configuration in `src/main.ts`:

```typescript
.addTag('NewModule', 'Description of the new module functionality')
```

### Custom Response Examples

Add custom examples to responses:

```typescript
@ApiResponse({
  status: 200,
  description: 'Success',
  schema: {
    example: {
      success: true,
      data: {
        id: '507f1f77bcf86cd799439011',
        name: 'Example'
      }
    }
  }
})
```

## Best Practices

### 1. Consistent Naming

- Use descriptive operation summaries
- Follow REST conventions in descriptions
- Use consistent terminology across modules

### 2. Comprehensive Examples

- Provide realistic example data
- Include edge cases in examples
- Use consistent ID formats (MongoDB ObjectId)

### 3. Error Documentation

- Document all possible error responses
- Include validation error examples
- Provide clear error descriptions

### 4. Security Documentation

- Document authentication requirements
- Specify required roles/permissions
- Include security examples

### 5. Response Schema Consistency

- Use common response DTOs where possible
- Maintain consistent field naming
- Document optional vs required fields

## Troubleshooting

### Common Issues

1. **Missing Types**: Ensure all DTOs are properly imported and exported
2. **Authentication Not Working**: Check JWT-auth name matches in decorators
3. **Examples Not Showing**: Verify example data format matches schema
4. **Tags Not Grouping**: Ensure consistent tag names across controllers

### Debugging Tips

1. Check browser console for Swagger UI errors
2. Verify DTO decorators are properly applied
3. Test endpoints manually to ensure they work
4. Check that all imports are correct

## Future Enhancements

### Potential Improvements

1. **OpenAPI 3.1 Support**

   - Upgrade to latest OpenAPI specification
   - Enhanced schema validation

2. **WebSocket Documentation**

   - Add AsyncAPI specification for WebSocket events
   - Document real-time event schemas

3. **API Versioning**

   - Implement API versioning strategy
   - Document version differences

4. **Enhanced Examples**

   - Add more comprehensive request/response examples
   - Include common use case scenarios

5. **Performance Documentation**
   - Add rate limiting documentation
   - Document caching strategies

## Maintenance

### Regular Tasks

1. **Keep Documentation Updated**

   - Update when adding new endpoints
   - Maintain accurate examples
   - Update descriptions when functionality changes

2. **Review and Improve**

   - Regularly review documentation quality
   - Gather feedback from API consumers
   - Improve based on common questions

3. **Version Management**
   - Update version numbers for significant changes
   - Maintain changelog in documentation
   - Document breaking changes clearly
