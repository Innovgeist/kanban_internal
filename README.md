# Kanban Board Backend

A full-featured multi-user, multi-project Kanban board backend built with Node.js, Express, TypeScript, and MongoDB.

## Features

- ✅ User authentication with JWT (Access + Refresh tokens)
- ✅ Multi-user support
- ✅ Multi-project support with role-based access (ADMIN/MEMBER)
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

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### Projects

- `POST /projects` - Create a new project
- `GET /projects` - Get all user's projects
- `GET /projects/:projectId` - Get project by ID

### Project Members

- `GET /projects/:projectId/members` - Get all project members
- `POST /projects/:projectId/members` - Add member (ADMIN only)
- `DELETE /projects/:projectId/members/:userId` - Remove member (ADMIN only)

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

## License

ISC
