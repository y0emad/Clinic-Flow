# ClinicFlow

A REST API for booking appointments at a single-doctor clinic.
Patients sign up, see the free time slots for a service and book one; the doctor manages services, working hours, days off and the appointment list.

The focus of the project is **correct scheduling**: no double booking (even under concurrent requests), correct times across daylight-saving changes, and one single place that decides what "available" means.

## Tech stack

| Area | Tools |
|---|---|
| Runtime | Node.js, TypeScript (ESM), Express 5 |
| Database | PostgreSQL 17 (Docker), Drizzle ORM + drizzle-kit migrations |
| Validation | express-validator |
| Auth | JWT, bcrypt, email OTP verification |
| Dates & timezones | Luxon |
| Email | Nodemailer (Ethereal in development) |
| Security | helmet, cors, express-rate-limit |
| Testing | Vitest, Supertest |
| DevOps | Docker (multi-stage build), Docker Compose, GitHub Actions CI |

## Features

**Patients**
- Sign up with email verification (6-digit OTP), login, forgot / reset password
- Browse active services and see free slots for any day (up to 60 days ahead)
- Book an appointment, list their own appointments (filter + pagination), cancel
- Email on booking confirmation and on cancellation

**Doctor**
- Create / update / delete services (soft delete, old appointments keep their service)
- Set the weekly working hours and add days off (time off)
- See all appointments (filter by day and status, pagination) with patient details
- Dashboard stats: today's appointments, upcoming, this month's revenue and no-show rate
- Cancel any upcoming appointment, mark past ones as `COMPLETED` or `NO_SHOW`

## Design decisions

### 1. Double booking is blocked by the database, not only by the code
Checking "is this slot free?" and then inserting is a race: two patients can pass the check at the same moment.
So the `appointments` table has a Postgres **exclusion constraint**:

```sql
EXCLUDE USING gist (tstzrange(start_at, end_at) WITH &&) WHERE (status = 'BOOKED')
```

Two `BOOKED` appointments whose time ranges overlap can never both exist. If two requests race, one gets `201` and the other gets a clean `409` (Postgres error `23P01`, mapped in the error handler).
Cancelled appointments are ignored by the constraint, so a cancelled slot can be booked again.

### 2. Timezones and daylight saving
- Working hours are stored as **clinic local time** (`15:00`–`18:00`), because that's how the doctor thinks about them.
- Appointments and time off are stored as **UTC** `timestamptz`.
- Slots are generated in `Africa/Cairo` with Luxon and converted to UTC, so a slot at 15:00 stays at 15:00 local time when Egypt moves between UTC+2 and UTC+3.

### 3. One source of truth for availability
`getAvailableSlots(duration, date)` in `src/utils/slots.ts` is used by **both** `GET /availability` and `POST /appointments`.
It takes the working hours for that weekday, makes a slot every 15 minutes, then removes past slots, slots that overlap time off and slots that overlap booked appointments.
The booking endpoint only accepts a `startAt` that is one of these slots, so what the patient sees and what the server accepts can never disagree.

### 4. Business rules
- A patient can have **one appointment per day** and **at most 3 upcoming** appointments.
- Patients can cancel **at least 2 hours** before the appointment; the doctor can cancel any time before it starts.
- Status changes use `WHERE status = 'BOOKED'` in the `UPDATE` itself, so two requests can't both change the same appointment.
- Price and end time are copied from the service at booking time, so later price changes don't affect old appointments.

### 5. Auth & security
- Passwords and OTPs are hashed with bcrypt. OTPs expire after 10 minutes, allow 5 wrong tries, and can be re-sent once per minute.
- Forgot password always returns the same answer, so it can't be used to find out which emails are registered.
- Rate limits: 10 auth requests / 15 min per IP, 10 booking attempts / hour per patient.
- Role middleware (`authDoc`, `authPatient`), and a patient asking for another patient's appointment gets `404`, not `403`, so ids can't be probed.
- One global error handler: `AppError` for expected errors, unique / exclusion violations mapped to `409`, everything else logged and returned as a generic `500`.

## Getting started

**Requirements:** Node.js 20+, Docker.

```bash
git clone <repo-url> clinicflow
cd clinicflow
npm install

cp .env.example .env        # then fill in JWT_SECRET, email and doctor values

docker compose up -d db     # starts PostgreSQL on port 5432
npm run db:migrate          # creates the tables
npm run db:seed             # creates the doctor account from DOC_* in .env

npm run dev                 # http://localhost:3000
```

### Run everything with Docker

No Node.js needed on the machine, only Docker and a filled `.env`:

```bash
docker compose up -d --build                    # PostgreSQL + the API on http://localhost:3000
docker compose exec api node dist/db/seed.js    # create the doctor account (first time only)
```

- The `Dockerfile` is multi-stage: the first stage compiles TypeScript, the final image has only the compiled JS and production dependencies, and runs as the non-root `node` user.
- On start the container applies any pending migrations, then starts the server.
- The API waits until PostgreSQL is healthy, and has its own healthcheck on `GET /health`.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the server with auto-reload |
| `npm run db:generate` | Create a migration from changes in `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Create the doctor account |
| `npm run db:studio` | Open Drizzle Studio to browse the data |
| `npm test` | Run the test suite (`npm run test:watch` to re-run on save) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server (`npm run start:migrate` applies migrations without drizzle-kit) |

## API

A ready Postman collection is in [`postman/ClinicFlow.postman_collection.json`](postman/ClinicFlow.postman_collection.json). It saves tokens and ids automatically between requests.

Auth: `Authorization: Bearer <token>`. 🌐 public · 🧑 patient · 🩺 doctor

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/signup` | 🌐 | Create a patient account, sends an OTP |
| POST | `/auth/verify-otp` | 🌐 | Verify the email |
| POST | `/auth/resend-otp` | 🌐 | Send a new verification OTP |
| POST | `/auth/login` | 🌐 | Returns a JWT (24h) |
| GET | `/auth/me` | 🧑 🩺 | The logged-in user (restore the session on page load) |
| POST | `/auth/forgot-password` | 🌐 | Send a reset OTP |
| POST | `/auth/reset-password` | 🌐 | Set a new password with the OTP |

