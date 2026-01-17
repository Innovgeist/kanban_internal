# Kanban Board Backend - API Documentation

> **Version:** 1.0.0  
> **Base URL:** `https://your-app.vercel.app` (Production) or `http://localhost:3000` (Development)  
> **Documentation for:** Frontend Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Authorization Rules](#authorization-rules)
7. [Common Patterns](#common-patterns)
8. [Edge Cases & Tricky Scenarios](#edge-cases--tricky-scenarios)
9. [Best Practices](#best-practices)
10. [Testing & Debugging](#testing--debugging)

---

## Overview

### System Architecture

This is a **multi-user, multi-project Kanban board backend** with role-based access control.

**Key Concepts:**
- **SuperAdmin**: System-level admin who can create projects and assign project managers
- **Project Manager (ADMIN)**: Project-level admin who manages members within their project
- **Member**: Regular project member with access to boards, columns, and cards

### Base URL

```
Production: https://kanban-internal.vercel.app
Development: http://localhost:3000
```

### Response Format

All responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Human readable error message",
  "code": "ERROR_CODE"
}
```

---

## Authentication

### Overview

The API uses **JWT (JSON Web Tokens)** with two token types:
- **Access Token**: Short-lived (15 minutes) - used for API requests
- **Refresh Token**: Long-lived (7 days) - used to get new access tokens

### Authentication Flow

```
1. User registers/logs in
   ↓
2. Receive accessToken + refreshToken
   ↓
3. Use accessToken in Authorization header for all requests
   ↓
4. When accessToken expires, use refreshToken to get new accessToken
   ↓
5. Repeat from step 3
```

### Headers Required

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

### Token Storage Recommendations

**⚠️ IMPORTANT Security Notes:**
- **DO NOT** store tokens in `localStorage` for production (XSS vulnerability)
- **DO** store tokens in `httpOnly` cookies (recommended) or memory
- **DO** implement token refresh logic before expiration
- **DO** clear tokens on logout

---

## API Endpoints

### Authentication Endpoints

#### 1. Register User

**Endpoint:** `POST /auth/register`

**Description:** Creates a new user account. Default role is `USER`. Only SuperAdmin can be created manually in database.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Validation:**
- `name`: Required, min 1 character
- `email`: Required, valid email format
- `password`: Required, min 6 characters

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "createdAt": "2024-01-17T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Codes:**
- `USER_EXISTS` (400): Email already registered
- `VALIDATION_ERROR` (400): Invalid input data

---

#### 2. Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticates user and returns tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "createdAt": "2024-01-17T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Codes:**
- `INVALID_CREDENTIALS` (401): Wrong email or password
- `VALIDATION_ERROR` (400): Invalid input

**⚠️ Important:** Check `user.role` to determine if user is SuperAdmin (`SUPERADMIN`) or regular user (`USER`).

---

#### 3. Refresh Token

**Endpoint:** `POST /auth/refresh`

**Description:** Gets a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Codes:**
- `INVALID_REFRESH_TOKEN` (401): Refresh token is invalid or expired
- `REFRESH_TOKEN_REQUIRED` (400): Missing refresh token

**⚠️ Implementation Tip:** Call this endpoint automatically when you get a 401 response, then retry the original request.

---

#### 4. Logout

**Endpoint:** `POST /auth/logout`

**Description:** Logs out user. Client-side should remove tokens.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** This is mainly for client-side cleanup. Tokens are stateless (JWT), so server doesn't maintain session.

---

### Project Endpoints

#### 5. Create Project

**Endpoint:** `POST /projects`

**Description:** Creates a new project. **Only SuperAdmin can create projects.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "E-Commerce Platform",
  "projectManagerEmail": "pm@example.com"  // Optional: Assign PM during creation
}
```

**Validation:**
- `name`: Required, min 1 character
- `projectManagerEmail`: Optional, must be valid email of existing user

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "E-Commerce Platform",
    "createdBy": "507f1f77bcf86cd799439011",
    "createdAt": "2024-01-17T10:00:00.000Z"
  }
}
```

**Error Codes:**
- `SUPERADMIN_REQUIRED` (403): Only SuperAdmin can create projects
- `PROJECT_MANAGER_NOT_FOUND` (404): Email provided but user doesn't exist
- `VALIDATION_ERROR` (400): Invalid input

**⚠️ Important:** 
- If `projectManagerEmail` is provided, that user is automatically added as ADMIN
- SuperAdmin who creates the project is NOT automatically added as member (only if assigned as PM)

---

#### 6. Get User Projects

**Endpoint:** `GET /projects`

**Description:** Gets all projects where the authenticated user is a member.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "E-Commerce Platform",
      "createdBy": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Super Admin",
        "email": "admin@example.com"
      },
      "createdAt": "2024-01-17T10:00:00.000Z",
      "role": "ADMIN"  // User's role in this project: ADMIN or MEMBER
    }
  ]
}
```

**Note:** Projects are sorted by `createdAt` (newest first).

---

#### 7. Get Project by ID

**Endpoint:** `GET /projects/:projectId`

**Description:** Gets a specific project. User must be a member.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "E-Commerce Platform",
    "createdBy": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Super Admin",
      "email": "admin@example.com"
    },
    "createdAt": "2024-01-17T10:00:00.000Z"
  }
}
```

**Error Codes:**
- `PROJECT_NOT_FOUND` (404): Project doesn't exist
- `NOT_PROJECT_MEMBER` (403): User is not a member of this project

---

### Project Member Endpoints

#### 8. Get Project Members

**Endpoint:** `GET /projects/:projectId/members`

**Description:** Gets all members of a project. Any project member can view.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "projectId": "507f1f77bcf86cd799439012",
      "userId": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Project Manager",
        "email": "pm@example.com"
      },
      "role": "ADMIN"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "projectId": "507f1f77bcf86cd799439012",
      "userId": {
        "_id": "507f1f77bcf86cd799439016",
        "name": "Team Member",
        "email": "member@example.com"
      },
      "role": "MEMBER"
    }
  ]
}
```

