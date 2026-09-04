# Prompt History Log: Atithi Health

This document tracks your prompts chronologically. Copy the blank entry layout at the bottom whenever you query the AI for help with templates, debugging, or fixing errors.

---

### Entry 1: TSConfig Empty Directory Errors
* **Module/Feature**: Development Environment Setup / TSConfig Warnings
* **Prompt Used**:
  > tsconfig.json files are giving errors
* **AI Response Summary**:
  * Explained that TypeScript compilers flag warnings if directories listed under `"include"` (like `src/**/*`) contain no matching input source files.
  * Created empty comment entry points (`backend/src/server.ts` and `frontend/src/main.tsx`) to resolve directory input requirements.
  * Verified backend compilation via `npx tsc --noEmit` and suggested restarting the IDE's TypeScript server to flush cached workspace warnings.
* **Your Understanding/Modification**:
  * Learned that TSConfig compiler processes fail if configured include patterns are empty.
  * Noticed that IDE language servers cache error states and restarting the server or running `npm install` resolves monorepo configuration mismatch warnings.

---

### Entry 2: TypeORM Entity Template Creation
* **Module/Feature**: Database & Foundation / TypeORM Entities
* **Prompt Used**:
  > I am a software Developer working on a full stack application. My application is a medical tourism aide for people coming from other countries. I want to create type orm entities can you create a template entity that I can start using to build all my entities
* **AI Response Summary**:
  * Created an abstract base entity (`base.entity.ts`) extending TypeORM's `BaseEntity` with auto-generated UUID primary key (`@PrimaryGeneratedColumn("uuid")`), `createdAt` (`@CreateDateColumn`), and `updatedAt` (`@UpdateDateColumn`) timestamp columns.
  * Created a concrete `User` entity (`user.entity.ts`) extending the base entity, demonstrating all common `@Column` decorator options: `type`, `length`, `unique`, `nullable`, `default`, `select: false` (to hide password from default queries), and `name` (explicit snake_case DB column names).
  * Defined a `UserRole` enum (`patient`, `attendant`, `admin`) mapped as a Postgres-native enum type.
  * Stubbed out `@OneToMany` relation decorators for future `MedicalTrip` and `SurgicalBooking` entities with inline comments explaining relation patterns (`cascade`, `eager`).
  * Included detailed inline documentation covering lifecycle hooks (`@BeforeInsert`, `@BeforeUpdate`) and relation configuration options.
* **Your Understanding/Modification**:
  * Used the template and modified it as per my requirements for all the entities I need to create. I also modified the user entity created as the columns werent what I wanted.

---

### Entry 3: TypeORM DataSource Configuration
* **Module/Feature**: Database & Foundation / DB Connection Setup
* **Prompt Used**:
  > Can you please help me configure the db.config.ts based on my entities
* **AI Response Summary**:
  * Configured `db.config.ts` with a TypeORM `DataSource` using the `postgres` type, reading connection parameters (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) from `.env` with sensible fallback defaults.
  * Explicitly registered all 5 entities in the `entities` array: `User`, `MedicalTrip`, `SurgicalBooking`, `TranslationLog`, and `ClinicalReview`.
  * Enabled `synchronize: true` for automatic table creation/updating during development (with a note to disable in production).
  * Enabled `logging: true` to print SQL queries to the console for debugging.
* **Your Understanding/Modification**:
  * Used it as it is for configuring it.

---

### Entry 4: Auth Controller Reference Template
* **Module/Feature**: Authentication & User Onboarding / Controllers (`/controllers`)
* **Prompt Used**:
  > can you generate a sample controller file that I can use as reference
* **AI Response Summary**:
  * Generated a fully documented sample `auth.controller.ts` reference file implementing `register` and `login` handlers.
  * Demonstrated standard validation patterns, password hashing with `bcrypt.hash(password, 10)`, hash verification with `bcrypt.compare()`, and JWT token signing with `jwt.sign()`.
  * Showed how to explicitly query `select: false` hidden password columns using TypeORM `findOne` select parameter.
* **Your Understanding/Modification**:
  * Used the sample code as a reference blueprint to write my own `auth.controller.ts` file, adapting response parameters and error handling for my application.

---

### Entry 5: Navbar Component Reference Template
* **Module/Feature**: Frontend Development & Navigation / Component Template (`/components`)
* **Prompt Used**:
  > Can you generate the sample navbar template
* **AI Response Summary**:
  * Generated a `Navbar.tsx` React component template using `Link` from `react-router-dom`.
  * Showed how to wire the `<Navbar />` component inside `App.tsx` above `<Routes>` to display a top navigation bar across all pages.
