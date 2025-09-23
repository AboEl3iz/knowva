
# 🚀 Backend Technical Documentation

## 🔹 Overview

The backend of this project is built with **NestJS + PostgreSQL (Prisma ORM)**.
It manages users, groups, lessons, quizzes, notifications, and integrates with an **AI chatbot** to provide real-time learning support for students.

---

## ✨ Core Features

### 🔐 Authentication & Authorization

* **JWT-based authentication**
* **Role-based access control**: `Student`, `Teacher`, `Admin`
* Guards & decorators to restrict access

---

### 👥 Groups & Enrollment

* Teachers create groups.
* Students join groups using a **unique token/code**.
* Memberships stored in an `enrollment` table.

---

### 📚 Lessons / Materials Management

* Teachers upload **PDFs, videos, docs**.
* Files are stored on **Cloudinary** with secure access.
* Materials are linked directly to groups.

---

### 🤖 AI Chatbot Integration

* First-time setup → uploads **all materials** to the AI model.
* New lessons → **auto-synced** to the model.
* Students can query lessons using natural language.
* ✅ Solved two challenges:

  * **Historical materials**: one-time sync script.
  * **Future updates**: automatic background sync.

---

### 📝 Quizzes & Exams

* Supports multiple question types:

  * MCQ, True/False, Short Answer.
* Teachers manage quiz status (`draft`, `published`).
* Students’ answers and scores stored in DB.
* 🛠️ Fixed issue where `status` returned `undefined` → added DTO validation.

---

### 🔔 Notifications (Real-time)

* Powered by **Socket.IO + Nest WebSocketGateway**.
* Events: new lessons, new quizzes, group updates.
* Notifications sent instantly to all group members.
* ✅ Fixed issue where notifications were logged but not delivered → adjusted payload handling.

---

### 📂 File Uploads & Downloads

* Teachers upload files via **Cloudinary**.
* Students can download via **secure URLs**.
* ✅ Fixed issue where PDFs downloaded without extension by adding `fl_attachment`.

---

## ⚡ Challenges & Solutions

| ⚠️ Problem                                   | 🔎 Cause                    | 💡 Solution                                     |
| -------------------------------------------- | --------------------------- | ----------------------------------------------- |
| AI model ignored old lessons                 | No sync between DB & model  | One-time sync + cron job for continuous updates |
| WebSocket notifications not reaching clients | Missing/invalid payload     | Fixed DTO & ensured correct payload delivery    |
| Cloudinary files downloaded without `.pdf`   | Wrong rename logic          | Used `fl_attachment` with proper filename       |
| Prisma advisory lock error (P1002)           | Pooling / migration timeout | Increased timeout & used `--skip-advisory-lock` |
| Quiz update returned `undefined status`      | DTO validation missing      | Added `class-validator` & defaults              |

---

## 🛠️ Tools & Stack

* **NestJS** → scalable backend framework
* **PostgreSQL + Prisma** → database & ORM
* **Cloudinary** → file storage
* **Socket.IO** → real-time notifications
* **Axios** → AI model API communication
* **Cron Jobs** → background syncing with AI
* **Swagger** → API documentation
* **JWT + Guards** → authentication & role-based access

---

## 🧩 Architecture Overview

* __Framework__: `NestJS` modular architecture with DI, pipes, guards, interceptors.
* __Entry point__: `src/main.ts` sets global prefix `api/v1`, CORS, global `ValidationPipe`, and exposes Swagger at `/docs`.
* __Modules__: Wired in `src/app.module.ts`.
  - `AuthModule`, `MailModule`, `SubjectModule`, `GroupModule`, `QuizModule`, `EnrollmentModule`, `LessonModule`, `NotificationModule`, `ChatModule`, `CloudinaryModule`, `AnalysisModule`, `ChatbotModule`.
* __Database__: PostgreSQL via Prisma. See `prisma/schema.prisma` for models like `User`, `Group`, `Lesson`, `Quiz`, `Question`, `Conversation`, `Message`, `Notification`, `ChatbotSession`.
* __Real-time__: Socket.IO gateway in `src/chat/chat.gateway.ts`.
* __External services__: Cloudinary for media; AI service endpoints for embeddings, chatbot Q&A, quiz correction, and AI question generation.

---

## 📦 Modules & Key Capabilities