**Note:** Members are sorted by role (ADMIN first), then by creation date.

---

#### 9. Add Member to Project

**Endpoint:** `POST /projects/:projectId/members`

**Description:** Adds a user to the project. **SuperAdmin or Project Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "MEMBER"  // or "ADMIN" (only SuperAdmin can assign ADMIN)
}
```

**Validation:**
- `email`: Required, valid email format, must be existing user
- `role`: Required, must be "ADMIN" or "MEMBER"

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439017",
    "projectId": "507f1f77bcf86cd799439012",
    "userId": {
      "_id": "507f1f77bcf86cd799439018",
      "name": "New Member",
      "email": "newmember@example.com"
    },
    "role": "MEMBER"
  }
}
```

**Error Codes:**
- `SUPERADMIN_REQUIRED` (403): Trying to assign ADMIN role but not SuperAdmin
- `ADMIN_REQUIRED` (403): Not a project admin
- `USER_NOT_FOUND` (404): Email doesn't exist
- `MEMBER_EXISTS` (400): User is already a member
- `VALIDATION_ERROR` (400): Invalid input

**⚠️ Critical Rules:**
1. **Only SuperAdmin** can assign `role: "ADMIN"` (project manager)
2. **Project Admins** can only assign `role: "MEMBER"`
3. User must exist (be registered) before adding to project

---

#### 10. Remove Member from Project

**Endpoint:** `DELETE /projects/:projectId/members/:userId`

**Description:** Removes a member from the project. **SuperAdmin or Project Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Error Codes:**
- `ADMIN_REQUIRED` (403): Not a project admin
- `MEMBER_NOT_FOUND` (404): Member doesn't exist

**⚠️ Note:** You can remove yourself if you're an admin, but be careful with UX!

---

### Board Endpoints

#### 11. Create Board

**Endpoint:** `POST /projects/:projectId/boards`

**Description:** Creates a new board in a project. Any project member can create boards.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "Development Board"
}
```

**Validation:**
- `name`: Required, min 1 character

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439019",
    "projectId": "507f1f77bcf86cd799439012",
    "name": "Development Board",
    "createdAt": "2024-01-17T10:00:00.000Z"
  }
}
```