* **Your Understanding/Modification**:
  * Used the sample code as a reference template to build a navigation bar component for switching between Home, Login, Register, and Profile views. Also modified it to make sure it was directing to role specific pages for each user.

---

### Entry 6: React AuthContext Code Review & Debugging
* **Module/Feature**: Frontend Development & State Management / Context (`/context`)
* **Prompt Used**:
  > I have written the AuthProvider Component but there are some errors. Also verify if that is suitable for the application
* **AI Response Summary**:
  * Reviewed user's `AuthContext.tsx` implementation and validated suitability for managing JWT session state in Atithi Health.
  * Corrected TypeScript `User.id` type from `number` to `string` (matching backend UUID primary keys).
  * Fixed `AuthContextType` property omissions (`token`, `isAuthenticated`).
  * Updated `login(token, user)` handler to persist both the JWT token string and user object in `localStorage`.
* **Your Understanding/Modification**:
  * Corrected context interfaces and state hooks to store and persist JWT tokens in browser storage for authenticating API requests.

---

### Entry 7: Login Page Creation from Register Template
* **Module/Feature**: Frontend Development & Authentication / Pages (`/pages`)
* **Prompt Used**:
  > can you use the register.tsx template and create a login page that is compatible with the project backend
* **AI Response Summary**:
  * Created `Login.tsx` following the same structure, styling, and patterns as `Register.tsx`.
  * Form fields limited to `email` and `password` (matching backend `POST /api/auth/login` endpoint).
  * Integrated `useAuth().login(token, user)` from `AuthContext` to store the JWT token and user object in state and `localStorage` upon successful login.
  * Used `useNavigate` to redirect to `/` (home) after login.
  * Used `useLocation` to detect redirects from the Register page and display a green "Registration successful!" banner via `location.state.registered`.
  * Added error handling with `axios.isAxiosError` to display backend error messages (e.g. "Invalid email or password").
  * Included `isSubmitting` state to disable the button during API calls and a "Register here" `<Link>` for navigation between auth pages.
* **Your Understanding/Modification**:
  * made some small edits based on the backend and application requirements.

---

### Entry 8: Migrating Inline Styles to CSS Classes
* **Module/Feature**: Frontend Development & Styling / CSS Migration (`index.css`, `/pages`)
* **Prompt Used**:
  > I have added the styles to index.css how to remove it from inline styles from my files
* **AI Response Summary**:
  * Mapped each inline `style={styles.xxx}` property to the corresponding CSS class from `index.css` (e.g. `styles.container` → `booking-container`, `styles.form` → `booking-form`, `styles.inputGroup` → `input-group`).
  * Replaced all `style={...}` attributes with `className="..."` in both `Register.tsx` and `Login.tsx`.
  * Converted conditional error styling from ternary inline styles (`style={errors.email ? styles.inputError : styles.input}`) to a template literal className pattern (`className={\`booking-input ${errors.email ? 'error' : ''}\`}`), leveraging the `.booking-input.error` compound CSS selector.
  * Removed the entire `const styles = { ... }` object from both files since all styles now come from `index.css`.
  * Added a missing `.success-message` CSS class to `index.css` for the Login page's "Registration successful!" banner.
* **Your Understanding/Modification**:
  * Migrated styles to index.css.

---

### Entry 9: Onboarding UX Flow & Form Pre-filling
* **Module/Feature**: Frontend Navigation & State / Contextual Onboarding (`/pages`, `/components`)
* **Prompt Used**:
  > I want to know if the approach I am think of is a good UX Practice. I want to remove the Register button from the navbar as the we already have explore packages and partner with us options. Now when the person clicks on Partner with us it by default assigns the role of attendant and explore packages to login to register auto fills the role as patient
* **AI Response Summary**:
  * Confirmed that removing register from the navbar and funneling users to registration with pre-selected roles matches high-end UX best practices.
  * Removed the Register link from `Navbar.tsx` for logged-out views.
  * Modified the "Partner with Us" card button in `Home.tsx` to route to `/register?role=ATTENDANT`.
  * Modified the "Register here" link in `Login.tsx` to route to `/register?role=PATIENT`.
  * Integrated React Router's `useSearchParams` hook inside `Register.tsx` to read the parsed role from URL search query parameters and pre-fill the form dropdown choice.
* **Your Understanding/Modification**:
  * Configured onboarding routes to pass and parse URL query parameters, simplifying client-side navigation.

---

