# Kanban Board MVP – Backend Technical Document

> **Scope**: This document strictly defines **how to build the backend** for a multi-user, multi-project Kanban board MVP using **Node.js + MongoDB**.  
> No frontend. No business fluff. Only architecture, schemas, APIs, and workflows.

---

## 1. Backend Tech Stack (Fixed)

- **Runtime**: Node.js (LTS)
- **Framework**: Express.js (minimal, predictable)
- **Language**: TypeScript
- **Database**: MongoDB
- **ODM**: Mongoose
- **Auth**: JWT (Access + Refresh)
- **Password Hashing**: bcrypt
- **Validation**: Zod
- **Logging**: Winston
- **Env Management**: dotenv

---

## 2. High-Level Backend Architecture

```
src/
├─ config/
├─ modules/
│   ├─ auth/
│   ├─ users/
│   ├─ projects/
│   │   ├─ projectMembers/
│   │   └─ boards/
│   │       └─ columns/
│   │           └─ cards/
├─ middlewares/
├─ utils/
├─ app.ts
└─ server.ts
```

**Rule**: Each module owns its routes, controllers, services, and models.

---

## 3. Core Data Models (MongoDB Schemas)

### 3.1 User Schema

```ts
{
  _id: ObjectId,
  name: string,
  email: string (unique),
  passwordHash: string,
  createdAt: Date
}
```

---

### 3.2 Project Schema

```ts
{
  _id: ObjectId,
  name: string,
  createdBy: ObjectId (User),
  createdAt: Date
}
```

---

### 3.3 ProjectMember Schema

```ts
{
  _id: ObjectId,
  projectId: ObjectId,
  userId: ObjectId,
  role: 'ADMIN' | 'MEMBER'
}
```

**Indexes**
- (projectId, userId) unique

---

### 3.4 Board Schema

```ts
{
  _id: ObjectId,
  projectId: ObjectId,
  name: string,
  createdAt: Date
}
```

---

### 3.5 Column Schema

```ts
{
  _id: ObjectId,
  boardId: ObjectId,
  name: string,
  order: number
}
```

---

### 3.6 Card Schema

```ts
{
  _id: ObjectId,
  columnId: ObjectId,
  title: string,
  description?: string,
  order: number,
  createdBy: ObjectId,
  createdAt: Date
}
```

---

## 4. Authentication System

### 4.1 Token Strategy

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

```ts
Access Token Payload:
{
  userId,
  email
}
```

---

### 4.2 Auth Flow

#### Register
1. Validate input
2. Hash password
3. Create user
4. Issue tokens

#### Login
1. Verify credentials
2. Issue tokens

#### Refresh
1. Validate refresh token
2. Issue new access token

---

### 4.3 Auth Middleware

- Extract JWT from Authorization header
- Verify token
- Attach user to req.user

---

## 5. Authorization Rules (Critical)

### Project Access Guard
User must:
- Exist in ProjectMember collection

### Admin-Only Actions
- Add/remove users
- Change roles
- Delete project

Implemented as middleware:
```
requireProjectMember
requireProjectAdmin
```

---

## 6. API Design (Workflow-Based)

### 6.1 Auth Routes

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
```

---

### 6.2 Project Management

#### Create Project
```
POST /projects
Body: { name }
```

Flow:
1. Create project
2. Create ProjectMember (ADMIN)

---

#### Get User Projects
```
GET /projects
```

---

### 6.3 Project Members

#### Add Member (ADMIN)
```
POST /projects/:projectId/members
Body: { email, role }
```

---

#### Remove Member (ADMIN)
```
DELETE /projects/:projectId/members/:userId
```

---

### 6.4 Boards

#### Create Board
```
POST /projects/:projectId/boards
Body: { name }
```

---

#### Get Board (Full Kanban View)
```
GET /boards/:boardId
```

Returns:
- board
- columns (ordered)
- cards grouped by column

---

### 6.5 Columns

#### Create Column
```
POST /boards/:boardId/columns
Body: { name }
```

---

#### Reorder Columns
```
PATCH /columns/reorder
Body: [{ columnId, order }]
```

---

### 6.6 Cards

#### Create Card
```
POST /columns/:columnId/cards
Body: { title, description? }
```

---

#### Move / Reorder Card
```
PATCH /cards/:cardId/move
Body: { columnId, order }
```

---

## 7. Ordering Logic (Important)

- `order` is integer-based
- On insert: assign max(order) + 1
- On reorder:
  - Bulk update
  - No gaps enforcement needed

---

## 8. Error Handling Standard

```json
{
  "success": false,
  "message": "Human readable error",
  "code": "ERROR_CODE"
}
```

---

## 9. Security Considerations

- Rate limit auth routes
- Validate all ObjectIds
- Never trust client-side role
- Hash passwords only once

---

## 10. MVP Exit Criteria (Backend Done When)

- User can authenticate
- Create project
- Invite users
- Create board
- Drag columns
- Drag cards
- Access strictly enforced

No more. No less.

---

## 11. What Comes After (Not Now)

- WebSockets
- Audit logs
- Soft deletes
- Board templates

Stop here. Build this first.