**Error Codes:**
- `NOT_PROJECT_MEMBER` (403): User is not a project member
- `VALIDATION_ERROR` (400): Invalid input

---

#### 12. Get Full Board View

**Endpoint:** `GET /boards/:boardId`

**Description:** Gets complete board data including all columns and cards. This is the main endpoint for displaying the Kanban board.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "board": {
      "_id": "507f1f77bcf86cd799439019",
      "projectId": "507f1f77bcf86cd799439012",
      "name": "Development Board",
      "createdAt": "2024-01-17T10:00:00.000Z"
    },
    "columns": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "boardId": "507f1f77bcf86cd799439019",
        "name": "To Do",
        "order": 0,
        "cards": [
          {
            "_id": "507f1f77bcf86cd799439021",
            "columnId": "507f1f77bcf86cd799439020",
            "title": "Implement Authentication",
            "description": "Set up JWT authentication",
            "order": 0,
            "createdBy": {
              "_id": "507f1f77bcf86cd799439014",
              "name": "Project Manager",
              "email": "pm@example.com"
            },
            "createdAt": "2024-01-17T10:00:00.000Z"
          }
        ]
      },
      {
        "_id": "507f1f77bcf86cd799439022",
        "boardId": "507f1f77bcf86cd799439019",
        "name": "In Progress",
        "order": 1,
        "cards": []
      }
    ]
  }
}
```

**Important Notes:**
- Columns are sorted by `order` (ascending)
- Cards within each column are sorted by `order` (ascending)
- Empty columns will have `cards: []`
- This is the **primary endpoint** for rendering the Kanban board UI

**Error Codes:**
- `BOARD_NOT_FOUND` (404): Board doesn't exist
- `NOT_PROJECT_MEMBER` (403): User is not a project member

---

### Column Endpoints

#### 13. Create Column

**Endpoint:** `POST /boards/:boardId/columns`

**Description:** Creates a new column in a board. Any project member can create columns.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "To Do"
}
```

**Validation:**
- `name`: Required, min 1 character

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "boardId": "507f1f77bcf86cd799439019",
    "name": "To Do",
    "order": 0
  }
}
```

**Note:** `order` is automatically set to `max(order) + 1` or `0` if first column.

---

#### 14. Reorder Columns

**Endpoint:** `PATCH /columns/reorder`

**Description:** Reorders multiple columns at once. Used for drag-and-drop column reordering.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
[
  {
    "columnId": "507f1f77bcf86cd799439020",
    "order": 1
  },
  {
    "columnId": "507f1f77bcf86cd799439022",
    "order": 0
  }
]
```

**Validation:**
- Array of objects with `columnId` (string) and `order` (integer, min 0)
- All columnIds must exist
- User must have access to all columns' boards

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Columns reordered successfully"
  }
}
```

**⚠️ Important Implementation Notes:**
1. Send **all columns** with their new orders, not just the moved one
2. Orders don't need to be consecutive (0, 1, 2, 3) - gaps are fine
3. This is a **bulk update** - all columns are updated in one transaction
4. Frontend should update local state optimistically, then sync with this response

**Error Codes:**
- `COLUMN_NOT_FOUND` (404): One or more columns don't exist
- `ACCESS_DENIED` (403): User doesn't have access to one of the columns' boards
- `VALIDATION_ERROR` (400): Invalid input

---

### Card Endpoints

#### 15. Create Card

**Endpoint:** `POST /columns/:columnId/cards`

**Description:** Creates a new card in a column. Any project member can create cards.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "title": "Implement User Authentication",
  "description": "Set up JWT authentication system"  // Optional
}
```