### Entry 10: Patient Dashboard Explore Grid & Filters
* **Module/Feature**: Frontend Development & Search Directory / Pages (`/pages`)
* **Prompt Used**:
  > remove the boiler plate code in Patient Dashboard and make the following changes
  > Show all the packages available as cards with 2-3 cards per row with a heading Explore packages
  > At the top add a search bar so that the patient can search via hospital, program and estimated arrival date
* **AI Response Summary**:
  * Redesigned `PatientDashboard.tsx` from scratch, replacing the boilerplate layout with a full package explorer dashboard.
  * Added a search form containing inputs for Hospital Name, Department/Program Name, and Expected Arrival Date (On/After), with a Reset button to clear search inputs.
  * Connected filter states directly to the backend `GET /api/trips` endpoint using `hospitalName`, `programName`, and `startDate` query parameters to leverage database-side fuzzy filtering.
  * Rendered planned package cards in a responsive grid layout (2-3 per row) showing image previews, Hospital and Department badges, truncated description tags, arrival dates, group slots, and action CTAs.
* **Your Understanding/Modification**:
  * Connected front-end filters to backend fuzzy SQL matching, and designed a visually premium dashboard for browsing trip packages.

---

### Entry 11: Patient Care, History Uploads & Translation Logs
* **Module/Feature**: Patient Care & Translation Portal / Diagnostic Uploads & Translation Logs
* **Prompt Used**:
  > Build Attendant Dashboard Portal:
  > - Schedule list of assigned patient bookings (showing patient name, intake date, group size, and requested language)
  > - Patient Diagnostic Inspector: View/download patient's uploaded medical history PDF
  > - Translation Upload Panel: Upload translated discharge summaries / medical PDFs (TranslationLog)
  > - Trip Completion Action: "Mark Trip Completed" button (transitions status to COMPLETED to unlock patient reviews)
  > Build Patient Health Locker view (upload diagnostic history PDFs for confirmed bookings & download translated discharge PDFs)