* __Auth (`src/auth/`)__
  - JWT auth, role-based access via `AuthenticationGuard`, `AuthorizationGuard`, and `@Roles` decorator.

* __Enrollment (`src/enrollment/`)__
  - Join group via invite token `GET /enrollment/create?token=...`.
  - Teacher approves/rejects students.
  - Endpoints: see `enrollment.controller.ts` with Swagger annotations.

* __Groups & Subjects (`src/group/`, `src/subject/`)__
  - Manage class groups and academic subjects. Support status (`ACTIVE`, `COMPLETED`, `INACTIVE`).

* __Lessons (`src/lesson/lesson.service.ts`)__
  - Upload to Cloudinary; create `Lesson` and assign to groups.
  - On upload, lesson is pushed to AI embeddings service (`/ai/embedding/upload-document`) for each associated group.
  - Utilities to add/remove lessons to groups, fetch by subject/group/student.

* __Chat & Messaging (`src/chat/`)__
  - `Conversation` model supports direct (student-teacher) and group chats.
  - WebSocket gateway `chat/` namespace authenticates via Bearer token and tracks `connectedUsers`.
  - Events: `send_message`, `message_sent`, `new_message`, `mark_read`, `unread_count`.
  - Delivery receipts and read tracking with arrays `deliveredTo`, `readBy` for group messages.

* __Notifications (`src/notification/`)__
  - Persisted notifications in DB with types: `LESSON_ADDED`, `QUIZ_ASSIGNED`, `MESSAGE_RECEIVED`, `GENERAL`, ...
  - REST endpoints for unread count, by type, mark all as read, and delete-all.
  - Realtime push via `NotificationGateway` (used by `LessonService` and `QuizService`).

* __Quizzes (`src/quiz/`)__
  - Create/update/publish quizzes with schedule (`startsAt`, `endsAt`), language and durations.
  - Question bank supports `MCQ`, `TrueFalse`, `Written`, and question mode `MANUAL` or `AI`.
  - AI-generated questions via `/ai/generate_quiz/` then persisted and linked to quiz.
  - Attempts lifecycle: start, answer questions, complete; automatic grading for MCQ/TF; AI grading for written answers via `/ai/correct_quiz/` with robust error handling and score normalization.
  - On publishing, notifies approved group members.

* __Analysis (`src/analysis/analysis.service.ts`)__
  - Student analysis: attendance %, results per exam with pass calculation by threshold.
  - Group analysis: attendance, averages, success rates, hardest questions, score distribution.
  - Exam analysis and helpful utilities for timezones and quiz status (UPCOMING/ONGOING/ENDED).

* __Chatbot (`src/chatbot/`)__
  - Students create chatbot sessions per group and converse with the AI using `/ai/chatbot/ask`.
  - Messages persisted with `aiGenerated` flag; first message sets session title.
  - Access control ensures student is a member of the group.

* __Cloudinary (`src/cloudinary/`)__
  - Upload/delete helpers for lesson files; secure URLs used throughout.

---

## 🤖 AI Interactions in Detail

* __Embeddings (Documents Upload)__
  - Triggered on lesson creation and via backfill script `scripts/upload-existing-lessons.ts`.
  - Endpoint: `POST /ai/embedding/upload-document` with `{ group_id, pdf_path }`.

* __Chatbot Q&A__
  - Endpoint: `POST /ai/chatbot/ask` with `{ group_id, user_query, student_id, session_id }`.
  - Persists both user question and AI answer in `ChatbotMessage`.

* __AI Question Generation__
  - Endpoint: `POST /ai/generate_quiz/`.
  - Payload includes language, difficulty, focus/remain pages and ratios; results normalized and saved as `AI` mode questions.

* __AI Correction for Written Answers__
  - Endpoint: `POST /ai/correct_quiz/` with max grade and questions payload.
  - Handles various AI response shapes; caps/normalizes score to question’s max.

---

## 🧠 Feedback & Insights

This backend generates and persists actionable feedback for students and classes, leveraging AI and structured analytics.

* __Per-Student Attempt Feedback__
  - Teachers can trigger feedback generation for a quiz: `POST /quiz/:id/request-feedback` (see `QuizController.requestFeedbackStudent()` → `QuizService.requestFeedbackStudent()`).
  - The service aggregates the student attempts, calls the AI when needed, and persists an `AttemptFeedback` record with per-question `QuestionFeedback`.
  - Data shapes are documented in `src/quiz/dto/student-feedback-response.dto.ts`:
    - `AttemptFeedbackResponseDto`: `summary`, `weakPoints[]`, `goodPoints[]`, and `QuestionFeedback[]`.
    - `QuestionFeedbackResponseDto`: textual feedback tied to the student's `QuestionAnswer`.
    - `StudentFeedbackResponseDto`: wraps the attempt, quiz info, answers, and feedback.