**Validation:**
- `title`: Required, min 1 character
- `description`: Optional

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "columnId": "507f1f77bcf86cd799439020",
    "title": "Implement User Authentication",
    "description": "Set up JWT authentication system",
    "order": 0,
    "createdBy": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Project Manager",
      "email": "pm@example.com"
    },
    "createdAt": "2024-01-17T10:00:00.000Z"
  }
}
```

**Note:** `order` is automatically set to `max(order) + 1` or `0` if first card in column.

---

#### 16. Move/Reorder Card

**Endpoint:** `PATCH /cards/:cardId/move`

**Description:** Moves a card to a different column and/or reorders it within a column. Used for drag-and-drop card movement.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "columnId": "507f1f77bcf86cd799439022",
  "order": 2
}
```

**Validation:**
- `columnId`: Required, must be valid column ID
- `order`: Required, integer, min 0

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "columnId": "507f1f77bcf86cd799439022",
    "title": "Implement User Authentication",
    "description": "Set up JWT authentication system",
    "order": 2,
    "createdBy": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Project Manager",
      "email": "pm@example.com"
    },
    "createdAt": "2024-01-17T10:00:00.000Z"
  }
}
```

**⚠️ Important Implementation Notes:**

1. **Moving Between Columns:**
   - Set `columnId` to the target column
   - Set `order` to desired position in target column
   - Card is removed from source column and added to target

2. **Reordering Within Same Column:**
   - Keep same `columnId`
   - Update `order` to new position
   - You may need to update other cards' orders if inserting in middle

3. **Frontend Optimization:**
   - Update UI optimistically
   - If move fails, revert UI and show error
   - Consider debouncing rapid moves

**Error Codes:**
- `CARD_NOT_FOUND` (404): Card doesn't exist
- `COLUMN_NOT_FOUND` (404): Target column doesn't exist
- `NOT_PROJECT_MEMBER` (403): User doesn't have access

---

## Data Models

### User

```typescript
{
  _id: string;           // MongoDB ObjectId
  name: string;
  email: string;        // Unique, lowercase
  role: "USER" | "SUPERADMIN";
  createdAt: Date;
}
```

### Project

```typescript
{
  _id: string;
  name: string;
  createdBy: string;    // User ID
  createdAt: Date;
}
```

### ProjectMember

```typescript
{
  _id: string;
  projectId: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
}
```

### Board

```typescript
{
  _id: string;
  projectId: string;
  name: string;
  createdAt: Date;
}
```

### Column

```typescript
{
  _id: string;
  boardId: string;
  name: string;
  order: number;        // Integer, used for sorting
}
```

### Card

```typescript
{
  _id: string;
  columnId: string;
  title: string;
  description?: string;  // Optional
  order: number;        // Integer, used for sorting
  createdBy: string;   // User ID
  createdAt: Date;
}
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "success": false,
  "message": "Human readable error message",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `NO_TOKEN` | 401 | Missing authorization token |
| `INVALID_TOKEN` | 401 | Invalid or expired access token |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `INVALID_REFRESH_TOKEN` | 401 | Invalid refresh token |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `SUPERADMIN_REQUIRED` | 403 | SuperAdmin role required |
| `ADMIN_REQUIRED` | 403 | Project admin role required |
| `NOT_PROJECT_MEMBER` | 403 | User is not a project member |
| `USER_EXISTS` | 400 | Email already registered |
| `USER_NOT_FOUND` | 404 | User doesn't exist |
| `PROJECT_NOT_FOUND` | 404 | Project doesn't exist |
| `BOARD_NOT_FOUND` | 404 | Board doesn't exist |
| `COLUMN_NOT_FOUND` | 404 | Column doesn't exist |
| `CARD_NOT_FOUND` | 404 | Card doesn't exist |
| `MEMBER_EXISTS` | 400 | User already a project member |
| `MEMBER_NOT_FOUND` | 404 | Member doesn't exist |

### Error Handling Best Practices

1. **Always check `success` field** in response
2. **Check `code` field** for specific error handling
3. **Show `message`** to users (user-friendly)
4. **Use `code`** for programmatic error handling
5. **Handle 401 errors** by refreshing token and retrying
6. **Handle 403 errors** by showing permission denied message
7. **Handle 404 errors** by showing not found message

---

## Authorization Rules

### System-Level Roles

