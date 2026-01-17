# Kanban Board Backend

A full-featured multi-user, multi-project Kanban board backend built with Node.js, Express, TypeScript, and MongoDB.

## 📚 Documentation

- **`COMPLETE_SYSTEM_DOCUMENTATION.md`** - **START HERE** - Complete system understanding, workflows, business logic, and implementation guidelines (for AI agents and developers)
- **`API_DOCUMENTATION.md`** - Complete API reference with all endpoints, examples, and error codes (for frontend developers)
- **`QUICK_START_GUIDE.md`** - Quick reference for common tasks and critical rules

## Features

- ✅ User authentication with JWT (Access + Refresh tokens)
- ✅ **SuperAdmin role** - System-level administrator who can create projects
- ✅ **Project Manager (ADMIN)** - Project-level administrator who can manage members
- ✅ Multi-user support with role-based access (SUPERADMIN/USER at system level, ADMIN/MEMBER at project level)
- ✅ Multi-project support
- ✅ Project member management
- ✅ Board creation and management
- ✅ Column management with reordering
- ✅ Card management with drag-and-drop support
- ✅ Comprehensive authorization and access control
- ✅ Input validation with Zod
- ✅ Error handling
- ✅ Logging with Winston

## Tech Stack

- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **ODM**: Mongoose
- **Auth**: JWT (Access + Refresh)
- **Password Hashing**: bcrypt
- **Validation**: Zod
- **Logging**: Winston
- **Env Management**: dotenv

## Project Structure

```
src/
├─ config/          # Configuration files
├─ modules/         # Feature modules
│   ├─ auth/        # Authentication
│   ├─ users/       # User models
│   ├─ projects/    # Projects, boards, columns, cards
│   │   ├─ projectMembers/
│   │   └─ boards/
│   │       └─ columns/
│   │           └─ cards/
├─ middlewares/     # Express middlewares
├─ utils/           # Utility functions
├─ app.ts           # Express app setup
└─ server.ts        # Server entry point
```

## Setup Instructions

### Prerequisites

- Node.js (LTS version)
- MongoDB (local or cloud instance)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/kanban_board
JWT_ACCESS_SECRET=your-access-token-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

3. Build the project:
```bash
npm run build
```

4. Run the server:
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

## Role System

### System-Level Roles
- **SUPERADMIN**: Can create projects and assign project managers
- **USER**: Regular user (default role)

### Project-Level Roles
- **ADMIN** (Project Manager): Can add/remove members within their project
- **MEMBER**: Regular project member

### Role Hierarchy
1. **SuperAdmin** creates a project
2. **SuperAdmin** assigns a **Project Manager (ADMIN)** to the project (optional during creation)
3. **Project Manager (ADMIN)** can add/remove members (as MEMBER or ADMIN) within their project
4. **SuperAdmin** can also add/remove members to any project and assign project managers

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user (defaults to USER role)
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### Projects

- `POST /projects` - Create a new project (**SuperAdmin only**)
  - Body: `{ name, projectManagerEmail? }` - Optional project manager email
- `GET /projects` - Get all user's projects
- `GET /projects/:projectId` - Get project by ID

### Project Members

- `GET /projects/:projectId/members` - Get all project members
- `POST /projects/:projectId/members` - Add member (SuperAdmin or Project Admin)
  - Body: `{ email, role }` - role can be 'ADMIN' (project manager) or 'MEMBER'
  - **Note**: Only SuperAdmin can assign ADMIN role (project manager)
- `DELETE /projects/:projectId/members/:userId` - Remove member (SuperAdmin or Project Admin)

### Boards

- `POST /projects/:projectId/boards` - Create a new board
- `GET /boards/:boardId` - Get full board view (with columns and cards)

### Columns

- `POST /boards/:boardId/columns` - Create a new column
- `PATCH /columns/reorder` - Reorder columns

### Cards

- `POST /columns/:columnId/cards` - Create a new card
- `PATCH /cards/:cardId/move` - Move/reorder a card

## Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Error Response Format

```json
{
  "success": false,
  "message": "Human readable error message",
  "code": "ERROR_CODE"
}
```

## Success Response Format

```json
{
  "success": true,
  "data": { ... }
}
```

## Creating the First SuperAdmin

To create the first SuperAdmin user, you need to manually update the database or use a script. Here's how:

### Option 1: Using MongoDB Shell

```javascript
// Connect to your MongoDB database
use kanban_board

// Update a user to SuperAdmin (replace with actual user email)
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "SUPERADMIN" } }
)
```

### Option 2: Using a Script

Create a script file `scripts/create-superadmin.ts`:

```typescript
import mongoose from 'mongoose';
import { User } from '../src/modules/users/user.model';
import { config } from '../src/config/env';

async function createSuperAdmin() {
  await mongoose.connect(config.mongodbUri);
  
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email: npm run create-superadmin <email>');
    process.exit(1);
  }

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: 'SUPERADMIN' },
    { new: true }
  );

  if (!user) {
    console.error('User not found with email:', email);
    process.exit(1);
  }

  console.log('SuperAdmin created successfully:', user.email);
  await mongoose.disconnect();
}

createSuperAdmin();
```

Then add to `package.json`:
```json
"scripts": {
  "create-superadmin": "ts-node scripts/create-superadmin.ts"
}
```

Run: `npm run create-superadmin admin@example.com`

## License

ISC
