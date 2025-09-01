# Widgets Module API Documentation (`/widgets`)

This module handles chat widget management, configuration, and public widget script delivery for embedding chat functionality on external websites.

## Table of Contents

1. [Create Widget](#1-create-widget)
2. [Get All Widgets](#2-get-all-widgets)
3. [Get Widget Configuration (Admin)](#3-get-widget-configuration-admin)
4. [Get Widget by ID (Admin)](#4-get-widget-by-id-admin)
5. [Update Widget](#5-update-widget)
6. [Delete Widget](#6-delete-widget)
7. [Get Widget Script (Public)](#7-get-widget-script-public)
8. [Get Widget Public Configuration](#8-get-widget-public-configuration)
9. [Widget Integration Guide](#widget-integration-guide)

---

## 1. Create Widget

- **Endpoint**: `POST /widgets`
- **Description**: Creates a new chat widget with specified configuration. Only administrators can create widgets.
- **Authentication**: JWT Bearer Token required (UserRole: `ADMIN`)
- **Request Body**: `CreateWidgetDto`
  - `name` (string, required): The name/title of the widget.
  - `domains` (string[], optional): Array of allowed domains where the widget can be embedded. If empty, widget can be embedded on any domain.
  - `departmentIds` (string[], optional): Array of MongoDB ObjectIds referencing departments that this widget should connect to.
  - `isEnabled` (boolean, optional): Whether the widget is active and can be used. Defaults to `true`.
  - `primaryColor` (string, optional): Hex color code for the widget's primary color theme (e.g., "#3B82F6").
  - `welcomeMessage` (string, optional): Custom welcome message displayed to users.
  - `headerText` (string, optional): Custom text displayed in the widget header.

### Example Request:

```json
{
  "name": "Customer Support Widget",
  "domains": ["example.com", "www.example.com"],
  "departmentIds": ["60c72b2f9b1e8a001c8e4d8b", "60c72b3f9b1e8a001c8e4d8c"],
  "isEnabled": true,
  "primaryColor": "#3B82F6",
  "welcomeMessage": "Welcome! How can we help you today?",
  "headerText": "Customer Support"
}
```

### Success Response (201 Created):

- `_id` (string): The unique identifier of the created widget.
- `name` (string): The widget name.
- `domains` (string[]): Array of allowed domains.
- `departmentIds` (object[]): Array of populated department objects.
- `injectableScriptUrl` (string): The URL to embed this widget on external sites.
- `isEnabled` (boolean): Widget activation status.
- `primaryColor` (string): Widget primary color.
- `welcomeMessage` (string): Welcome message.
- `headerText` (string): Header text.
- `createdBy` (string): ID of the admin who created the widget.
- `createdAt` (string, ISO 8601 Date): Widget creation timestamp.
- `updatedAt` (string, ISO 8601 Date): Last update timestamp.

### Example Success Response:

```json
{
  "_id": "60c72b4f9b1e8a001c8e4d8d",
  "name": "Customer Support Widget",
  "domains": ["example.com", "www.example.com"],
  "departmentIds": [
    {
      "_id": "60c72b2f9b1e8a001c8e4d8b",
      "name": "Technical Support"
    },
    {
      "_id": "60c72b3f9b1e8a001c8e4d8c",
      "name": "Sales"
    }
  ],
  "injectableScriptUrl": "https://yourdomain.com/widgets/60c72b4f9b1e8a001c8e4d8d/script.js",
  "isEnabled": true,
  "primaryColor": "#3B82F6",
  "welcomeMessage": "Welcome! How can we help you today?",
  "headerText": "Customer Support",
  "createdBy": "60c72b1f9b1e8a001c8e4d8a",
  "createdAt": "2023-10-27T10:15:00.000Z",
  "updatedAt": "2023-10-27T10:15:00.000Z"
}
```

### Error Responses:

- `401 Unauthorized`: If JWT is missing or invalid.
- `403 Forbidden`: If the authenticated user does not have the `ADMIN` role.
- `400 Bad Request`: If request body validation fails or department IDs are invalid.

---

## 2. Get All Widgets

- **Endpoint**: `GET /widgets`
- **Description**: Retrieves all widgets with their configurations and associated departments. Only administrators can access this endpoint.
- **Authentication**: JWT Bearer Token required (UserRole: `ADMIN`)

### Success Response (200 OK):

Array of widget objects with populated department information.

### Example Success Response:

```json
[
  {
    "_id": "60c72b4f9b1e8a001c8e4d8d",
    "name": "Customer Support Widget",
    "domains": ["example.com"],
    "departmentIds": [
      {
        "_id": "60c72b2f9b1e8a001c8e4d8b",
        "name": "Technical Support"
      }
    ],
    "injectableScriptUrl": "https://yourdomain.com/widgets/60c72b4f9b1e8a001c8e4d8d/script.js",
    "isEnabled": true,
    "primaryColor": "#3B82F6",
    "welcomeMessage": "Welcome! How can we help you today?",
    "headerText": "Customer Support",
    "createdBy": "60c72b1f9b1e8a001c8e4d8a",
    "createdAt": "2023-10-27T10:15:00.000Z",
    "updatedAt": "2023-10-27T10:15:00.000Z"
  }
]
```

### Error Responses:

- `401 Unauthorized`: If JWT is missing or invalid.
- `403 Forbidden`: If the authenticated user does not have the `ADMIN` role.

---

## 3. Get Widget Configuration (Admin)

- **Endpoint**: `GET /widgets/:widgetId/config`
- **Description**: Retrieves the complete configuration of a specific widget. Only administrators can access this endpoint.
- **Authentication**: JWT Bearer Token required (UserRole: `ADMIN`)

### Path Parameters:

- `widgetId` (string, required): MongoDB ObjectId of the widget.

### Success Response (200 OK):

Complete widget object with populated departments.

### Example Success Response:

Same structure as the create widget response.

### Error Responses:

- `401 Unauthorized`: If JWT is missing or invalid.
- `403 Forbidden`: If the authenticated user does not have the `ADMIN` role.
- `400 Bad Request`: If widget ID format is invalid.
- `404 Not Found`: If widget with the specified ID doesn't exist.

---

## 4. Get Widget by ID (Admin)

- **Endpoint**: `GET /widgets/:id`
- **Description**: Alternative endpoint to retrieve a specific widget by ID. Only administrators can access this endpoint.
- **Authentication**: JWT Bearer Token required (UserRole: `ADMIN`)

### Path Parameters:

- `id` (string, required): MongoDB ObjectId of the widget.

### Success Response (200 OK):

Complete widget object with populated departments.

### Error Responses:

Same as Get Widget Configuration endpoint.

---

## 5. Update Widget

- **Endpoint**: `PUT /widgets/:id`
- **Description**: Updates an existing widget's configuration. Only administrators can update widgets.
- **Authentication**: JWT Bearer Token required (UserRole: `ADMIN`)

### Path Parameters:

- `id` (string, required): MongoDB ObjectId of the widget to update.

### Request Body:

`UpdateWidgetDto` (all fields optional)

- `name` (string, optional): Updated widget name.
- `domains` (string[], optional): Updated array of allowed domains.
- `departmentIds` (string[], optional): Updated array of department IDs.
- `isEnabled` (boolean, optional): Updated activation status.
- `primaryColor` (string, optional): Updated hex color code.
- `welcomeMessage` (string, optional): Updated welcome message.
- `headerText` (string, optional): Updated header text.

### Example Request:

```json
{
  "name": "Updated Support Widget",
  "primaryColor": "#10B981",
  "isEnabled": false
}
```

### Success Response (200 OK):

Updated widget object with populated departments.

### Error Responses:

- `401 Unauthorized`: If JWT is missing or invalid.
- `403 Forbidden`: If the authenticated user does not have the `ADMIN` role.
- `400 Bad Request`: If widget ID format is invalid or department IDs are invalid.
- `404 Not Found`: If widget with the specified ID doesn't exist.

---

## 6. Delete Widget

- **Endpoint**: `DELETE /widgets/:id`
- **Description**: Permanently deletes a widget. Only administrators can delete widgets.
- **Authentication**: JWT Bearer Token required (UserRole: `ADMIN`)

### Path Parameters:

- `id` (string, required): MongoDB ObjectId of the widget to delete.

### Success Response (200 OK):

The deleted widget object.

### Error Responses:

- `401 Unauthorized`: If JWT is missing or invalid.
- `403 Forbidden`: If the authenticated user does not have the `ADMIN` role.
- `400 Bad Request`: If widget ID format is invalid.
- `404 Not Found`: If widget with the specified ID doesn't exist.

---

## 7. Get Widget Script (Public)

- **Endpoint**: `GET /widgets/:widgetId/script.js`
- **Description**: Returns the JavaScript code for embedding the chat widget on external websites. This is a public endpoint that doesn't require authentication.
- **Authentication**: Public (no authentication required)

### Path Parameters:

- `widgetId` (string, required): MongoDB ObjectId of the widget.

### Response Headers:

- `Content-Type`: `application/javascript`
- `Cache-Control`: `public, max-age=300` (5 minutes cache)

### Success Response (200 OK):

JavaScript code that creates and initializes the chat widget.

### Example Usage:

```html
<!-- Embed this script tag on your website -->
<script src="https://yourdomain.com/widgets/60c72b4f9b1e8a001c8e4d8d/script.js"></script>
```

### Error Responses:

- `400 Bad Request`: If widget ID format is invalid.
  ```
  Invalid widget ID format
  ```
- `404 Not Found`: If widget doesn't exist or is not enabled.
  ```
  Widget not found or not enabled.
  ```

---

## 8. Get Widget Public Configuration

- **Endpoint**: `GET /widgets/:widgetId/public-config`
- **Description**: Returns the public configuration data for a widget, used by the widget script to initialize the chat interface. This is a public endpoint.
- **Authentication**: Public (no authentication required)

### Path Parameters:

- `widgetId` (string, required): MongoDB ObjectId of the widget.

### Success Response (200 OK):

- `widgetId` (string): The widget ID.
- `name` (string): Widget name.
- `departments` (object[]): Array of available departments.
  - `id` (string): Department ID.
  - `name` (string): Department name.
- `widgetConfig` (object): Widget styling and text configuration.
  - `primaryColor` (string): Primary color for the widget.
  - `welcomeMessage` (string): Welcome message text.
  - `headerText` (string): Header text.
- `socketUrl` (string): WebSocket server URL.
- `socketNamespace` (string): WebSocket namespace for chat.

### Example Success Response:

```json
{
  "widgetId": "60c72b4f9b1e8a001c8e4d8d",
  "name": "Customer Support Widget",
  "departments": [
    {
      "id": "60c72b2f9b1e8a001c8e4d8b",
      "name": "Technical Support"
    },
    {
      "id": "60c72b3f9b1e8a001c8e4d8c",
      "name": "Sales"
    }
  ],
  "widgetConfig": {
    "primaryColor": "#3B82F6",
    "welcomeMessage": "Welcome! How can we help you today?",
    "headerText": "Customer Support"
  },
  "socketUrl": "/",
  "socketNamespace": "/chat"
}
```

### Error Responses:

- `400 Bad Request`: If widget ID format is invalid.
- `404 Not Found`: If widget doesn't exist or is not enabled.

---

## Widget Integration Guide

To integrate a chat widget on your website:

### 1. Get the Widget Script URL

After creating a widget through the admin panel, use the `injectableScriptUrl` provided in the response.

### 2. Embed the Script

Add the script tag to your website:

```html
<script src="https://yourdomain.com/widgets/YOUR_WIDGET_ID/script.js"></script>
```

### 3. Widget Features

- Responsive chat interface with customizable colors
- Department selection for routing conversations
- Real-time messaging via WebSocket
- File attachment support
- Typing indicators
- Unread message notifications
- Mobile-friendly design

### 4. Customization

Configure the widget appearance and behavior through the admin endpoints by updating the widget's `primaryColor`, `welcomeMessage`, and `headerText` properties.

### 5. Domain Restrictions

If you specify domains in the widget configuration, the widget will only work on those domains. Leave the domains array empty to allow embedding on any domain.

### 6. Department Configuration

Associate departments with your widget to allow users to select the appropriate department for their inquiry. This helps route conversations to the right team.

---

## Notes

- All admin endpoints require JWT authentication with `ADMIN` role
- Public endpoints (script.js and public-config) don't require authentication
- Widget IDs must be valid MongoDB ObjectIds
- The widget script automatically handles WebSocket connections and UI rendering
- Widgets can be enabled/disabled without deletion for temporary deactivation
