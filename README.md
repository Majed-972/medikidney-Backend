# 🏥 MediKidney Backend System (نظام إدارة قسم غسيل الكلى المتكامل)

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  <img src="https://prisma.blob.core.windows.net/assets/prisma-logo.svg" width="100" style="margin-left: 20px;" alt="Prisma Logo" />
</p>

---

## 🌐 English Overview

**MediKidney Backend** is a production-ready, highly secure, and modular server-side system developed using **NestJS (v11)** and **Prisma ORM (v7)**. It is custom-built to manage specialized kidney dialysis hospital departments and outpatient clinics. 

The system implements strict **Role-Based Access Control (RBAC)** across 8 user groups (Administrators, Doctors, Nurses, Patients, Nutritionists, Radiologists, Pharmacists, and Lab Specialists), handling everything from real-time dialysis session logging, patient vital signs, clinical schedules, laboratory requests, prescriptions, nutritional plans, and real-time push notifications.

### 🌟 Key Highlights
* **Advanced Multi-Role Architecture:** Fully segregated workflows and controllers for 8 healthcare and patient roles.
* **Dialysis Management Engine:** Schedules dialysis machine slots based on shifts and weekdays to avoid double bookings, and records multi-phase vital signs and intra-session medication administrations.
* **Hybrid Email Delivery Provider:** Dynamic integration with **Resend HTTP API** with SMTP fallback (Gmail) and a local console logger for development mode.
* **Secure PDF and Image Cloud Storage:** Seamless integration with **Supabase Storage** with auto-generated time-restricted secure URLs (Signed URLs) for radiology requests and patient reports.
* **Robust Inputs Security & Strict Validation:** Powered by `class-validator` and `class-transformer` with automated pipe whitelisting to eliminate any malicious payloads.
* **Bilingual Swagger API Docs:** Modern OpenAPI docs available natively out of the box.

---

## 🇸🇦 نظرة عامة باللغة العربية

نظام **MediKidney Backend** هو نظام برمجيات متكامل وآمن للجهة الخلفية (Server-Side)، تم تطويره كـ **مشروع تخرج احترافي** باستخدام إطار عمل **NestJS 11** وتقنية **Prisma ORM 7** مع قاعدة بيانات **PostgreSQL**. تم تصميمه خصيصاً لإدارة عمليات أقسام غسيل الكلى التخصصية والعيادات الخارجية المرتبطة بها.

يوفر النظام نظام صلاحيات صارم ومحكم (**RBAC**) لـ 8 فئات مستخدمين مختلفة، مما يتيح أتمتة كاملة لدورة الرعاية الطبية بدءاً من جدولة آلات الغسيل الكلوي ومتابعة الجلسات الطبية، مروراً بالوصفات العلاجية وبرامج التغذية، ووصولاً لنتائج التحاليل وتقارير الأشعة مع التنبيهات الفورية للمرضى.

---

## 🛠️ Tech Stack (التقنيات المستخدمة)

