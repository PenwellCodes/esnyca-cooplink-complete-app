## ESNYCA CoopLink Server (SQL Server + JWT + ImgBB)

### Setup

1. Create a SQL Server database and run:
- `../sql/schema.sql`

2. Fill `server/.env` with your real server values.

3. Install & run:

```bash
cd server
npm install
npm run dev
```

### Env vars
- **SQL Server**: `MSSQL_SERVER`, `MSSQL_PORT`, `MSSQL_INSTANCE` (optional), `MSSQL_DATABASE`, `MSSQL_USER`, `MSSQL_PASSWORD`
- **JWT**: `JWT_SECRET`, `JWT_EXPIRES_IN`
- **ImgBB**: `IMGBB_API_KEY`

### Remote SQL Server checklist
- Enable **SQL Server Authentication** (mixed mode)
- Create a dedicated login (avoid using `sa` in production)
- Ensure login has rights on `Esnyca_app`
- Enable TCP/IP in SQL Server Configuration Manager
- Open firewall for SQL port (usually 1433) from API server IP
- If DB is on another machine, use host/IP in `MSSQL_SERVER` (not local instance name)

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

