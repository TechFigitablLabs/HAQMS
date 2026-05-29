# HAQMS - Hospital Appointment, Queue, and Care-Flow Management System

HAQMS is a full-stack hospital operations platform built for the Figital Labs full-stack web development internship assignment. It supports staff login, patient registration, doctor and appointment management, real-time queue monitoring, medical history access, and admin reporting.

## System Diagrams

### UML Class Diagram

```mermaid
classDiagram
  class User {
    String id
    String email
    String password
    String name
    Role role
    DateTime createdAt
  }

  class Doctor {
    String id
    String userId
    String name
    String specialization
    String department
    Float consultationFee
    Int experience
    String availableFrom
    String availableTo
  }

  class Patient {
    String id
    String name
    String email
    String phoneNumber
    Int age
    String gender
    String medicalHistory
  }

  class Appointment {
    String id
    String patientId
    String doctorId
    DateTime appointmentDate
    String reason
    AppointmentStatus status
  }

  class QueueToken {
    String id
    Int tokenNumber
    String patientId
    String doctorId
    String appointmentId
    QueueStatus status
    DateTime createdAt
  }

  User "1" --> "0..1" Doctor : profile
  Doctor "1" --> "many" Appointment : handles
  Patient "1" --> "many" Appointment : books
  Doctor "1" --> "many" QueueToken : serves
  Patient "1" --> "many" QueueToken : receives
  Appointment "0..1" --> "many" QueueToken : linked token
```

### DFD Level 0

```mermaid
flowchart LR
  Patient["Patient / Public Viewer"]
  Receptionist["Receptionist"]
  Doctor["Doctor"]
  Admin["Admin"]

  Frontend["Next.js Frontend"]
  Backend["Express API + Socket.IO"]
  DB[("PostgreSQL Database")]

  Patient -->|"View live queue"| Frontend
  Receptionist -->|"Register patient, book appointment, create token"| Frontend
  Doctor -->|"View appointments, update queue status"| Frontend
  Admin -->|"View reports and system data"| Frontend

  Frontend -->|"REST API requests"| Backend
  Backend -->|"Read/write data through Prisma"| DB
  Backend -->|"Queue events over WebSocket"| Frontend
```

### DFD Level 1

```mermaid
flowchart TD
  Login["Login and role selection"]
  PatientMgmt["Patient management"]
  DoctorMgmt["Doctor management"]
  AppointmentMgmt["Appointment scheduling"]
  QueueMgmt["Queue token workflow"]
  Reports["Reports and audit view"]
  Socket["Socket.IO live events"]
  DB[("PostgreSQL")]

  Login -->|"JWT token"| PatientMgmt
  Login -->|"JWT token"| DoctorMgmt
  Login -->|"JWT token"| AppointmentMgmt
  Login -->|"JWT token"| QueueMgmt
  Login -->|"Admin role"| Reports

  PatientMgmt --> DB
  DoctorMgmt --> DB
  AppointmentMgmt --> DB
  QueueMgmt --> DB
  Reports --> DB

  QueueMgmt -->|"queue:created / queue:updated / queue:changed"| Socket
  Socket -->|"Live queue refresh"| QueueScreen["Public queue page"]
  Socket -->|"Live dashboard refresh"| Dashboard["Staff dashboard"]
```

### Use Case Diagram

```mermaid
flowchart LR
  ReceptionistActor["Receptionist"]
  DoctorActor["Doctor"]
  AdminActor["Admin"]
  PublicActor["Public / Patient"]

  subgraph HAQMS["HAQMS Platform"]
    UCLogin["Login"]
    UCRegisterPatient["Register patient"]
    UCBookAppointment["Book appointment"]
    UCCreateToken["Create queue token"]
    UCViewQueue["View live queue"]
    UCUpdateQueue["Update queue status"]
    UCMedicalHistory["View medical history"]
    UCDoctorReports["Load doctor audit report"]
    UCManageDoctors["Manage doctors"]
  end

  ReceptionistActor --> UCLogin
  ReceptionistActor --> UCRegisterPatient
  ReceptionistActor --> UCBookAppointment
  ReceptionistActor --> UCCreateToken

  DoctorActor --> UCLogin
  DoctorActor --> UCUpdateQueue
  DoctorActor --> UCMedicalHistory

  AdminActor --> UCLogin
  AdminActor --> UCDoctorReports
  AdminActor --> UCManageDoctors

  PublicActor --> UCViewQueue
```

## Project Overview

HAQMS is designed for hospital staff, not as a direct patient self-service portal. Patients can view the public queue monitor, while authenticated staff operate the system.

