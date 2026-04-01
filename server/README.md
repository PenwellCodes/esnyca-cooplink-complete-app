## ESNYCA CoopLink Server (SQL Server + JWT + ImgBB)

### Setup

1. Create a SQL Server database and run:
- `../sql/schema.sql`

2. Copy env:
- `cp .env.example .env` (on Windows, copy manually)

3. Install & run:

```bash
cd server
npm install
npm run dev
```

### Env vars
- **SQL Server**: `MSSQL_SERVER`, `MSSQL_DATABASE`, `MSSQL_USER`, `MSSQL_PASSWORD`
- **JWT**: `JWT_SECRET`, `JWT_EXPIRES_IN`
- **ImgBB**: `IMGBB_API_KEY`

### Endpoints (initial)
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /upload/image` (Bearer token)
- `GET /news`

### Important migration note (Firebase → SQL Auth)
Firebase password hashes **cannot** be exported. When migrating existing users:
- import their profile data into `dbo.Users`
- set a temporary password OR require “reset password” in the new system.

