<div align="center">

# ⚡ Hack4Win

**Next-Generation Hackathon, Campus Innovation & Developer Showcase Platform**

[![Domain](https://img.shields.io/badge/Domain-hack4win.online-6366f1?style=for-the-badge&logo=globe)](https://hack4win.online)
[![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript%205-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![Tests](https://img.shields.io/badge/Test_Suite-221%2B_Passing-emerald?style=for-the-badge&logo=node.js)](tests/)

<p align="center">
  A high-performance, developer-first platform empowering universities, tech communities, and enterprises to discover, host, and judge premier hackathons with industry-grade security, campus access control, and rich project showcases.
</p>

[Explore Platform](https://hack4win.online) • [Host Hackathon](https://hack4win.online/host) • [Browse Challenges](https://hack4win.online/hackathons) • [Projects Directory](https://hack4win.online/projects)

</div>

---

## 🌟 Key Highlights

- 🏢 **Multi-Role Dedicated Portals**: Dedicated workspaces and command centers for **Admins** (`/admin`), **Organizers** (`/organizer`), **Judges** (`/judges`), and **Builders** with granular role-based access control (RBAC).
- 🎓 **Private & Campus Hackathons**: Enterprise-grade access control for university competitions and private cohorts via:
  - **Passcode / Secret Access Key** (e.g. `CAMPUS-2026`).
  - **Institutional Email Domain Whitelists** (e.g. `@mit.edu`, `@iitb.ac.in`, `@stanford.edu`).
  - **Pre-Approved Student Rosters** & Bulk Whitelists.
  - **Secret Shareable 1-Click Invite Links** with cryptographic token verification.
- 🚀 **Drag-and-Drop Submissions & Auto-Save**: Seamless project submission flow with local draft persistence, drop-zone file uploads with client-side image compression, demo video embeds, and live preview.
- 🖼️ **Interactive Project Media Galleries**: Showcase builder projects with modern carousels, thumbnail navigators, and verified builder credentials.
- ⚖️ **Judging & Evaluation Studio**: Weighted multi-criteria scorecards, judging rubrics, anonymous evaluations, and live scoreboards.
- 👤 **Vanity Developer Profiles**: Devpost-style developer identities with custom vanity handles (`/u/[username]`), bio, social links, project portfolios, and hackathon badges.
- 📢 **Admin Campaign Dispatcher**: Segmented email broadcasts and announcements targeting participants, winners, and judging panels.

---

## 🏗️ System Architecture & Access Control

```mermaid
flowchart TD
    User([Platform Visitor / Builder]) --> AuthCheck{Authenticated?}
    AuthCheck -->|No| PublicViews[Public Browse / Hackathons / Projects]
    AuthCheck -->|Yes| RoleRouter{User Role}
    
    RoleRouter -->|Super Admin| AdminPortal["Admin Console (/admin)"]
    RoleRouter -->|Organizer| OrgPortal["Host Workspace (/organizer)"]
    RoleRouter -->|Judge| JudgePortal["Scoring Portal (/judges)"]
    RoleRouter -->|Builder| BuilderDashboard["Builder Dashboard (/profile, /u/handle)"]

    subgraph Private Campus Hackathon Security Matrix
        PrivateReq[Registration Request] --> RegCheck{Is Private?}
        RegCheck -->|No| DirectJoin[Allow Registration]
        RegCheck -->|Yes| SecurityGuard{Access Validation}
        SecurityGuard -->|Passcode Match| Allow1[Grant Access]
        SecurityGuard -->|Email in Whitelist| Allow2[Grant Access]
        SecurityGuard -->|Domain Matches @campus.edu| Allow3[Grant Access]
        SecurityGuard -->|Valid Invite Token| Allow4[Grant Access]
        SecurityGuard -->|None Matched| Deny[403 Forbidden]
    end
```

---

## 🚀 Feature Breakdown

### 1. Dedicated Multi-Tenant Portals
- **Admin Command Suite (`/admin`)**: Real-time platform analytics, user role administration, hackathon moderation, tag/skill catalogs, and marketing email dispatch.
- **Organizer Workspace (`/organizer`)**: Create competitions, configure custom rubrics & prizes, manage student rosters, whitelist student emails, and invite judges with exclusive host credentials.
- **Judge Portal (`/judges`)**: Streamlined scorecard evaluation interface with rubric weights, private feedback notes, and real-time score calculation.
- **Builder Hub (`/u/[username]`)**: Public portfolio displaying projects, skills, team affiliations, and contest standings.

### 2. Private Campus Hackathons
Host university-exclusive or company-internal hackathons without risk of public leakage:
- **Instant Domain Filter**: Restrict registrations to students with accredited institutional domains.
- **Roster & Invite Management**: Host endpoint (`/api/organizer/hackathons/[id]/students`) provides real-time attendee rosters and instant invite link token regeneration.
- **Team Boundary Enforcement**: Registered builders can only invite eligible students to their hackathon teams, preventing unauthorized access.

### 3. Submission Engine & Media Carousel
- **Zero Data Loss**: Auto-save client hooks keep drafts safe in `localStorage` across page reloads.
- **Drag-and-Drop Image Uploader**: Optimized file drop-zone with instant thumbnail preview and validation.
- **Rich Markdown Formatting**: Comprehensive project descriptions with GitHub Flavored Markdown support and sanitized HTML rendering.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (Turbopack, App Router, Server Actions) |
| **Frontend** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **UI Components** | [Radix UI](https://www.radix-ui.com/), [shadcn/ui](https://ui.shadcn.com/), [Lucide React](https://lucide.dev/) |
| **Database** | [Neon Serverless PostgreSQL](https://neon.tech/) with pooled connection management |
| **Authentication** | Session-based cryptographic cookies & Neon Auth RBAC |
| **Object Storage** | S3-Compatible Object Store with client-side image compression |
| **Testing** | Node.js Native Test Runner (`node:test`, `node:assert/strict`) |

---

## 📁 Repository Structure

```
hack4win/
├── scripts/
│   ├── seed-demo-accounts.ts       # Seeds 1-click test accounts for all 4 roles
│   └── seed-dummy-data.mjs         # Populates sample hackathons, projects & rubrics
├── src/
│   ├── app/
│   │   ├── admin/                  # Super Admin Dashboard & Management Suite
│   │   ├── api/                    # REST API Handlers (RBAC, Registration, Invites)
│   │   │   ├── admin/              # Admin-only API endpoints
│   │   │   ├── hackathons/         # Hackathon registrations, access checks & submissions
│   │   │   ├── organizer/          # Organizer judge invites & student roster APIs
│   │   │   └── team-invites/       # Teammate invitation & boundary guards
│   │   ├── auth/                   # Authentication, Onboarding & Demo Login
│   │   ├── hackathons/             # Public & Campus Hackathon Browsing & Details
│   │   ├── judges/                 # Judges Command Center & Project Evaluation
│   │   ├── organizer/              # Host & Organizer Portal Workspace
│   │   ├── projects/               # Showcase Gallery & Project Detail Pages
│   │   └── u/[username]/           # Vanity Developer Profiles
│   ├── components/                 # Modular, Accessible UI Components (Cards, Modals)
│   └── lib/
│       ├── auth/                   # Session & RBAC Verification Utilities
│       ├── db/                     # Data Access Layer & Repositories
│       └── url-validation.ts       # Security & XSS Sanitization Helpers
└── tests/
    ├── api-workflows.test.mts      # Core API integration test suite
    └── full-manual-workflow.test.mts # 221+ Comprehensive End-to-End E2E Tests
```

---

## 🚦 Getting Started

### Prerequisites
- **Node.js** v20.x or higher
- **pnpm** v9.x or higher (or npm / yarn)
- **PostgreSQL** database (e.g. Neon, Supabase, or local Postgres)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hack4win/hack4win.git
   cd hack4win
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and configure your credentials:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   # Database (PostgreSQL / Neon)
   DATABASE_URL="postgresql://user:password@endpoint.aws.neon.tech/hack4win?sslmode=require"
   DATABASE_URL_POOLED="postgresql://user:password@endpoint-pooler.aws.neon.tech/hack4win?sslmode=require"

   # Neon Auth Base URL
   NEON_AUTH_BASE_URL="https://endpoint.neonauth.aws.neon.tech/hack4win/auth"

   # S3-Compatible Storage
   AWS_ENDPOINT_URL_S3="https://endpoint.storage.aws.neon.tech"
   AWS_ACCESS_KEY_ID="your_access_key"
   AWS_SECRET_ACCESS_KEY="your_secret_key"
   AWS_REGION="ap-southeast-1"
   S3_BUCKET="hack4win-assets"
   ```

4. **Seed Database & Demo Accounts**:
   ```bash
   pnpm run seed
   ```

5. **Start Development Server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing & Verification

The platform includes over 221 end-to-end integration tests covering all critical user journeys:

```bash
# Run the complete test suite
pnpm test
```

### Test Coverage Highlights
- **Role-Based Access Control**: Route protections for Admin, Organizer, Judge, and Regular users.
- **Private Hackathon Security**: All 4 campus access control mechanisms and boundary protections.
- **Team Collaborations**: Real-time invitations, membership caps, and outsider guards.
- **Submissions & Scoring**: Project draft restoration, evaluation rubric calculations, and scoreboard sorting.

---

## 🔒 Security & Privacy

- **Safe External URLs**: Strict protocol validation prevents malicious `javascript:` and `data:` URI attacks.
- **Redacted Emails**: Public API endpoints mask user emails to protect participant privacy.
- **Input Sanitization**: Markdown output is sanitized using defense-in-depth HTML sanitization.
- **CSRF & Cookie Protection**: HttpOnly, SameSite cookies with cryptographically signed tokens.

---

## 📄 License

This repository is private property of **Hack4Win** ([hack4win.online](https://hack4win.online)). Unauthorized reproduction, distribution, or commercial exploitation is strictly prohibited.
