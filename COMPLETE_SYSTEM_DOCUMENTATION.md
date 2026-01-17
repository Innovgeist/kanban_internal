# Kanban Board Backend - Complete System Documentation

> **Version:** 1.0.0  
> **Base URL:** `https://kanban-internal.vercel.app` (Production) or `http://localhost:3000` (Development)  
> **Purpose:** Complete system understanding for AI agents and developers

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Design](#architecture--design)
3. [Complete User Workflows](#complete-user-workflows)
4. [Data Flow & Relationships](#data-flow--relationships)
5. [Business Logic & Rules](#business-logic--rules)
6. [State Management Concepts](#state-management-concepts)
7. [API Documentation](#api-documentation)
8. [Decision Trees & Scenarios](#decision-trees--scenarios)
9. [Implementation Guidelines](#implementation-guidelines)

---

## System Overview

### What This System Does

This is a **multi-user, multi-project Kanban board management system** that allows:
- Organizations to manage multiple projects
- Each project to have multiple Kanban boards
- Teams to collaborate on tasks using drag-and-drop Kanban boards
- Role-based access control at both system and project levels

### Core Purpose

**Business Problem Solved:**
- Teams need a way to organize and track work across multiple projects
- Different projects need different team members
- Project managers need to control who can access their projects
- System administrators need to control project creation and management

**Solution:**
- Hierarchical structure: System → Projects → Boards → Columns → Cards
- Role-based permissions: SuperAdmin → Project Manager (ADMIN) → Member
- JWT-based authentication for secure access
- RESTful API for frontend integration

---

## Architecture & Design

### System Hierarchy

```
System (SuperAdmin)
  └─ Projects (created by SuperAdmin)
      └─ Project Members (ADMIN or MEMBER)
          └─ Boards (created by any member)
              └─ Columns (created by any member)
                  └─ Cards (created by any member)
```

### Role Hierarchy

```
┌─────────────────────────────────────────┐
│         SYSTEM LEVEL                     │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ SUPERADMIN   │  │    USER      │    │
│  │ - Create     │  │ - Regular    │    │
│  │   Projects   │  │   User       │    │
│  │ - Assign PMs │  │              │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
           │
           │ Creates
           ▼
┌─────────────────────────────────────────┐
│         PROJECT LEVEL                    │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ ADMIN        │  │   MEMBER     │    │
│  │ (PM)         │  │              │    │
│  │ - Add/Remove │  │ - View       │    │
│  │   Members    │  │ - Create     │    │
│  │ - Manage     │  │   Boards/    │    │
│  │   Project    │  │   Cards      │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
```

### Database Schema Relationships

```
User (1) ──< (many) ProjectMember (many) >── (1) Project
                                                      │
                                                      │ (1)
                                                      │
                                                      ▼
                                                   Board (1)
                                                      │
                                                      │ (1)
                                                      │
                                                      ▼
                                                   Column (1)
                                                      │
                                                      │ (1)
                                                      │
                                                      ▼
                                                    Card
```

**Key Relationships:**
- **User ↔ ProjectMember**: Many-to-Many (users can be in multiple projects)
- **Project ↔ ProjectMember**: One-to-Many (project has many members)
- **Project ↔ Board**: One-to-Many (project has many boards)
- **Board ↔ Column**: One-to-Many (board has many columns)
- **Column ↔ Card**: One-to-Many (column has many cards)
- **User ↔ Card**: One-to-Many (user creates many cards, via `createdBy`)

### Data Flow Architecture

```
Frontend Request
    │
    ▼
Express Middleware (CORS, JSON parsing)
    │
    ▼
Authentication Middleware (JWT verification)
    │
    ▼
Authorization Middleware (Role/Project check)
    │
    ▼
Controller (Request handling)
    │
    ▼
Service (Business logic)
    │
    ▼
Model (Database operations)
    │
    ▼
MongoDB
    │
    ▼
Response back through layers
```

---

## Complete User Workflows

### Workflow 1: System Initialization

**Goal:** Set up the system with a SuperAdmin

**Steps:**
1. **Create SuperAdmin** (Manual/Database)
   - SuperAdmin must be created manually in database
   - Email: `innovgeist@gmail.com`
   - Role: `SUPERADMIN`
   - Password: Hashed with bcrypt

2. **SuperAdmin Login**
   - POST `/auth/login` with SuperAdmin credentials
   - Receive `accessToken` and `refreshToken`
   - Token contains `role: "SUPERADMIN"`

**Outcome:** System is ready for project creation

---

### Workflow 2: Project Creation & Team Setup

**Goal:** Create a project and assign a project manager

**Complete Flow:**

```
Step 1: SuperAdmin Creates Project
├─ POST /projects
├─ Body: { name: "Project Name", projectManagerEmail: "pm@example.com" }
├─ Backend Logic:
│   ├─ Verify user is SuperAdmin
│   ├─ Create Project document
│   ├─ If projectManagerEmail provided:
│   │   ├─ Find user by email
│   │   ├─ Create ProjectMember with role: "ADMIN"
│   │   └─ Link to project
│   └─ Return project data
└─ Response: Project created, PM assigned (if provided)

Step 2: SuperAdmin Adds Team Members (Optional)
├─ POST /projects/:projectId/members
├─ Body: { email: "member@example.com", role: "MEMBER" }
├─ Backend Logic:
│   ├─ Verify user is SuperAdmin or Project Admin
│   ├─ Find user by email
│   ├─ Check if already a member
│   ├─ Verify role assignment permissions
│   ├─ Create ProjectMember document
│   └─ Return member data
└─ Response: Member added to project

Step 3: Project Manager Adds More Members
├─ POST /projects/:projectId/members
├─ Body: { email: "newmember@example.com", role: "MEMBER" }
├─ Backend Logic:
│   ├─ Verify user is Project Admin (or SuperAdmin)
│   ├─ Verify role is "MEMBER" (PM can't assign ADMIN)
│   ├─ Find user by email
│   ├─ Create ProjectMember
│   └─ Return member data
└─ Response: Member added
```

**Important Rules:**
- SuperAdmin can assign ADMIN role
- Project Manager can only assign MEMBER role
- User must exist (be registered) before adding to project
- SuperAdmin who creates project is NOT automatically a member (unless assigned as PM)

**State After Workflow:**
- Project exists
- Project has at least one ADMIN (Project Manager)
- Project may have multiple MEMBERs
- All members can access project resources

---

### Workflow 3: Board Creation & Kanban Setup

**Goal:** Create a Kanban board with columns for task management

**Complete Flow:**

```
Step 1: Create Board
├─ POST /projects/:projectId/boards
├─ Body: { name: "Development Board" }
├─ Backend Logic:
│   ├─ Verify user is project member
│   ├─ Verify project exists
│   ├─ Create Board document
│   └─ Return board data
└─ Response: Board created

Step 2: Create Columns
├─ POST /boards/:boardId/columns (repeat for each column)
├─ Body: { name: "To Do" }
├─ Backend Logic:
│   ├─ Verify user has board access (via project membership)
│   ├─ Get max order from existing columns
│   ├─ Set order = max(order) + 1 (or 0 if first)
│   ├─ Create Column document
│   └─ Return column data
└─ Response: Column created with auto-assigned order

Typical Column Setup:
├─ Column 1: "To Do" (order: 0)
├─ Column 2: "In Progress" (order: 1)
├─ Column 3: "Review" (order: 2)
└─ Column 4: "Done" (order: 3)
```

**State After Workflow:**
- Board exists in project
- Board has multiple columns
- Columns are ordered (0, 1, 2, 3...)
- Board is ready for cards

---

### Workflow 4: Card Management Lifecycle

**Goal:** Create, move, and manage cards through workflow

**Complete Flow:**

```
Step 1: Create Card
├─ POST /columns/:columnId/cards
├─ Body: { title: "Task Title", description: "Optional description" }
├─ Backend Logic:
│   ├─ Verify user has column access (via board → project)
│   ├─ Get max order from existing cards in column
│   ├─ Set order = max(order) + 1 (or 0 if first)
│   ├─ Set createdBy = current user ID
│   ├─ Create Card document
│   └─ Return card data
└─ Response: Card created in "To Do" column

Step 2: Move Card to Next Column
├─ PATCH /cards/:cardId/move
├─ Body: { columnId: "in-progress-column-id", order: 0 }
├─ Backend Logic:
│   ├─ Verify user has card access
│   ├─ Verify target column exists
│   ├─ Update card.columnId = new columnId
│   ├─ Update card.order = new order
│   ├─ Save card
│   └─ Return updated card
└─ Response: Card moved to "In Progress"

Step 3: Reorder Card Within Column
├─ PATCH /cards/:cardId/move
├─ Body: { columnId: "same-column-id", order: 2 }
├─ Backend Logic:
│   ├─ Verify access
│   ├─ Update card.order
│   └─ Return updated card
└─ Response: Card reordered

Step 4: Move Card to Done
├─ PATCH /cards/:cardId/move
├─ Body: { columnId: "done-column-id", order: 0 }
└─ Response: Card in "Done" column
```

**Card Lifecycle States:**
```
Created → To Do → In Progress → Review → Done
   │        │          │           │        │
   └────────┴──────────┴───────────┴────────┘
         (Can move in any direction)
```

**Important Notes:**
- Cards can move in any direction (not just forward)
- Order determines position within column
- Moving between columns requires updating both `columnId` and `order`
- Frontend should handle optimistic updates

---

### Workflow 5: Column Reordering

**Goal:** Reorder columns on a board (drag-and-drop)

**Complete Flow:**

```
Step 1: User Drags Column
├─ Frontend: User drags "Review" column before "In Progress"
├─ Frontend calculates new orders for all columns
└─ Frontend updates UI optimistically

Step 2: Send Reorder Request
├─ PATCH /columns/reorder
├─ Body: [
│     { columnId: "todo-id", order: 0 },
│     { columnId: "review-id", order: 1 },      // Moved up
│     { columnId: "in-progress-id", order: 2 }, // Moved down
│     { columnId: "done-id", order: 3 }
│   ]
├─ Backend Logic:
│   ├─ Verify all columnIds exist
│   ├─ Verify user has access to all columns' boards
│   ├─ Bulk update all columns' orders atomically
│   └─ Return success
└─ Response: Columns reordered

Step 3: Verify Order
├─ GET /boards/:boardId
└─ Response: Columns in new order
```

**Critical Implementation Details:**
- **Must send ALL columns** with updated orders, not just the moved one
- Orders can have gaps (0, 5, 10) - that's acceptable
- Backend updates all columns in one transaction
- Frontend should update optimistically but verify with server

---

### Workflow 6: Member Management

**Goal:** Add and remove team members from a project

**Complete Flow:**

```
Scenario A: Adding New Member
├─ Step 1: Admin clicks "Add Member"
├─ Step 2: Admin enters email
├─ Step 3: Frontend sends POST /projects/:projectId/members
│   ├─ Body: { email: "newuser@example.com", role: "MEMBER" }
│   └─ Backend Logic:
│       ├─ Verify admin permissions
│       ├─ Find user by email
│       ├─ If user not found → Return USER_NOT_FOUND
│       ├─ If already member → Return MEMBER_EXISTS
│       ├─ If assigning ADMIN and not SuperAdmin → Return SUPERADMIN_REQUIRED
│       ├─ Create ProjectMember
│       └─ Return member data
└─ Step 4: Frontend updates member list

Scenario B: Removing Member
├─ Step 1: Admin clicks "Remove Member"
├─ Step 2: Frontend sends DELETE /projects/:projectId/members/:userId
├─ Backend Logic:
│   ├─ Verify admin permissions
│   ├─ Find and delete ProjectMember
│   └─ Return success
└─ Step 3: Frontend removes from list

Scenario C: Adding Non-Existent User
├─ Step 1: Admin enters email of unregistered user
├─ Step 2: Backend returns USER_NOT_FOUND (404)
└─ Step 3: Frontend shows: "User must register first"
```

**Permission Matrix:**

| Action | SuperAdmin | Project Admin | Member |
|--------|-----------|---------------|--------|
| Add Member (MEMBER) | ✅ | ✅ | ❌ |
| Add Member (ADMIN) | ✅ | ❌ | ❌ |
| Remove Member | ✅ | ✅ | ❌ |
| View Members | ✅ | ✅ | ✅ |

---

## Data Flow & Relationships

### Complete Data Flow Example

**Scenario:** User creates a card and moves it through workflow

```
1. User Action: Create Card
   │
   ├─ Frontend: User fills form, clicks "Create"
   │
   ├─ API Call: POST /columns/:columnId/cards
   │   Headers: Authorization: Bearer <token>
   │   Body: { title: "Task", description: "..." }
   │
   ├─ Backend Processing:
   │   ├─ Middleware: Authenticate token → Extract userId
   │   ├─ Middleware: Verify column access (column → board → project → membership)
   │   ├─ Controller: Extract columnId, title, description
   │   ├─ Service: 
   │   │   ├─ Find column (verify exists)
   │   │   ├─ Get max order from cards in column
   │   │   ├─ Create card with order = max + 1
   │   │   └─ Set createdBy = userId
   │   └─ Model: Save to MongoDB
   │
   └─ Response: Card data with _id, order, createdBy

2. User Action: Move Card
   │
   ├─ Frontend: User drags card to new column
   │
   ├─ API Call: PATCH /cards/:cardId/move
   │   Body: { columnId: "new-column-id", order: 2 }
   │
   ├─ Backend Processing:
   │   ├─ Middleware: Authenticate & verify access
   │   ├─ Service:
   │   │   ├─ Find card (verify exists)
   │   │   ├─ Find new column (verify exists)
   │   │   ├─ Verify access to both columns' boards
   │   │   ├─ Update card.columnId = new columnId
   │   │   ├─ Update card.order = new order
   │   │   └─ Save card
   │   └─ Model: Update in MongoDB
   │
   └─ Response: Updated card data

3. User Action: View Board
   │
   ├─ API Call: GET /boards/:boardId
   │
   ├─ Backend Processing:
   │   ├─ Find board
   │   ├─ Find all columns (sorted by order)
   │   ├─ Find all cards (grouped by columnId, sorted by order)
   │   ├─ Populate createdBy user data
   │   └─ Combine into response
   │
   └─ Response: Complete board with columns and cards
```

### Data Relationship Queries

**How to get all data for a project:**

```
1. Get Project: GET /projects/:projectId
   → Returns: Project data

2. Get Members: GET /projects/:projectId/members
   → Returns: All ProjectMembers with populated User data

3. Get Boards: (No direct endpoint, but can infer from project)
   → Need to: Get all boards where projectId matches
   → Or: Store boardIds when creating boards

4. For each board: GET /boards/:boardId
   → Returns: Board + Columns + Cards (complete view)
```

**How to check user permissions:**

```
1. Extract userId from JWT token
2. Check system role: user.role === "SUPERADMIN"
3. For project access: Check ProjectMember exists
   - Query: ProjectMember.findOne({ projectId, userId })
4. For project admin: Check ProjectMember.role === "ADMIN"
```

---

## Business Logic & Rules

### Rule 1: Project Creation

**Rule:** Only SuperAdmin can create projects

**Implementation:**
- Check `req.user.role === "SUPERADMIN"` in middleware
- If not SuperAdmin → Return 403 `SUPERADMIN_REQUIRED`

**Why:** System-level control over project creation

### Rule 2: Project Manager Assignment

**Rule:** Only SuperAdmin can assign ADMIN role (project manager)

**Implementation:**
- When adding member with `role: "ADMIN"`:
  - Check if requester is SuperAdmin
  - If not → Return 403 `SUPERADMIN_REQUIRED`
- Project Admins can only assign `role: "MEMBER"`

**Why:** Prevent privilege escalation, maintain hierarchy

### Rule 3: Project Membership Required

**Rule:** User must be a ProjectMember to access project resources

**Implementation:**
- For any project-related endpoint:
  - Check ProjectMember exists: `{ projectId, userId }`
  - If not found → Return 403 `NOT_PROJECT_MEMBER`

**Why:** Ensure users only access projects they belong to

### Rule 4: Automatic Order Assignment

**Rule:** New columns/cards get order = max(existing) + 1

**Implementation:**
```javascript
// For columns
const maxOrder = await Column.findOne({ boardId })
  .sort({ order: -1 })
  .select('order');
const newOrder = maxOrder ? maxOrder.order + 1 : 0;

// For cards
const maxOrder = await Card.findOne({ columnId })
  .sort({ order: -1 })
  .select('order');
const newOrder = maxOrder ? maxOrder.order + 1 : 0;
```

**Why:** Maintain ordering without gaps, easy insertion

### Rule 5: Order Can Have Gaps

**Rule:** Orders don't need to be consecutive (0, 1, 2, 3...)

**Implementation:**
- When reordering, assign any integer >= 0
- Backend doesn't enforce consecutive ordering
- Frontend sorts by order value

**Why:** Allows flexible reordering without recalculating all orders

### Rule 6: Card Movement

**Rule:** Cards can move to any column, any position

**Implementation:**
- Update `card.columnId` to target column
- Update `card.order` to target position
- No validation of "workflow progression"

**Why:** Flexibility - cards can move backward if needed

### Rule 7: Email Uniqueness

**Rule:** User emails must be unique

**Implementation:**
- MongoDB unique index on `User.email`
- Check before creating: `User.findOne({ email })`
- If exists → Return 400 `USER_EXISTS`

**Why:** One account per email

### Rule 8: Project Member Uniqueness

**Rule:** User can only be added once per project

**Implementation:**
- MongoDB unique index on `ProjectMember(projectId, userId)`
- Check before adding: `ProjectMember.findOne({ projectId, userId })`
- If exists → Return 400 `MEMBER_EXISTS`

**Why:** Prevent duplicate memberships

---

## State Management Concepts

### Application State Structure

```typescript
// Frontend State (Recommended Structure)
{
  auth: {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
  },
  projects: {
    list: Project[];
    current: Project | null;
    members: ProjectMember[];
    loading: boolean;
    error: string | null;
  },
  boards: {
    list: Board[];
    current: Board | null;
    columns: Column[];
    cards: Card[];
    loading: boolean;
    error: string | null;
  }
}
```

### State Transitions

**Authentication State:**
```
Unauthenticated
    │
    ├─ [Login/Register] → Authenticated
    │
Authenticated
    │
    ├─ [Token Expires] → Refreshing Token
    │   └─ [Refresh Success] → Authenticated
    │   └─ [Refresh Fails] → Unauthenticated
    │
    └─ [Logout] → Unauthenticated
```

**Project State:**
```
No Project Selected
    │
    ├─ [Select Project] → Project Selected
    │
Project Selected
    │
    ├─ [Load Members] → Members Loaded
    ├─ [Load Boards] → Boards Loaded
    ├─ [Select Board] → Board Selected
    │
    └─ [Deselect] → No Project Selected
```

**Board State:**
```
Board Not Loaded
    │
    ├─ [Load Board] → Loading
    │   ├─ [Success] → Board Loaded (with columns & cards)
    │   └─ [Error] → Error State
    │
Board Loaded
    │
    ├─ [Create Card] → Optimistic Update → Server Sync
    ├─ [Move Card] → Optimistic Update → Server Sync
    ├─ [Reorder Column] → Optimistic Update → Server Sync
    │
    └─ [Error] → Revert Optimistic Update → Show Error
```

### Optimistic Updates Pattern

**When to Use:**
- Drag-and-drop operations (card moves, column reorders)
- Create operations (cards, columns)
- Delete operations

**Pattern:**
```javascript
1. Update local state immediately (optimistic)
2. Send request to server
3. On success: Keep optimistic update
4. On error: Revert optimistic update, show error
```

**Example: Card Move**
```javascript
// 1. Optimistic update
const optimisticCard = { ...card, columnId: newColumnId, order: newOrder };
updateLocalState(optimisticCard);

// 2. Server request
try {
  const response = await moveCard(cardId, newColumnId, newOrder);
  // 3. Success - state already updated
} catch (error) {
  // 4. Revert
  revertLocalState(card);
  showError(error);
}
```

---

## API Documentation

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

### Authentication

The API uses **JWT (JSON Web Tokens)** with two token types:
- **Access Token**: Short-lived (15 minutes) - used for API requests
- **Refresh Token**: Long-lived (7 days) - used to get new access tokens

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Token Storage Recommendations:**
- ⚠️ **DO NOT** store tokens in `localStorage` for production (XSS vulnerability)
- ✅ **DO** store tokens in `httpOnly` cookies (recommended) or memory
- ✅ **DO** implement token refresh logic before expiration
- ✅ **DO** clear tokens on logout

---

### API Endpoints

#### Authentication Endpoints

##### 1. Register User

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

##### 2. Login

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

##### 3. Refresh Token

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

##### 4. Logout

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

#### Project Endpoints

##### 5. Create Project

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

##### 6. Get User Projects

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

##### 7. Get Project by ID

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

#### Project Member Endpoints

##### 8. Get Project Members

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

##### 9. Add Member to Project

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

##### 10. Remove Member from Project

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

#### Board Endpoints

##### 11. Create Board

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

##### 12. Get Full Board View

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

#### Column Endpoints

##### 13. Create Column

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

##### 14. Reorder Columns

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

#### Card Endpoints

##### 15. Create Card

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

##### 16. Move/Reorder Card

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

### Data Models

#### User
```typescript
{
  _id: string;           // MongoDB ObjectId
  name: string;
  email: string;        // Unique, lowercase
  role: "USER" | "SUPERADMIN";
  createdAt: Date;
}
```

#### Project
```typescript
{
  _id: string;
  name: string;
  createdBy: string;    // User ID
  createdAt: Date;
}
```

#### ProjectMember
```typescript
{
  _id: string;
  projectId: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
}
```

#### Board
```typescript
{
  _id: string;
  projectId: string;
  name: string;
  createdAt: Date;
}
```

#### Column
```typescript
{
  _id: string;
  boardId: string;
  name: string;
  order: number;        // Integer, used for sorting
}
```

#### Card
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

### Error Handling

#### Standard Error Response

All errors follow this format:

```json
{
  "success": false,
  "message": "Human readable error message",
  "code": "ERROR_CODE"
}
```

#### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

#### Common Error Codes

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

#### Error Handling Best Practices

1. **Always check `success` field** in response
2. **Check `code` field** for specific error handling
3. **Show `message`** to users (user-friendly)
4. **Use `code`** for programmatic error handling
5. **Handle 401 errors** by refreshing token and retrying
6. **Handle 403 errors** by showing permission denied message
7. **Handle 404 errors** by showing not found message

---

### Edge Cases & Tricky Scenarios

#### 1. Token Expiration During Request

**Scenario:** Access token expires while user is making a request.

**Solution:**
- Intercept 401 responses
- Refresh token automatically
- Retry original request
- If refresh fails, redirect to login

#### 2. Concurrent Card Moves

**Scenario:** User moves card A, then quickly moves card B before first request completes.

**Solution:**
- Use request queue or debouncing
- Cancel previous move if new one initiated
- Show loading state during move
- Update optimistically but verify with server

#### 3. Column Reordering

**Scenario:** User drags column to new position.

**Solution:**
- Send **all columns** with updated orders
- Don't send just the moved column
- Orders can have gaps (0, 5, 10) - that's fine
- Backend handles bulk update atomically

#### 4. Adding Non-Existent User

**Scenario:** Admin tries to add user by email, but user doesn't exist.

**Solution:**
- Backend returns `USER_NOT_FOUND` (404)
- Frontend should show: "User with this email is not registered. They need to sign up first."
- Consider showing "Invite User" flow

#### 5. Removing Last Admin

**Scenario:** Admin removes themselves or last admin from project.

**Solution:**
- Backend allows this (no restriction)
- Frontend should warn: "You are removing the last admin. Project will have no admins."
- Consider requiring at least one admin

#### 6. Project Manager Assignment

**Scenario:** SuperAdmin assigns project manager, but user is already a member.

**Solution:**
- Backend returns `MEMBER_EXISTS` (400)
- Frontend should show: "User is already a member. Update their role instead."
- Consider separate "Update Role" endpoint (future enhancement)

#### 7. Empty Board State

**Scenario:** Board has no columns or all columns are empty.

**Solution:**
- `GET /boards/:boardId` returns empty arrays
- Frontend should show empty state UI
- Guide user to create first column

#### 8. Rapid Column/Card Creation

**Scenario:** User clicks "Add Column" multiple times quickly.

**Solution:**
- Disable button during request
- Show loading state
- Prevent duplicate submissions
- Backend handles gracefully (creates all)

#### 9. Network Interruption During Move

**Scenario:** User moves card, network fails, card appears in both columns.

**Solution:**
- Use optimistic updates carefully
- Verify with server response
- If move fails, revert UI
- Show error message
- Consider retry mechanism

#### 10. SuperAdmin Creating Project Without PM

**Scenario:** SuperAdmin creates project but doesn't assign project manager.

**Solution:**
- Project is created successfully
- No members initially (not even creator)
- SuperAdmin must manually add members
- Consider UX: Show warning or guide to add PM immediately

---

### Quick Reference

#### Essential Endpoints

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

#### Required Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Decision Trees & Scenarios

### Decision Tree: Can User Create Project?

```
Start: User wants to create project
    │
    ├─ Is user authenticated? → NO → Return 401
    │
    ├─ YES → Is user.role === "SUPERADMIN"? → NO → Return 403 SUPERADMIN_REQUIRED
    │
    └─ YES → Create project → Success
```

### Decision Tree: Can User Add Member?

```
Start: User wants to add member
    │
    ├─ Is user authenticated? → NO → Return 401
    │
    ├─ YES → Is user project member? → NO → Return 403 NOT_PROJECT_MEMBER
    │
    ├─ YES → Is role === "ADMIN"? → YES → Is user SuperAdmin? → NO → Return 403 SUPERADMIN_REQUIRED
    │   │
    │   └─ YES → Add member as ADMIN
    │
    ├─ YES → Is role === "MEMBER"? → Is user Admin or SuperAdmin? → NO → Return 403 ADMIN_REQUIRED
    │   │
    │   └─ YES → Add member as MEMBER
    │
    └─ Does user exist? → NO → Return 404 USER_NOT_FOUND
        │
        └─ YES → Is already member? → YES → Return 400 MEMBER_EXISTS
            │
            └─ NO → Add member → Success
```

### Decision Tree: Can User Access Board?

```
Start: User requests board
    │
    ├─ Is user authenticated? → NO → Return 401
    │
    ├─ YES → Does board exist? → NO → Return 404 BOARD_NOT_FOUND
    │
    ├─ YES → Get board.projectId
    │
    ├─ Is user project member? → NO → Return 403 NOT_PROJECT_MEMBER
    │
    └─ YES → Return board data
```

### Scenario: Token Expires During Request

```
1. User makes request with accessToken
2. Token expired → Backend returns 401
3. Frontend intercepts 401
4. Frontend calls POST /auth/refresh with refreshToken
5. If refresh succeeds:
   ├─ Get new accessToken
   ├─ Retry original request with new token
   └─ Return response
6. If refresh fails:
   ├─ Clear tokens
   ├─ Redirect to login
   └─ Show "Session expired" message
```

### Scenario: Concurrent Card Moves

```
Problem: User moves card A, then quickly moves card B before first request completes

Solution Options:
1. Queue requests (process sequentially)
2. Cancel previous request when new one starts
3. Debounce rapid moves (wait for pause)
4. Optimistic updates with server verification

Recommended: Option 3 (Debounce) + Option 4 (Optimistic)
- Update UI immediately
- Debounce server requests (wait 300ms)
- Send latest state to server
- Verify with server response
```

### Scenario: User Removes Themselves as Admin

```
1. Admin clicks "Remove Member" on themselves
2. Frontend should warn: "You are removing yourself. You will lose admin access."
3. If confirmed:
   ├─ Send DELETE /projects/:projectId/members/:userId
   ├─ Backend removes member
   ├─ User is no longer project member
   ├─ User loses access to project
   └─ Frontend should redirect to projects list
4. Consider: Prevent removing last admin (frontend validation)
```

---

## Implementation Guidelines

### For Frontend Developers

**1. Authentication Flow:**
```javascript
// On app start
- Check for stored tokens
- If tokens exist:
  - Verify token not expired (decode JWT)
  - If expired: Refresh token
  - If refresh fails: Clear tokens, show login
- If no tokens: Show login

// On login
- Call POST /auth/login
- Store tokens securely
- Store user data
- Redirect to projects

// On each API call
- Add Authorization header
- If 401: Refresh token and retry
- If refresh fails: Logout user
```

**2. Project Selection Flow:**
```javascript
// User selects project
1. Store selected projectId
2. Load project members: GET /projects/:projectId/members
3. Load project boards: (need to track boardIds or fetch all)
4. Show project dashboard

// User selects board
1. Store selected boardId
2. Load full board: GET /boards/:boardId
3. Render columns and cards
4. Set up drag-and-drop handlers
```

**3. Card Movement Implementation:**
```javascript
// On card drag end
1. Calculate new columnId and order
2. Update local state optimistically
3. Debounce (300ms) before API call
4. Call PATCH /cards/:cardId/move
5. On success: Keep optimistic update
6. On error: Revert update, show error
```

**4. Column Reordering Implementation:**
```javascript
// On column drag end
1. Calculate new orders for ALL columns
2. Update local state optimistically
3. Call PATCH /columns/reorder with all columns
4. On success: Verify order matches
5. On error: Revert, show error
```

### For AI Agents Working on This System

**Key Understanding Points:**

1. **Hierarchy is Critical:**
   - System → Projects → Boards → Columns → Cards
   - Access is checked at each level
   - User must be project member to access any board/column/card in that project

2. **Roles Matter:**
   - SuperAdmin: System-level, can create projects, assign PMs
   - ADMIN (PM): Project-level, can manage members (but only MEMBER role)
   - MEMBER: Project-level, can create boards/cards but not manage members

3. **Ordering System:**
   - Columns and cards have `order` field (integer)
   - New items get `max(order) + 1`
   - Reordering sends all items with new orders
   - Gaps in order are acceptable

4. **Token Management:**
   - Access token: 15 minutes
   - Refresh token: 7 days
   - Always check expiration
   - Implement automatic refresh

5. **Error Handling:**
   - Always check `success` field
   - Use `code` for programmatic handling
   - Show `message` to users
   - Handle 401, 403, 404 appropriately

6. **Data Relationships:**
   - User ↔ ProjectMember ↔ Project (many-to-many)
   - Project → Board → Column → Card (one-to-many chain)
   - Always verify access through the chain

7. **Optimistic Updates:**
   - Use for better UX
   - Always verify with server
   - Revert on error
   - Show loading states

**Common Mistakes to Avoid:**

1. ❌ Not checking project membership before board access
2. ❌ Allowing Project Admin to assign ADMIN role
3. ❌ Not handling token expiration
4. ❌ Sending only moved column/card in reorder (need all)
5. ❌ Not verifying user exists before adding to project
6. ❌ Not handling concurrent operations
7. ❌ Not implementing optimistic updates for drag-and-drop

**Testing Checklist:**

- [ ] SuperAdmin can create project
- [ ] Regular user cannot create project
- [ ] SuperAdmin can assign project manager
- [ ] Project manager can add members (MEMBER only)
- [ ] Project manager cannot assign ADMIN role
- [ ] Members can create boards/cards
- [ ] Members cannot add other members
- [ ] Token refresh works
- [ ] Card movement works
- [ ] Column reordering works
- [ ] Access denied for non-members
- [ ] Error handling works correctly

---

## Complete System Understanding Summary

### What This System Is

A **hierarchical, role-based Kanban board management system** where:
- SuperAdmins create and manage projects
- Project Managers manage their project teams
- Team Members collaborate on Kanban boards
- All access is controlled through project membership

### How It Works

1. **Authentication:** JWT tokens (access + refresh)
2. **Authorization:** Role-based at system and project levels
3. **Data Structure:** Projects → Boards → Columns → Cards
4. **Access Control:** Project membership required for all resources
5. **Ordering:** Integer-based ordering with gaps allowed

### Key Principles

1. **Security First:** Every request authenticated, every resource access checked
2. **Role Hierarchy:** Clear permission levels prevent privilege escalation
3. **Flexibility:** Cards can move freely, orders can have gaps
4. **User Experience:** Optimistic updates, proper error handling
5. **Scalability:** MongoDB for data, JWT for stateless auth

### For AI Agents

When working on this system:
1. **Always verify access** at each level of hierarchy
2. **Respect role permissions** - check before allowing actions
3. **Handle tokens properly** - refresh on expiration
4. **Use optimistic updates** for better UX
5. **Send complete data** for reordering operations
6. **Verify user existence** before adding to projects
7. **Handle errors gracefully** with proper user messages

---

**This documentation provides complete understanding of the system. Any AI agent or developer should be able to work with this system effectively after reading this document.**

**Last Updated:** January 2024  
**System Version:** 1.0.0
