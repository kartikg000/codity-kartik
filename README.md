# Codity — Distributed Job Scheduler Platform

A production-inspired distributed job scheduling platform built with Node.js, Express, TypeScript, Prisma (PostgreSQL), and a modern React/Vite frontend dashboard.

---

## Features & Architecture

### Backend Core
- **Authentication & Project Management**: Multi-tenant architecture supporting organizations, projects, queues, and users secured via JWT.
- **Queue Configuration**: Supports dynamic priority, concurrency limits, custom retry policies (`FIXED`, `LINEAR`, `EXPONENTIAL`), pause/resume toggles, and real-time statistics.
- **Job Lifecycle**: Complete state machine transitions: `QUEUED` → `SCHEDULED` → `CLAIMED` → `RUNNING` → `COMPLETED` / `FAILED` → `DEAD_LETTER`.
- **Worker Service**: Distributed polling mechanism with atomic claiming via PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` ensuring exactly-once execution across concurrent workers.
- **Heartbeat & Monitoring**: Workers send regular heartbeats reporting active jobs, uptime, and system health.
- **Retry Engine & Dead Letter Queue (DLQ)**: Automatic exponential/linear backoff retries. Exhausted jobs move to DLQ for auditing and manual replay.
- **Recurring & Scheduled Jobs**: Custom cron expression parser and scheduler service promoting delayed jobs when due.

### Frontend Dashboard
- **Live System Overview**: Real-time stats cards showing total jobs, queue depths, online workers, and throughput charts powered by Recharts.
- **Queue & Job Management**: Interactive controls to pause/resume queues, filter jobs by status/type, and inspect execution history.
- **Dead Letter Replay**: 1-click retry functionality for failed jobs in DLQ.

---

## Tech Stack
- **Backend**: Node.js, Express 5, TypeScript, Zod, Pino Logging, Swagger UI
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: Vite, React 18, React Router, Axios, Recharts, Custom Glassmorphism UI
- **Testing**: Jest, Supertest

---

## Getting Started

### 1. Prerequisites
- Node.js v18+
- PostgreSQL instance running locally on port 5433 (or configured via `.env`)

### 2. Backend Setup
```bash
cd server
npm install
npx prisma db push
npm run dev
```
The server starts on **http://localhost:4000**.
- Swagger API Docs: **http://localhost:4000/api/docs**
- Health Check: **http://localhost:4000/health**

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
The dashboard starts on **http://localhost:5173**.

---

## Automated Testing
To run the backend integration test suite:
```bash
cd server
npm test
```
