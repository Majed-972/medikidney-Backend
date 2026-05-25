# MediKidney Backend

A production-ready, highly secure, and modular server-side system built with **NestJS (v11)** and **Prisma ORM (v7)**. It is custom-tailored to automate specialized kidney dialysis hospital departments, clinic schedules, Outpatient Clinics, and multi-role medical workflows.

---

## Features

- **Advanced Role-Based Access Control (RBAC):** Strict permissions segregated across 8 clinical and patient roles.
- **Dialysis Scheduling Engine:** Dynamic machine-slot allocation based on shifts and weekdays to prevent double-bookings.
- **Intra-Session Tracking:** Multi-phase vital signs, medication logs, symptom monitoring, and fluid balance tracking.
- **Secure Cloud Storage:** Automated creation of time-restricted secure URLs (Signed URLs) via **Supabase Storage** for radiology/test PDFs.
- **Hybrid Mailer Integration:** Built-in connection to **Resend API** with SMTP fallback (Gmail) for instant OTP and credential delivery.
- **Patient Notification Engine:** Direct device-token registration and automated alerts using the **Expo Push Notifications SDK**.
- **Automated Input Sanitization:** Global Pipes utilizing `class-validator` and `class-transformer` to prevent malicious payloads.

---

## Technologies Used

- **NestJS v11** (TypeScript backend framework)
- **Prisma ORM v7** (Modern database mapping)
- **PostgreSQL** (Relational database)
- **Supabase Storage** (Secure cloud file storage)
- **Passport.js & JWT** (Stateless authentication)
- **Resend API** (Transactional email provider)
- **Expo Push SDK** (Mobile push notification delivery)
- **Swagger / OpenAPI 3.0** (Interactive API documentation)

---

## Folder Structure

```text
src/
├── auth/                         # JWT authentication, Guards, and RBAC strategies
├── users/                        # Core user profile management (Admin operations)
├── dialysis-scheduling/          # Machine & shift assignment engine to prevent overlaps
├── dialysis-sessions/            # Dialysis session initialization and state machine
├── dialysis-session-details/     # Vital signs, medications, and intra-session symptoms
├── clinic-consultations/         # Clinic appointments, booking restrictions, no-show blocker
├── doctor-schedule/              # Physician availability slots configuration
├── medical-tests/                # Lab test request creation, results, and PDF uploads
├── prescriptions/                # Doctor prescription engine and pharmacist dispensing flow
├── radiology-requests/           # X-ray request uploads and signed URL retrievals
├── nutrition-program/            # Allowed/forbidden foods and customizable meal plans
├── notifications/                # Mobile push token registration and Expo sender
├── mail/                         # Transactional mail delivery (Resend/SMTP)
└── common/                       # Supabase file upload engine & shared utilities
```

---

## System Roles & Capabilities

| Role | Key Capabilities |
| --- | --- |
| **👑 Administrator** | Manages system staff accounts, suspends or restores system access. |
| **🥼 Doctor** | Manages clinic schedules, assigns dialysis slots, orders lab tests/radiology, issues prescriptions. |
| **🩺 Nurse** | Starts/completes dialysis sessions, logs patient vital signs, records symptoms and medications. |
| **🧪 Lab Specialist** | Receives laboratory orders, uploads final test result PDFs securely to the cloud. |
| **🖼️ Radiologist** | Manages radiology request orders, uploads x-ray imaging reports to Supabase. |
| **💊 Pharmacist** | Reviews active patient prescriptions, dispenses medicines, and updates status. |
| **🍎 Nutritionist** | Builds customizable weekly breakfast, lunch, and dinner plans for kidney failure patients. |
| **👤 Patient** | Reviews personal medical history, books outpatient clinics, tracks dialysis slots, receives notifications. |

---

## How to Run

### 1. Install Dependencies

Clone the repository and install the npm packages:

```bash
git clone https://github.com/your-username/medikidney-backend.git
cd medikidney-backend
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory based on the `.env.example` template:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/medikidney?schema=public"
JWT_SECRET="your-super-long-random-jwt-secret-key"

SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET="medical-files"

RESEND_API_KEY="re_yourApiKey"
MAIL_FROM_EMAIL="no-reply@yourdomain.com"
```

### 3. Setup Database & Seed

Run migrations to initialize the PostgreSQL schema and seed the initial system administrator account:

```bash
npx prisma migrate dev --name init_db
npx prisma db seed
```

### 4. Start the Application

To run in development mode:

```bash
npm run start:dev
```

To build and run in production:

```bash
npm run build
npm run start:prod
```

---

## Interactive API Documentation

Once the backend server is running, you can explore, test, and interact with the endpoints via Swagger UI:

- **Swagger Docs URL:** `http://localhost:3050/api`

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

Developed by Majed.
