# Atithi Health (अतिथि हेल्थ) 🇮🇳✈️🏥
> **Comprehensive Medical Tourism & Surgical Logistics Management Platform for India**

Atithi Health is an enterprise-grade full-stack platform engineered to bridge international patients with India's premier accredited hospital networks (Apollo, Fortis, Max Healthcare, Manipal, Medanta, etc.). The platform streamlines everything from initial specialty package discovery and multilingual communication to end-to-end surgical travel logistics, document lockers, and clinical feedback loops.

---

## 🌟 Key Platform Features

### 1. 🧳 International Patient Locker & Surgical Journeys
- **Step-by-Step Care Journey**: Real-time tracking of 7-phase surgical trips:
  Passport & Medical Visa ➔ Flight Arrival & Chauffeur ➔ Hotel / Guest Stay ➔ Pre-Op Diagnostics ➔ Surgery & Hospitalization ➔ Post-Op Recovery ➔ Follow-Up Consultation.
- **Encrypted Medical Document Vault**: Secure multi-format upload and storage for passport scans, clinical records, diagnostic MRIs/CTs, and discharge summaries.
- **Verified Clinical Reviews**: Rate and review medical experiences upon surgical trip completion with hospital and doctor feedback.

### 2. 🌐 Real-Time Multilingual Medical Translation
- High-accuracy translation engine enabling seamless cross-border communication between international patients and Indian clinical staff.
- Multi-language support: English, Hindi, Arabic, Russian, French, Bengali, and Spanish.
- Cached translation memory backed by Redis for sub-millisecond retrieval of common medical phrases.

### 3. 👨‍⚕️ Attendant & Medical Coordinator Portal
- Operational dispatch interface for hospital attendants and concierge coordinators.
- Real-time management of patient arrival times, airport pickups, accommodation logistics, and daily health status check-ins.

### 4. 🏥 Hospital Administration Dashboard
- Create and manage surgical departments (Cardiology, Orthopaedics, Oncology, Neurology, Organ Transplant).
- Configure all-inclusive surgical care packages with tiered pricing, stay duration, and inclusions.
- Assign dedicated care attendants to incoming international patients.

### 5. 📊 Super Admin Platform Analytics & Hospital Audit
- **Executive KPIs**: Real-time counts of onboarded hospitals, global care packages, total booking volume across statuses, and platform-wide clinical satisfaction scores.
- **Partner Hospital Directory**: Comprehensive performance grid with location filters, specialty counts, booking completion rates, and average patient ratings.
- **Natural Hospital Inspector**: Deep-dive inspection modal displaying active clinical departments, listed surgical packages, assigned coordinators, and verified patient reviews.

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite (lightning-fast HMR and optimized production bundles)
- **Styling**: Tailwind CSS & Modern CSS Design System
- **Icons**: Lucide React
- **State & Routing**: React Hooks & Custom Context

### Backend & Database
- **Runtime**: Node.js & Express with TypeScript
- **ORM**: TypeORM
- **Database**: PostgreSQL (relational schema for users, bookings, trips, hospitals, programs, reviews, translations)
- **Caching**: Redis (high-performance caching layer with automatic pass-through fallback if offline)
- **File Uploads**: Multer with MIME validation and secure storage
- **Security**: JWT Authentication, bcrypt password hashing, and role-based access control (RBAC: PATIENT, ATTENDANT, HOSPITAL_ADMIN, SUPER_ADMIN).

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.x or higher
- **PostgreSQL**: v14+ running on port 5433 (or configured via .env)
- **Redis** *(optional)*: v6+ running on port 6379
- **npm** or **yarn**

---

### Backend Setup

1. Navigate to the backend directory:
   `ash
   cd backend
   `

2. Install dependencies:
   `ash
   npm install
   `

3. Configure environment variables:
   `ash
   cp .env.example .env
   `
   *(Update your PostgreSQL database credentials and port in .env if needed).*

4. Run database migrations / synchronization and start the development server:
   `ash
   npm run dev
   `
   *Backend will start on http://localhost:5000.*

---

### Frontend Setup

1. Navigate to the frontend directory:
   `ash
   cd frontend
   `

2. Install dependencies:
   `ash
   npm install
   `

3. Start the Vite development server:
   `ash
   npm run dev
   `
   *Frontend will launch at http://localhost:5173.*

---

## 🔐 Default User Roles & Navigation

| Role | Access Scope |
|---|---|
| **Patient** | Discovery, Package Booking, Travel Locker, Document Uploads, Clinical Reviews |
| **Attendant** | Assigned Patient Logistics, Airport Pickups, Daily Journey Status Updates |
| **Hospital Admin** | Hospital Department Setup, Surgical Packages, Attendant Assignments |
| **Super Admin** | Platform Analytics, Hospital Audits, Global Directory Management |

---

## 📁 Repository Structure

`
atithi-health-app/
├── backend/
│   ├── src/
│   │   ├── config/          # PostgreSQL TypeORM & Redis cache configurations
│   │   ├── controllers/     # Business logic (admin, auth, booking, hospital, trip, reviews, etc.)
│   │   ├── entities/        # TypeORM database models & relationships
│   │   ├── middleware/      # Auth JWT verification & Multer upload middlewares
│   │   ├── routes/          # Express API route declarations
│   │   └── server.ts        # Server entry point & Express bootstrap
│   ├── uploads/             # Local file uploads folder (git-ignored)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components & modals (Inspect Hospital, Reviews, etc.)
│   │   ├── pages/           # Role dashboards (Admin, Patient, Attendant, Discovery)
│   │   ├── App.tsx          # Root application router & role switcher
│   │   └── main.tsx         # Frontend React entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .gitignore               # Comprehensive Git ignore rules
└── README.md                # Project documentation
`

---

## 📄 License
This project is licensed under the MIT License.