### Users
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/users` | 🩺 | List users |

### Services
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/services` | 🌐 | Active services |
| GET | `/services/:id` | 🌐 | One service |
| POST | `/services` | 🩺 | Create |
| PATCH | `/services/:id` | 🩺 | Update |
| DELETE | `/services/:id` | 🩺 | Soft delete |

### Schedule
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/schedule/working-hours` | 🌐 | Weekly hours (`dayOfWeek` 0 = Sunday) |
| PUT | `/schedule/working-hours` | 🩺 | Replace the whole week |
| GET | `/schedule/time-off` | 🩺 | Upcoming days off |
| POST | `/schedule/time-off` | 🩺 | Add time off (max 30 days) |
| DELETE | `/schedule/time-off/:id` | 🩺 | Remove time off |

### Availability
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/availability/:serviceId?date=YYYY-MM-DD` | 🌐 | Free slots for that day |

### Appointments
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/appointments` | 🧑 | Book `{ serviceId, startAt, notes? }` |
| GET | `/appointments/me?status=&page=&limit=` | 🧑 | My appointments |
| GET | `/appointments?status=&date=&page=&limit=` | 🩺 | All appointments (upcoming by default) |
| GET | `/appointments/stats` | 🩺 | Dashboard: today, upcoming, this month (completed, no-show, cancelled, revenue, no-show rate) |
| PATCH | `/appointments/:id/cancel` | 🧑 🩺 | Cancel |
| PATCH | `/appointments/:id/status` | 🩺 | `{ status: "COMPLETED" \| "NO_SHOW" }` |

### Example: get slots, then book

```http
GET /availability/2b05425c-57a1-4bed-8e03-1e6b063c8253?date=2026-11-07
```
```json
{
  "success": true,
  "date": "2026-11-07",
  "service": { "id": "2b05425c-57a1-4bed-8e03-1e6b063c8253", "name": "Consultation", "durationMinutes": 30 },
  "closed": false,
  "slots": [
    { "startAt": "2026-11-07T14:00:00.000Z", "endAt": "2026-11-07T14:30:00.000Z", "time": "16:00" },
    { "startAt": "2026-11-07T14:15:00.000Z", "endAt": "2026-11-07T14:45:00.000Z", "time": "16:15" }
  ]
}
```

```http
POST /appointments
Authorization: Bearer <patient token>

{ "serviceId": "2b05425c-57a1-4bed-8e03-1e6b063c8253", "startAt": "2026-11-07T14:00:00.000Z" }
```

Every response has `success`. Errors (validation included) always look like `{ "success": false, "msg": "..." }`.

## Testing

```bash
npm test
```

**29 integration tests** (Vitest + Supertest) that call the real API against a real PostgreSQL database:

- **No double booking:** two patients book the same slot at the same moment (`Promise.all`), exactly one gets `201`, the other `409`.
- **Availability:** 15-minute grid in clinic time, booked slots and time off removed, cancelled slots come back, closed days, date limits.
- **Booking rules:** only free slots, one per day, max 3 upcoming, cancel notice, status changes only after the start, patients can't touch other patients' appointments.
- **Auth:** signup → OTP → verify → login → `/auth/me`, forgot / reset password (same answer for unknown emails, OTP locked after 5 wrong tries).

How it works:
- Tests use a separate database, `ClinicFlow_test`. It is **created and migrated automatically** before the run (`tests/globalSetup.ts`), and every test starts from empty tables.
- `.env.test` holds test-only values (no real secrets), so the tests run on a fresh clone with just `docker compose up -d`.
- Emails are mocked: nothing is sent, and the tests read the OTP from the mock.
- Rate limits are skipped when `NODE_ENV=test`.
- `src/app.ts` builds the Express app and `src/server.ts` only starts it, so Supertest can use the app without opening a port.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) runs the typecheck and all tests against a Postgres service on every push and pull request, then checks that the Docker image builds.

## Project structure

```
src/
├── app.ts               # Express app: middleware + routes (used by the tests)
├── server.ts            # startup checks + listen
├── db/migrate.ts        # applies migrations in production / Docker
├── db/                  # Drizzle schema, connection, seed
├── Routes/              # one router per resource
├── Validator/           # express-validator chains
├── Controllers/         # request handlers
├── Middleware/          # auth, rate limits, validation result, error handler
├── utils/               # slot generation, emails, AppError
└── types/               # req.user type
tests/                   # Vitest + Supertest integration tests
drizzle/                 # SQL migrations (incl. the custom exclusion constraint)
.github/workflows/      # CI: typecheck, tests, Docker build
postman/                 # Postman collection
```

## Roadmap

- [ ] Deployment (Render / Railway + Neon)

- [ ] Email reminder the day before the appointment
- [ ] Invalidate old tokens after a password reset
- [ ] React frontend
