# Job Portal Backend API — Production Smoke Test Report

## Production base URL

`https://job-backend-iota.vercel.app`

## Summary (what I observed)

- **All API routes that touch MongoDB currently fail on production** with:
  - `500 Internal Server Error`
  - Body: `{"success":false,"message":"Operation \`<collection>.find()\` buffering timed out after 10000ms"}`
- This error typically means **MongoDB is not connected in the deployed environment** (most commonly **`DB_URL` is missing/wrong on Vercel**, or the DB is unreachable from Vercel).
- **CORS is currently allowing** `http://localhost:5173` (from `app.js` default) because `FRONTEND_URL` is likely not set on Vercel:
  - Response header seen: `Access-Control-Allow-Origin: http://localhost:5173`
  - In a browser, this will block calls from your real frontend domain unless you set `FRONTEND_URL` correctly.

## Test methodology

- Tooling: `curl.exe` from Windows PowerShell
- Base: `https://job-backend-iota.vercel.app`
- Auth mechanism (per code): **cookie named `token`** set by `/api/v1/user/login` and `/api/v1/user/register`
- Note: because MongoDB is not reachable, **login/register cannot be completed in production**, so protected endpoints cannot be fully tested with real auth in production right now.

## APIs discovered in code (routes)

From `app.js` the route prefixes are:

- `/api/v1/user/*`
- `/api/v1/job/*`
- `/api/v1/application/*`
- `/api/v1/notification/*`
- `/api/v1/interview/*`

## Production tests executed (real requests + values)

### Job APIs

#### `GET /api/v1/job/getall`

- **Command run**

```bash
curl.exe -sS -i "https://job-backend-iota.vercel.app/api/v1/job/getall"
```

- **Expected (from code)**: `200` with `{ success: true, jobs: [...] }`
- **Actual (production)**: `500`
  - Error: `Operation \`jobs.find()\` buffering timed out after 10000ms`

#### `GET /api/v1/job/search`

- **Values tested**
  - `query=dev`
- **Command run**

```bash
curl.exe -sS -i "https://job-backend-iota.vercel.app/api/v1/job/search?query=dev"
```

- **Expected (from code)**: `200` with `{ success: true, results: <n>, jobs: [...] }`
- **Actual (production)**: `500`
  - Error: `Operation \`jobs.find()\` buffering timed out after 10000ms`

### User APIs (not runnable end-to-end on production yet)

These endpoints require MongoDB to be reachable to work correctly:

- `POST /api/v1/user/register`
  - Body fields required: `name`, `email`, `phone`, `password`, `role` (role enum: `Job Seeker` | `Employer`)
- `POST /api/v1/user/login`
  - Body fields required: `email`, `password`, `role`
- `GET /api/v1/user/logout` (requires auth cookie)
- `GET /api/v1/user/getuser` (requires auth cookie)
- `POST /api/v1/user/otp/request` (requires auth cookie)
- `POST /api/v1/user/otp/verify` (requires auth cookie; body: `{ otp }`)
- `POST /api/v1/user/forgot-password` (body: `{ email }`)
- `PUT /api/v1/user/reset-password` (OTP flow; body: `{ email, otp, password, confirmPassword }`)
- `PUT /api/v1/user/reset-password/:token` (token flow; body: `{ password, confirmPassword }`)
- `PUT /api/v1/user/update-profile` (requires auth cookie; body: any of `{ name, phone, email }`)
- `PUT /api/v1/user/update-password` (requires auth cookie; body: `{ oldPassword, newPassword, confirmPassword }`)
- `PUT /api/v1/user/update-avatar` (requires auth cookie; multipart field: `avatar`)
- `PUT /api/v1/user/upload-resume` (requires auth cookie; multipart field: `resume`)
- `PUT /api/v1/user/update-skills` (requires auth cookie; body supports `{ skills: string[] }` or comma-separated string)
- `DELETE /api/v1/user/delete-account` (requires auth cookie)

### Application APIs (not runnable end-to-end on production yet)

All require auth cookie + MongoDB:

- `POST /api/v1/application/post`
  - Role requirement: **Job Seeker only**
  - Multipart field: `resume`
  - Body required: `name`, `email`, `coverLetter`, `phone`, `address`, `jobId`
- `GET /api/v1/application/employer/getall`
  - Role requirement: **Employer only**
- `GET /api/v1/application/jobseeker/getall`
  - Role requirement: **Job Seeker only**
- `GET /api/v1/application/me`
  - Alias of jobseeker get all
- `DELETE /api/v1/application/delete/:id`
  - Role requirement: **Job Seeker only**
- `PUT /api/v1/application/updatestatus/:id`
  - Role requirement: **Employer only**
  - Body: `{ status }` where status in `Pending | Accepted | Rejected`

### Notification APIs (not runnable end-to-end on production yet)

All require auth cookie + MongoDB:

- `GET /api/v1/notification/my` (query optional: `limit`, `skip`)
- `PATCH /api/v1/notification/read/:id`
- `PATCH /api/v1/notification/read-all`

### Interview APIs (not runnable end-to-end on production yet)

All require auth cookie + MongoDB:

- `GET /api/v1/interview/my`
- `POST /api/v1/interview/schedule`
  - Role requirement: **Employer only**
  - Body required: `{ applicationId, scheduledAt }`
  - Optional: `{ interviewType, locationOrLink, notes }`
- `PATCH /api/v1/interview/cancel/:id`
  - Allowed: employer or candidate who owns the interview

## Deployment issues to fix (so tests can pass)

### 1) Set MongoDB connection string on Vercel

Your DB connect code uses:

- `process.env.DB_URL` (see `database/dbConnection.js`)

On Vercel, set an Environment Variable:

- **`DB_URL`** = your Mongo connection string (e.g. MongoDB Atlas URI)

### 2) Ensure JWT + cookie env vars exist

Auth requires at least:

- **`JWT_SECRET_KEY`**
- **`JWT_EXPIRE`**
- **`COOKIE_EXPIRE`** (number of days)

### 3) Fix CORS for production frontend

Set:

- **`FRONTEND_URL`** = your real frontend origin (e.g. `https://your-frontend.vercel.app`)

Otherwise production responses will continue to send:

- `Access-Control-Allow-Origin: http://localhost:5173`

### 4) (Recommended) Cookie options for HTTPS production

Currently cookies are set with only `httpOnly: true` in `utils/jwtToken.js`.
For cross-site frontend on HTTPS, you typically need:

- `secure: true`
- `sameSite: "none"`

Otherwise browsers may not store/send the cookie from your frontend domain.