* **AI Response Summary**:
  * Overwrote [AttendantDashboard.tsx](file:///c:/Users/mani-/OneDrive/Desktop/atithi-health/frontend/src/pages/AttendantPages/AttendantDashboard.tsx) to list assigned bookings, inspect diagnostics, upload translation files, and mark completions.
  * Built the contextual **Patient Health Locker** interface inside [PatientBookings.tsx](file:///c:/Users/mani-/OneDrive/Desktop/atithi-health/frontend/src/pages/PatientPages/PatientBookings.tsx) supporting diagnostic PDF uploads and translation summaries downloads.
  * Loaded the `"translations"` relation eagerly in the `getMyBookings` handler.
* **Your Understanding/Modification**:
  * Structured multi-part form handlers on the client to interact with storage buckets, and designed contextual document lockers for medical coordinate transactions.

---

### Entry 12: Attendant Coordinator Assignment & Status Updates
* **Module/Feature**: Backend Route & Admin Action controls / Coordinator Assignment & Cancellation
* **Prompt Used**:
  > Write booking approval/assignment route (`PUT /api/bookings/:id/status`, restricted to `HOSPITAL_ADMIN`):
  > 
  > Keep the following points in mind for the API:
  > 
  > An attendant's availability depends on the status of their assigned bookings in the database:
  > 
  > BUSY (Assigned): The attendant has 1 or more bookings with status = 'CONFIRMED'.
  > FREE (Available): The attendant has 0 bookings with status = 'CONFIRMED' (or their past bookings are marked COMPLETED / CANCELLED).
  > 
  > This is how I want the feature to work
  > In the bookings section add an assign attendant button and a cancel attendant button
  > 
  > When the hospital admin click on assign admin [attendant] it will show them the list of available attendants
  > They will select one and confirm the booking
  > 
  > They can also cancel the booking
* **AI Response Summary**:
  * Implemented `getAvailableAttendants` in the backend `booking.controller.ts` to return available attendants belonging to the admin's hospital who have 0 bookings with status = 'CONFIRMED'.
  * Implemented `updateBookingStatus` in `booking.controller.ts` to handle `CONFIRMED` status updates (saving coordinator assignment) and `CANCELLED` status updates (dissociating coordinator and returning trip package capacity).
  * Registered route handlers in `booking.routes.ts` before the generic wildcard param path to prevent Express route collision issues.
  * Added conditional UI buttons (Assign Attendant, Cancel Booking) on `HospitalBookings.tsx` and integrated a popup overlay modal listing free coordinators along with spoken languages.
  * Fixed a TypeORM relation bug where coordinator's `hospital` relation was not loaded, resolving status update validation errors.
* **Your Understanding/Modification**:
  * Configured multi-relational queries in TypeORM to load related entity columns during database verification checks, and designed a state-driven moderator checkout flow.

---

### Entry 13: Clinical Reviews & Feedback Ratings
* **Module/Feature**: Feedback & Rating Portal / Clinical Reviews
* **Prompt Used**:
  > **Backend**:
  >   - [ ] Write Clinical Review submission endpoint (rating and comments linked to completed bookings)
  > **Frontend**:
  >   - [ ] Add **Clinical Review Form** to Patient Locker for completed surgical trips
* **AI Response Summary**:
  * Implemented `submitClinicalReview` in the backend `booking.controller.ts` to validate rating scores (integers between 1 and 5), verify booking completion status (`COMPLETED`), check for duplicate submissions, and save clinical reviews to the database.
  * Registered route `POST /api/bookings/:id/review` protected by PATIENT role access in `booking.routes.ts`.
  * Updated the `getMyBookings` query relations in the controller to eagerly fetch the `"clinicalReview"` field and return it in mapped JSON payloads.
  * Added a **Clinical Review & Feedback** module inside the Patient Health Locker panel on the patient bookings list. Unsubmitted cards render an interactive star rating selector and comment form, while submitted reviews display persisted ratings and feedback comments.
* **Your Understanding/Modification**:
  * Learned to implement conditional rendering of feedback forms based on eager relation existence checks, and validated inputs using boundary validation limits.

---

### Entry 14: Global Platform Analytics & Partner Hospital Audit Grid
* **Module/Feature**: Super Admin Portal / Global Analytics & Hospital Auditing (`/admin-dashboard`, `/controllers/admin.controller.ts`)
* **Prompt Used**:
  > Implement the front end for the following
  > 1. 📊 Global Platform Analytics (KPI Overview Cards)
  > Total Onboarded Hospitals: Count of all registered medical institutions in India.
  > Global Package Listings: Total care packages listed across all specialty departments.
  > Total Booking Volume & Capacity Utilization: Total reservations broken down by status (PENDING, CONFIRMED, COMPLETED, CANCELLED).
  > Platform Satisfaction Score: Overall average rating computed across all patient clinical reviews.
  > 
  > 2. 🏥 Partner Hospital Audit & Performance Grid
  > A comprehensive directory grid of all onboarded hospitals showing:
  > Hospital Name, Location, and Registered Administrator.
  > Total Specialty Departments (Programs).
  > Total Bookings Handled & Completion Rate.
  > Average Patient Rating (e.g. ⭐ 4.8 / 5).
  > "Inspect Hospital" Modal: Clicking a hospital opens a popup showing their active programs, listed care packages, and registered coordinators (Attendants).
* **AI Response Summary**:
  * Redesigned `SystemAdminDashboard.tsx` with 4 vibrant KPI overview cards (Onboarded Hospitals, Package Listings, Booking Volume & Capacity Utilization with status chips and progress bar, and Satisfaction Score with star breakdown).
  * Built the Partner Hospital Audit & Performance Grid with live search filtering, administrator contact badges, department & package tallies, trip completion rate progress bars, and star ratings.
  * Implemented the interactive **"Inspect Hospital"** popup modal featuring multi-tab browsing across Specialty Departments, Care Packages, Registered Coordinators (Attendants with spoken languages), and Patient Clinical Reviews.
  * Added responsive CSS styles in `index.css` for cards, chips, modal backdrops, and tabs.
* **Your Understanding/Modification**:
  * Learned how to build responsive modal dossiers with tabbed state management.

---

### Entry 15: Redis Caching Layer Integration
* **Module/Feature**: Infrastructure & High-Performance Caching (`/config/redis.config.ts`, `server.ts`, `trip.controller.ts`)
* **Prompt Used**:
  > Yes add redis caching
* **AI Response Summary**:
  * Installed `redis` npm package and created `backend/src/config/redis.config.ts` with error handling, reconnect strategies, and utility functions (`getCache`, `setCache`, `clearCachePattern`).
  * Implemented automatic failover: if a local Redis server is offline on Windows, the application logs a graceful notice and operates in database pass-through mode without crashing.
  * Initialized `connectRedis()` inside `server.ts` startup sequence.
  * Integrated Redis caching into `getAllMedicalTrips` in `trip.controller.ts` with a 60-second TTL and `X-Cache: HIT / MISS` response headers.
  * Added automated cache invalidation (`clearCachePattern("trips:*")`) inside `createMedicalTrip` to keep package search results updated.
* **Your Understanding/Modification**:
  * Understood how to implement high-throughput caching middleware with non-blocking fallback mechanisms to protect database bandwidth.