* __Question-Level Insights__
  - Each `QuestionAnswer` receives AI remarks (when applicable) and a final normalized score.
  - Written answers are scored via `/ai/correct_quiz/` and stored back to `QuestionAnswer.score`.

* __Class/Group Insights__
  - The `AnalysisService` computes attendance %, averages, hardest questions (based on failure rates), and score distributions.
  - Designed to surface where the class struggles and who might need help.

Notes:
  - Feedback persistence models: `AttemptFeedback`, `QuestionFeedback`, and links to `QuizAttempt` and `QuestionAnswer` (see `prisma/schema.prisma`).
  - When publishing a quiz or adding lessons, notifications inform students; feedback flows can be triggered post-exam.

---

## ⚙️ Setup & Development

1) __Prerequisites__
   - Node.js 18+
   - PostgreSQL

2) __Install dependencies__
   - `npm install`

3) __Environment variables (`.env`)__
   - `DATABASE_URL=postgresql://user:pass@host:port/db`
   - `JWT_SECRET=...`
   - `CLOUDINARY_CLOUD_NAME=...`
   - `CLOUDINARY_API_KEY=...`
   - `CLOUDINARY_API_SECRET=...`
   - `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS` (if mail is used)
   - Optional AI base URL override if needed.

4) __Database__
   - `npx prisma migrate deploy` (or `npx prisma migrate dev` for local dev)
   - `npx prisma generate`

5) __Run__
   - Dev: `npm run start:dev`
   - Prod: `npm run build && npm run start:prod`
   - Swagger: open `http://localhost:3000/docs`

---

## 🧪 Key Endpoints (high-level)

* __Auth__: login, OTP verify, JWT issuance.
* __Groups/Subjects__: create/manage groups, tokens, student membership.
* __Enrollment__: join by token, teacher approve/reject, list by group/student/teacher.
* __Lessons__: upload to subject + groups, list by subject/group/student, manage relations.
* __Chat__: list conversations, messages pagination, WebSocket send/read/unread events.
* __Notifications__: unread counts, by type, mark-as-read, delete-all.
* __Quiz__: CRUD, duplicate, publish, add questions (manual/existing/AI), attempts lifecycle (start/answers/complete), analytics.
* __Analysis__: student overview, group stats, exam insights.
* __Chatbot__: sessions CRUD (student), send message, retrieve history.

Refer to Swagger (`/docs`) for full request/response schemas and examples. Many controllers include `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery` for clarity.

---

## 🧰 Utilities & Scripts

* __Backfill embeddings__: `scripts/upload-existing-lessons.ts`
  - Iterates all lessons and pushes them to embeddings service per group.
  - Run with `ts-node` or build + node.

---

## 🐛 Common Issues & Troubleshooting

* __Prisma P1002 (timeout/lock)__
  - Ensure DB reachable; increase timeout; for migrations use `--skip-advisory-lock` when appropriate.

* __WebSockets not delivering__
  - Verify Bearer token in WS connection headers; ensure `connectedUsers` mapping is populated.

* __AI service errors__
  - Check payload and content-type; log `response.data`; service may return non-array for quiz generation—guard for it.

* __Timezones & quiz windows__
  - `ValidationPipe` and timezone helpers ensure correct UTC/Egypt conversions; verify that `startsAt` and `endsAt` include `Z` or are converted.

---

## 🌟 Future Improvements

* 📨 **Queue system** (BullMQ / RabbitMQ) for reliable embeddings uploads and AI calls with retries and DLQ.
* ⚡ **Redis caching** for faster quiz/lesson retrieval and unread counts.
* 📊 **Monitoring/Tracing** with Prometheus + Grafana and OpenTelemetry.
* 🛡️ **Global error filters & structured logging** (pino/winston) across REST and WS.
* 🔐 **Rate limiting & Throttling** for critical endpoints (quiz attempts, AI calls).
* 🧱 **E2E tests** for chat flows, quiz lifecycle, and AI integration fallbacks.