* **Backend Framework:** [NestJS v11](https://nestjs.com/) (TypeScript)
* **ORM:** [Prisma ORM v7](https://www.prisma.io/)
* **Database:** PostgreSQL (with `@prisma/adapter-pg` connection pooling)
* **Authentication:** Passport.js with stateless **JWT** (JSON Web Tokens)
* **File Cloud Storage:** [Supabase Storage](https://supabase.com/docs/guides/storage) (Secure PDF/Image management via Signed URLs)
* **Email Delivery:** [Resend API](https://resend.com/) & Nodemailer SMTP fallback
* **Validation:** Class-validator & Class-transformer
* **Notifications Engine:** Expo Push Notifications SDK
* **API Documentation:** [Swagger UI / OpenAPI 3.0](https://swagger.io/)

---

## 🏢 System Architecture & Modules (بنية النظام والموديلات)

```
src/
├── main.ts                       # Entry point of the application (CORS, Pipes, Swagger)
├── app.module.ts                 # Main application module loading all submodules
├── auth/                         # Authentication & authorization module (JWT, Strategies, Guard)
├── users/                        # Core user profiles and account management (Admin actions)
├── dialysis-scheduling/          # Machine & shift assignment engine to prevent overlaps
├── dialysis-sessions/            # Session initialization and state management
├── dialysis-session-details/     # Multi-phase vital signs, medications, and machine settings
├── clinic-consultations/         # Clinic appointments, booking restrictions, no-show blocker
├── doctor-schedule/              # Managing weekly availability of physicians
├── medical-tests/                # Laboratory request creation, status tracking, and results
├── prescriptions/                # Doctor prescription creation and pharmacist dispensing flow
├── radiology-requests/           # Radiologist upload mechanism, cloud PDF generation
├── nutrition-program/            # Allowed/forbidden foods, breakfast, lunch, and dinner plans
├── notifications/                # Device token registration & Expo push notifications
├── mail/                         # Mailer module (Resend/SMTP/Dev mode)
├── prisma/                       # Database connection pooling adapter and schema configuration
└── common/                       # Shared utilities (Supabase upload engine, file filters)
```

---

## 🔑 Key Features per Role (المميزات والوظائف لكل دور)

### 👑 Administrator (مدير النظام)
* إنشاء حسابات الطاقم الطبي بالكامل (أطباء، ممرضين، إلخ) وتوليد كلمات مرور مؤقتة تُرسل تلقائياً لبريدهم الإلكتروني.
* تعطيل/تمكين وصول المستخدمين إلى النظام بضغطة زر واحدة.

### 🥼 Doctor (الطبيب)
* إعداد الجدول الأسبوعي للعيادة وحجز مواعيد المراجعة.
* حجز وإعداد جداول غسيل الكلى للمرضى مع منع التداخل في الآلات والورديات (Auto-conflict prevention).
* كتابة الوصفات الدوائية المتكاملة وإرسال طلبات الفحوصات المخبرية والأشعة.
* حظر حجز المرضى للعيادة تلقائياً في حال الغياب المتكرر غير المبرر (Automatic Block on consecutive no-shows).

### 🩺 Nurse (الممرض/ة)
* بدء وإنهاء جلسات غسيل الكلى وتسجيل الوزن والوفورات السائلة للمريض.
* تسجيل القياسات الحيوية (Systolic, Diastolic, Temp, Pulse, Oxygen) بشكل دوري أثناء الجلسة.
* تسجيل الأدوية والمحاليل المعطاة أثناء الجلسة (الهيبارين، المحلول الملحي، إلخ).
* رصد وتسجيل أي أعراض أو أحداث طارئة أثناء الجلسة.

### 🧪 Lab Specialist (فني المختبر)
* استلام طلبات التحاليل الطبية المطلوبة من الأطباء.
* إدخال نتائج التحاليل ورفع ملفات التقارير كملفات PDF بشكل آمن لـ Supabase.

### 🖼️ Radiologist (أخصائي الأشعة)
* استلام طلبات الأشعة من الأطباء، رفع الصور والتقارير وتغيير الحالة فور اكتمال الفحص.

### 💊 Pharmacist (الصيدلاني)
* استعراض الوصفات الطبية النشطة للمرضى وصرف الأدوية وتحديث حالة الوصفة في النظام فور التسليم.

### 🍎 Nutritionist (أخصائي التغذية)
* بناء برامج غذائية أسبوعية مخصصة لمرضى الفشل الكلوي (تحديد الأطعمة المسموحة، الممنوعة، والوجبات اليومية).

### 👤 Patient (المريض)
* استعراض ملفه الطبي الكامل (تاريخ الفحوصات والتحاليل، الوصفات الفعالة، تقارير الأشعة، والبرامج الغذائية).
* حجز مواعيد العيادة ومتابعة جداول جلسات غسيل الكلى المخصصة له.
* استقبال إشعارات فورية على هاتفه المحمول عند صدور نتيجة تحليل أو وصفة طبية جديدة.

---

## 🔒 Security Measures & Best Practices (الممارسات الأمنية المطبقة)

1. **Stateless JWT Security:** All API endpoints (except open ones like login) are guarded with Passport JWT authentication.
2. **Role Guards (RBAC):** Customized `@Roles()` decorators verifying user permissions in real-time.
3. **Supabase Storage Signed URLs:** Medical files are NEVER exposed publicly. The server fetches highly secure, temporary 5-minute pre-signed URLs from Supabase for authenticated users only.
4. **Input Whitelisting:** `ValidationPipe` is strictly configured to throw exceptions when unexpected properties are passed to APIs (`forbidNonWhitelisted: true`).
5. **Dynamic Seeding Security:** No database credentials or admin passwords are ever hardcoded in the codebase (configured to run through `.env` safely).

---

## 🚀 Installation & Local Setup (طريقة التشغيل محلياً)

### 1. Requirements (المتطلبات)
* Node.js (v18 or higher)
* PostgreSQL database instance
* Supabase account (Optional, required for file uploads)
* Resend API Key / SMTP credentials (Optional, required for sending real emails)

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-username/medikidney-backend.git
cd medikidney-backend
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory based on the `.env.example` file provided:
```env
# Database URL
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/medikidney?schema=public"

# JWT Secret
JWT_SECRET="your-super-long-random-jwt-secret-key"

# Supabase Storage (Required for radiology and test uploads)
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET="medical-files"
SUPABASE_STORAGE_SIGNED_URL_EXPIRY_SECONDS=300

# Email Configuration (Resend API is recommended)
RESEND_API_KEY="re_yourApiKey"
MAIL_FROM_EMAIL="no-reply@yourdomain.com"
MAIL_FROM_NAME="MediKidney System"

# (Optional SMTP fallback if not using Resend)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
```

### 4. Run Migrations & Seed Database
Initialize the database tables and seed the system administrator account (`sysAdmin` with password `sysAdmin2026`):
```bash
npx prisma migrate dev --name init_db
npx prisma db seed
```

### 5. Running the Application
```bash
# Development mode (with live watch)
npm run start:dev

# Production build and run
npm run build
npm run start:prod
```

---

## 📖 Swagger API Documentation (توثيق واجهات البرمجة)

Once the application is running, you can explore, test, and interact with all the API endpoints directly through the visual Swagger UI:
* **URL:** `http://localhost:3050/api` (or your configured port)

The API is fully documented with Bearer JWT Authentication headers enabled.

---

## 📄 License (الترخيص)
This project is licensed under the **MIT License** - feel free to use, modify, and build upon it!

---

### 👨‍💻 Developed with ❤️ by **Majed**
*(For questions, suggestions, or contributions, feel free to reach out via GitHub!)*
