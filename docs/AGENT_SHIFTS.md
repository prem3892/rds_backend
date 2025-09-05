# Agent Shift Management

This document explains how to use the agent shift management system to define working hours for agents.

## Overview

The shift management system allows administrators to define working hours for agents on a weekly basis. Each day can have multiple time slots to accommodate breaks, split shifts, or complex scheduling requirements.

## Key Features

- **Weekly Schedule**: Define working hours for each day of the week
- **Multiple Time Slots**: Support for multiple non-overlapping time slots per day (e.g., morning and afternoon shifts)
- **Timezone Support**: Each agent can have their own timezone
- **Automatic Availability**: System automatically checks if agents are within their working hours when assigning chats
- **Validation**: Built-in validation prevents overlapping time slots and invalid time ranges

## API Endpoints

### Register Agent with Shifts

**POST** `/auth/register`

Register a new agent with working hours defined.

#### Example Request Body

```json
{
  "email": "agent@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "AGENT",
  "timezone": "America/New_York",
  "shifts": {
    "monday": {
      "isWorkingDay": true,
      "timeSlots": [
        {
          "startHour": 9,
          "startMinute": 0,
          "endHour": 12,
          "endMinute": 0
        },
        {
          "startHour": 13,
          "startMinute": 0,
          "endHour": 17,
          "endMinute": 0
        }
      ]
    },
    "tuesday": {
      "isWorkingDay": true,
      "timeSlots": [
        {
          "startHour": 9,
          "startMinute": 0,
          "endHour": 17,
          "endMinute": 0
        }
      ]
    },
    "wednesday": {
      "isWorkingDay": true,
      "timeSlots": [
        {
          "startHour": 9,
          "startMinute": 0,
          "endHour": 17,
          "endMinute": 0
        }
      ]
    },
    "thursday": {
      "isWorkingDay": true,
      "timeSlots": [
        {
          "startHour": 9,
          "startMinute": 0,
          "endHour": 17,
          "endMinute": 0
        }
      ]
    },
    "friday": {
      "isWorkingDay": true,
      "timeSlots": [
        {
          "startHour": 9,
          "startMinute": 0,
          "endHour": 17,
          "endMinute": 0
        }
      ]
    },
    "saturday": {
      "isWorkingDay": false,
      "timeSlots": []
    },
    "sunday": {
      "isWorkingDay": false,
      "timeSlots": []
    }
  }
}
```

### Update Agent Profile with Shifts

**PUT** `/agents/me/profile`

Update an agent's working hours.

#### Example Request Body

```json
{
  "shifts": {
    "monday": {
      "isWorkingDay": true,
      "timeSlots": [
        {
          "startHour": 8,
          "startMinute": 30,
          "endHour": 16,
          "endMinute": 30
        }
      ]
    }
  },
  "timezone": "Europe/London"
}
```

### Check Agent Availability

**GET** `/agents/me/availability`

Check if the current agent is available based on their shift schedule.

#### Example Response

```json
{
  "isAvailable": true,
  "isWithinShift": true,
  "isOnline": true,
  "nextAvailableTime": null
}
```

## Shift Configuration Examples

### Standard 9-5 Weekday Schedule

```json
{
  "monday": {
    "isWorkingDay": true,
    "timeSlots": [
      { "startHour": 9, "startMinute": 0, "endHour": 17, "endMinute": 0 }
    ]
  },
  "tuesday": {
    "isWorkingDay": true,
    "timeSlots": [
      { "startHour": 9, "startMinute": 0, "endHour": 17, "endMinute": 0 }
    ]
  },
  "wednesday": {
    "isWorkingDay": true,
    "timeSlots": [
      { "startHour": 9, "startMinute": 0, "endHour": 17, "endMinute": 0 }
    ]
  },
  "thursday": {
    "isWorkingDay": true,
    "timeSlots": [
      { "startHour": 9, "startMinute": 0, "endHour": 17, "endMinute": 0 }
    ]
  },
  "friday": {
    "isWorkingDay": true,
    "timeSlots": [
      { "startHour": 9, "startMinute": 0, "endHour": 17, "endMinute": 0 }
    ]
  },
  "saturday": { "isWorkingDay": false, "timeSlots": [] },
  "sunday": { "isWorkingDay": false, "timeSlots": [] }
}
```

### Split Shift with Lunch Break

```json
{
  "monday": {
    "isWorkingDay": true,
    "timeSlots": [
      { "startHour": 9, "startMinute": 0, "endHour": 12, "endMinute": 0 },
      { "startHour": 13, "startMinute": 0, "endHour": 17, "endMinute": 0 }
    ]
  }
}
```

### Night Shift (Overnight)

```json
{
  "monday": {
    "isWorkingDay": true,
    "timeSlots": [
      { "startHour": 22, "startMinute": 0, "endHour": 6, "endMinute": 0 }
    ]
  }
}
```

### Weekend Only Schedule

```json
{
  "monday": { "isWorkingDay": false, "timeSlots": [] },
  "tuesday": { "isWorkingDay": false, "timeSlots": [] },
  "wednesday": { "isWorkingDay": false, "timeSlots": [] },
  "thursday": { "isWorkingDay": false, "timeSlots": [] },
  "friday": { "isWorkingDay": false, "timeSlots": [] },
  "saturday": {
    "isWorkingDay": true,
    "timeSlots": [
      { "startHour": 10, "startMinute": 0, "endHour": 18, "endMinute": 0 }
    ]
  },
  "sunday": {
    "isWorkingDay": true,
    "timeSlots": [
      { "startHour": 10, "startMinute": 0, "endHour": 18, "endMinute": 0 }
    ]
  }
}
```

## Validation Rules

1. **Time Format**: Hours must be 0-23, minutes must be 0-59
2. **Time Slots**: Start time must be different from end time
3. **No Overlaps**: Time slots within the same day cannot overlap
4. **Working Days**: If `isWorkingDay` is false, `timeSlots` should be empty or omitted
5. **Timezone**: Must be a valid IANA timezone identifier (e.g., "America/New_York", "Europe/London")

## How It Works

1. **Agent Registration**: When registering an agent, include the `shifts` and `timezone` fields
2. **Automatic Filtering**: The system automatically filters agents based on their working hours when assigning chats
3. **Availability Check**: Use the `/agents/me/availability` endpoint to check current availability
4. **Profile Updates**: Agents or admins can update shift schedules through the profile update endpoint

## Timezone Support

The system supports timezone-aware scheduling. Each agent can have their own timezone, and the system will automatically convert times for availability checks.

Common timezone examples:

- `UTC` - Coordinated Universal Time
- `America/New_York` - Eastern Time
- `America/Los_Angeles` - Pacific Time
- `Europe/London` - Greenwich Mean Time / British Summer Time
- `Asia/Tokyo` - Japan Standard Time
- `Australia/Sydney` - Australian Eastern Time

## Integration with Chat Assignment

When a customer initiates a chat, the system will:

1. Find all online agents
2. Filter by department and domain access
3. **Check shift availability** - Only include agents currently within their working hours
4. Filter by maximum concurrent chat limits
5. Assign the chat to an available agent

This ensures that chats are only assigned to agents who are supposed to be working at that time.