| Role | Can Create Projects | Can Assign Project Managers |
|------|-------------------|----------------------------|
| `SUPERADMIN` | ✅ Yes | ✅ Yes |
| `USER` | ❌ No | ❌ No |

### Project-Level Roles

| Role | Can Add Members | Can Remove Members | Can Assign ADMIN Role |
|------|----------------|-------------------|---------------------|
| `ADMIN` (Project Manager) | ✅ Yes | ✅ Yes | ❌ No (only SuperAdmin) |
| `MEMBER` | ❌ No | ❌ No | ❌ No |

### Access Rules

1. **Project Access:**
   - User must be a `ProjectMember` to access project
   - Both `ADMIN` and `MEMBER` can access projects they belong to

2. **Board Access:**
   - Any project member can create/view boards
   - Access is checked via project membership

3. **Column/Card Access:**
   - Any project member can create/view/edit columns and cards
   - Access is checked via board → project membership chain

### Authorization Flow

```
Request → Check Token → Check User Role → Check Project Membership → Check Resource Access
```

---

## Common Patterns

### 1. Token Refresh Pattern

```javascript
// Pseudo-code
async function apiCall(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.status === 401) {
      // Token expired, refresh it
      const newToken = await refreshAccessToken();
      // Retry original request
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        }
      });
    }
    
    return response;
  } catch (error) {
    // Handle error
  }
}
```

### 2. Optimistic Updates

For drag-and-drop operations:

```javascript
// 1. Update UI immediately (optimistic)
updateLocalState(newOrder);

// 2. Send request to server
try {
  await reorderColumns(newOrder);
} catch (error) {
  // 3. Revert on error
  revertLocalState();
  showError(error);
}
```

### 3. Loading States

Always show loading states for:
- Initial data fetch
- Create/update/delete operations
- Token refresh

### 4. Error Boundaries

Implement error boundaries for:
- Network failures
- Invalid responses
- Token expiration
- Permission errors

---

## Edge Cases & Tricky Scenarios

### 1. Token Expiration During Request

**Scenario:** Access token expires while user is making a request.

**Solution:**
- Intercept 401 responses
- Refresh token automatically
- Retry original request
- If refresh fails, redirect to login

### 2. Concurrent Card Moves

**Scenario:** User moves card A, then quickly moves card B before first request completes.

**Solution:**
- Use request queue or debouncing
- Cancel previous move if new one initiated
- Show loading state during move
- Update optimistically but verify with server

### 3. Column Reordering

**Scenario:** User drags column to new position.

**Solution:**
- Send **all columns** with updated orders
- Don't send just the moved column
- Orders can have gaps (0, 5, 10) - that's fine
- Backend handles bulk update atomically

### 4. Adding Non-Existent User

**Scenario:** Admin tries to add user by email, but user doesn't exist.

**Solution:**
- Backend returns `USER_NOT_FOUND` (404)
- Frontend should show: "User with this email is not registered. They need to sign up first."
- Consider showing "Invite User" flow

### 5. Removing Last Admin

**Scenario:** Admin removes themselves or last admin from project.

**Solution:**
- Backend allows this (no restriction)
- Frontend should warn: "You are removing the last admin. Project will have no admins."
- Consider requiring at least one admin

### 6. Project Manager Assignment

**Scenario:** SuperAdmin assigns project manager, but user is already a member.

**Solution:**
- Backend returns `MEMBER_EXISTS` (400)
- Frontend should show: "User is already a member. Update their role instead."
- Consider separate "Update Role" endpoint (future enhancement)

### 7. Empty Board State

**Scenario:** Board has no columns or all columns are empty.

**Solution:**
- `GET /boards/:boardId` returns empty arrays
- Frontend should show empty state UI
- Guide user to create first column

### 8. Rapid Column/Card Creation

**Scenario:** User clicks "Add Column" multiple times quickly.

**Solution:**
- Disable button during request
- Show loading state
- Prevent duplicate submissions
- Backend handles gracefully (creates all)

### 9. Network Interruption During Move

**Scenario:** User moves card, network fails, card appears in both columns.

