# TaskFlow

A real-time collaborative Kanban task board (Trello clone) built with React, Node.js, and Socket.IO.

## Features

- User registration and login (JWT auth)
- Create and manage boards with default columns (To Do, In Progress, Done)
- Add, edit, delete, and drag-and-drop tasks
- Real-time sync across all viewers via Socket.IO
- Optimistic UI updates for drag and drop

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React, TypeScript, Vite, Tailwind CSS, dnd-kit, socket.io-client |
| Backend   | Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, Socket.IO |
| Database  | PostgreSQL (Neon for production) |

## Project Structure

```
server/          Express API + Socket.IO server
client/          React SPA (Vite)
```

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (local Docker or Neon)

### Server

```bash
cd server
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev
npm run dev
```

### Client

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

## Deployment

### Database — Neon
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string into `DATABASE_URL`

### Server — Render
1. Push code to GitHub
2. Create a new Web Service on [render.com](https://render.com)
3. Build command: `npm install && npx prisma migrate deploy && npm run build`
4. Start command: `npm start`
5. Add environment variables: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CLIENT_URL`

### Client — Vercel
1. Push code to GitHub
2. Import the `client` folder into [vercel.com](https://vercel.com)
3. Add environment variable: `VITE_API_URL` (your Render URL)
4. Update `CLIENT_URL` in Render to your Vercel URL

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Get JWT |
| GET | /auth/me | Current user |
| GET | /boards | List user's boards |
| POST | /boards | Create board (+ default columns) |
| GET | /boards/:id | Board with columns and tasks |
| POST | /columns/:columnId/tasks | Create task |
| PATCH | /tasks/:id | Update task |
| PATCH | /tasks/:id/move | Move task |
| DELETE | /tasks/:id | Delete task |
| GET | /health | Health check |

## Architecture

- **Auth**: JWT in Authorization header, verified by middleware on every protected route
- **Ownership**: Every board/column/task query filters by `ownerId` from the JWT
- **Real-time**: Socket.IO rooms per board (`board:<id>`), JWT-authenticated connections
- **Optimistic UI**: Drag-and-drop updates state immediately, rolls back on API error
- **Position ordering**: Integer positions with transactional reordering on move/delete