- Receptionists register patients, schedule appointments, and generate queue tokens.
- Doctors view appointments, access patient history, and update queue status.
- Admins review system-wide reports, doctor performance, and operational data.
- Public users can view the live queue monitor without login.

## Main Features

- Staff authentication with JWT.
- Role-based workflows for Admin, Doctor, and Receptionist.
- PostgreSQL database connected through Prisma ORM.
- Patient records and medical history page.
- Doctor and appointment management.
- Queue token creation and status updates.
- Socket.IO based live queue updates.
- Public queue monitor without authentication.
- Improved responsive frontend for desktop and mobile users.
- Submission-safe Git setup with `.env`, `.next`, and `node_modules` ignored.

## Tech Stack

### Frontend

- Next.js
- React
- CSS modules/global CSS
- Lucide React icons
- Socket.IO Client

### Backend

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- Socket.IO
- JWT authentication
- bcryptjs password hashing

### Tooling

- Docker Compose for PostgreSQL
- npm workspaces-style root scripts
- Git and GitHub pull request workflow

## Project Structure

```text
HAQMS/
|-- backend/
|   |-- prisma/
|   |   |-- schema.prisma
|   |   |-- seed.js
|   |   `-- init.sql
|   |-- src/
|   |   |-- middleware/
|   |   |-- routes/
|   |   `-- index.js
|   |-- .env.example
|   |-- package.json
|   `-- package-lock.json
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |   |-- dashboard/
|   |   |   |-- login/
|   |   |   |-- patients/[id]/history-records/
|   |   |   |-- queue/
|   |   |   |-- globals.css
|   |   |   `-- page.js
|   |   `-- components/
|   |-- package.json
|   `-- package-lock.json
|-- docker-compose.yml
|-- package.json
|-- .gitignore
`-- README.md
```

## Database Models

The Prisma schema contains these main models:

- `User`: login account for Admin, Doctor, and Receptionist.
- `Doctor`: doctor profile, department, specialization, timing, and fee.
- `Patient`: patient details and medical history.
- `Appointment`: patient and doctor booking record.
- `QueueToken`: live queue token assigned to a patient and doctor.

## Environment Variables

Create `backend/.env` using `backend/.env.example` as reference:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/haqms?schema=public"
PORT=5000
CLIENT_URL="http://localhost:3000"
JWT_SECRET="replace-with-a-strong-secret"
```

Important: do not commit the real `.env` file to GitHub.

## How To Run Locally

### 1. Install dependencies

From the root folder:

```bash
npm install
npm run install:all
```

### 2. Start PostgreSQL

If using Docker:

```bash
docker-compose up -d
```

The project is configured to use PostgreSQL on port `5433` to avoid conflict with a local PostgreSQL installation on port `5432`.

### 3. Setup database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
```

If Prisma migration is not available in your local setup, run the SQL from:

```text
backend/prisma/init.sql
```

### 4. Start backend

```bash
cd backend
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

### 5. Start frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

## Default Demo Accounts

After running the seed script, use the seeded accounts from `backend/prisma/seed.js`.

Common demo password:

```text
password123
```

Typical roles:

- Admin: manages reports and system view.
- Doctor: handles queue and patient history.
- Receptionist: registers patients and creates appointments.

## API Overview

Base URL:

```text
http://localhost:5000/api
```

Common routes:

```text
POST   /auth/login
POST   /auth/register
GET    /patients
POST   /patients
GET    /patients/:id
GET    /doctors
POST   /doctors
GET    /appointments
POST   /appointments
PATCH  /appointments/:id
GET    /queue
POST   /queue
PATCH  /queue/:id
GET    /reports
```

## Socket.IO Live Queue

The backend creates a Socket.IO server on the same server as Express. Queue changes emit live events to connected frontend clients.

Events used:

```text
queue:created
queue:updated
queue:changed
```

Where to check:

- Open `http://localhost:3000/queue`.
- Open browser DevTools.
- Go to Network tab.
- Filter by `WS`.
- You should see a Socket.IO connection to `localhost:5000`.
- Create or update a queue token from the staff dashboard and the queue page should update without a manual refresh.

## Assignment Notes

This project intentionally demonstrates full-stack understanding:

- Frontend page building and responsive UI.
- Backend REST API development.
- PostgreSQL database design with Prisma.
- Authentication and role-based workflows.
- WebSocket-based live updates.
- GitHub-ready submission with generated files excluded.

## GitHub Submission Notes

Do not push:

- `node_modules/`
- `.next/`
- `.env`
- large build/cache files

These are already ignored in `.gitignore`.

## Author

Developed by Alok for the Figital Labs full-stack web development internship assignment.