**Solution:**
- Use optimistic updates carefully
- Verify with server response
- If move fails, revert UI
- Show error message
- Consider retry mechanism

### 10. SuperAdmin Creating Project Without PM

**Scenario:** SuperAdmin creates project but doesn't assign project manager.

**Solution:**
- Project is created successfully
- No members initially (not even creator)
- SuperAdmin must manually add members
- Consider UX: Show warning or guide to add PM immediately

---

## Best Practices

### 1. Authentication

✅ **DO:**
- Store tokens securely (httpOnly cookies or memory)
- Implement automatic token refresh
- Clear tokens on logout
- Handle 401 errors gracefully

❌ **DON'T:**
- Store tokens in localStorage (XSS risk)
- Send tokens in URL parameters
- Log tokens in console
- Hardcode tokens

### 2. Error Handling

✅ **DO:**
- Check `success` field in all responses
- Show user-friendly error messages
- Log errors for debugging
- Handle network errors

❌ **DON'T:**
- Assume requests always succeed
- Show raw error messages to users
- Ignore error codes
- Crash on errors

### 3. State Management

✅ **DO:**
- Keep server state in sync
- Use optimistic updates for better UX
- Handle loading and error states
- Cache data when appropriate

❌ **DON'T:**
- Keep stale data
- Update UI without server confirmation
- Ignore server responses
- Over-fetch data

### 4. Performance

✅ **DO:**
- Debounce rapid actions (drag-and-drop)
- Batch operations when possible
- Use pagination for large lists (future)
- Cache frequently accessed data

❌ **DON'T:**
- Make requests on every keystroke
- Fetch all data on every render
- Ignore loading states
- Block UI during requests

### 5. User Experience

✅ **DO:**
- Show loading indicators
- Provide feedback for actions
- Handle edge cases gracefully
- Guide users through flows

❌ **DON'T:**
- Leave users waiting without feedback
- Show technical error messages
- Allow invalid states
- Confuse users with unclear UI

---

## Testing & Debugging

### Testing Checklist

- [ ] User registration and login
- [ ] Token refresh flow
- [ ] Project creation (SuperAdmin only)
- [ ] Member management
- [ ] Board creation and viewing
- [ ] Column creation and reordering
- [ ] Card creation and movement
- [ ] Error handling (401, 403, 404)
- [ ] Edge cases (empty states, concurrent actions)
- [ ] Network failure scenarios

### Debugging Tips

1. **Check Network Tab:**
   - Verify request URLs
   - Check request headers (Authorization)
   - Inspect response status and body

2. **Check Console:**
   - Look for CORS errors
   - Check for network errors
   - Verify token presence

3. **Common Issues:**
   - Missing `Authorization` header → 401
   - Invalid token → 401
   - Wrong project ID → 404
   - Not a member → 403

4. **Test with Postman/Insomnia:**
   - Test endpoints independently
   - Verify request/response formats
   - Test error scenarios

---

## Quick Reference

### Essential Endpoints

| Action | Method | Endpoint | Auth Required |
|--------|--------|----------|---------------|
| Register | POST | `/auth/register` | No |
| Login | POST | `/auth/login` | No |
| Refresh Token | POST | `/auth/refresh` | No |
| Create Project | POST | `/projects` | Yes (SuperAdmin) |
| Get Projects | GET | `/projects` | Yes |
| Add Member | POST | `/projects/:id/members` | Yes (Admin) |
| Create Board | POST | `/projects/:id/boards` | Yes |
| Get Board | GET | `/boards/:id` | Yes |
| Create Column | POST | `/boards/:id/columns` | Yes |
| Reorder Columns | PATCH | `/columns/reorder` | Yes |
| Create Card | POST | `/columns/:id/cards` | Yes |
| Move Card | PATCH | `/cards/:id/move` | Yes |

### Required Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Support & Questions

For questions or issues:
1. Check this documentation first
2. Review error messages and codes
3. Check network requests in browser dev tools
4. Contact backend team with:
   - Endpoint URL
   - Request payload
   - Response status and body
   - Error code (if any)

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
