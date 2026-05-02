# project-context.md / .cursorrules
# Facebook Page Auto-Publishing — AI Context Document
# Optimized for Cursor / Copilot / LLM assistants. Read fully before generating any code.

---

## 1. Project Overview & Tech Stack

**Goal:** Enterprise-grade web app for scheduling and auto-publishing posts (text + multi-image) to multiple Facebook Pages, with role-based access, background job processing, and full audit logging.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript strict) |
| Styling | TailwindCSS + Shadcn UI |
| ORM | Prisma (MySQL provider) |
| Database | MySQL 8.0 |
| Queue | BullMQ (producer in Next.js, consumer in standalone Worker) |
| Cache / Queue broker | Redis 7 |
| Storage | AWS S3 or MinIO (self-hosted S3-compatible) |
| Auth | Auth.js v5 (NextAuth) — Credentials provider, JWT strategy |
| Deployment | Docker + Docker Compose, Nginx reverse proxy, VPS Ubuntu |
| CI/CD | GitHub Actions → GHCR → SSH deploy |
| Package manager | pnpm workspaces (monorepo) |

### User Roles
- `SUPER_ADMIN` — full access to all pages, templates, users
- `STAFF_CONTENT` — access only to pages explicitly granted via `UserPageAccess`

---

## 2. Architecture & Data Flow

### High-level request lifecycle

```
Browser (Client Component)
  │  form submit / file select
  ▼
Next.js Server Action  ──── Prisma ────▶ MySQL
  │  createPostAction()
  │  validates session + page permission
  │  writes Post{status: DRAFT/SCHEDULED}
  │
  ▼
BullMQ Queue (Producer)  ──▶  Redis
  │  queue.add('publish-post', { postId }, { delay })
  │
  ▼  [separate OS process]
BullMQ Worker (apps/worker)
  │  processor reads job from Redis
  │  loads Post + Page from Prisma
  │  decryptToken(page.encryptedAccessToken)
  │  RateLimiterService.acquire(pageId)
  │  FacebookService.publishImagePost(...)
  │  updates Post{status: PUBLISHED, fbPostId}
  │  writes JobLog
  ▼
Facebook Graph API  →  /{page-id}/photos (per image) → /{page-id}/feed
```

### Critical architectural separation

**Next.js App** (`apps/web`) and **Worker** (`apps/worker`) are **two independent Node.js processes**.
- Next.js: **produces** jobs only — never processes them
- Worker: **consumes** jobs only — no HTTP server, no exposed ports
- Both share: `packages/database` (Prisma schema + crypto utils)

### Upload flow (S3 Presigned URL — browser-direct)

```
Client → getPresignedUploadUrl() [Server Action] → S3 SDK signs URL
Browser PUT file binary directly → S3  (Next.js never touches binary)
publicUrl → stored in form state → submitted with createPostAction()
```

---

## 3. Core Gotchas

- **Token encryption:** Always `encryptToken()` before DB write, `decryptToken()` inside Worker only
- **Timezone:** Client appends `+07:00` offset to datetime-local value; Server stores UTC via `new Date(isoString)`
- **FB Image Post:** No `title` field — all text in `message`. Upload photos with `published:false` first, then create feed post with `attached_media`
- **Worker idempotency:** Set `PUBLISHING` before API call. If `PUBLISHED` on arrival → return early
- **Retry:** BullMQ `attempts:3, backoff:{type:'exponential',delay:5000}`. Non-retryable errors (FB code 190) → throw with `unrecoverable:true`
- **Rate limit:** Token bucket per `fbPageId`, 1 token/18s, burst 5

---

## 4. Folder Structure

```
fb-autopublish/
├── apps/
│   ├── web/                          Next.js App Router
│   │   ├── app/(auth)/login/
│   │   ├── app/(dashboard)/dashboard/
│   │   ├── app/(dashboard)/posts/new/
│   │   ├── app/api/auth/[...nextauth]/
│   │   ├── app/api/health/
│   │   ├── components/dashboard/
│   │   ├── components/posts/
│   │   ├── lib/actions/              Server Actions only
│   │   ├── lib/schemas/              Zod schemas (shared client+server)
│   │   ├── lib/facebook/             FacebookService class
│   │   ├── lib/queue.ts              BullMQ producer
│   │   ├── lib/auth-helpers.ts
│   │   ├── auth.ts                   Auth.js config (root, NOT in app/)
│   │   └── middleware.ts             Edge Runtime
│   └── worker/
│       └── src/
│           ├── index.ts              Entry + graceful shutdown
│           ├── processors/publish.processor.ts
│           └── services/rate-limiter.service.ts
├── packages/database/
│   ├── schema.prisma                 Single source of truth
│   └── src/{prisma.ts,crypto.ts}
├── docker/{Dockerfile.web,Dockerfile.worker,mysql/my.cnf}
├── nginx/{fb-autopublish.conf,snippets/proxy-params.conf}
├── docker-compose.yml
└── .github/workflows/deploy.yml
```
