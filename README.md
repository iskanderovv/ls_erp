# O'quv Markaz ERP/CRM (Phase 1-4)

Uzbekistondagi imtihonga tayyorlov markazlari uchun ichki ERP/CRM tizimi.  
Bu platforma faqat xodimlar (owner/admin, manager, receptionist, teacher, accountant) uchun mo'ljallangan.

## Texnologiyalar

- Next.js App Router
- TypeScript
- Tailwind CSS
- RHF + Zod
- Prisma + PostgreSQL
- TanStack Query
- Native fetch

## Phase 1-4 modullar

- Auth (login/logout, cookie session, middleware protection)
- RBAC (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `TEACHER`, `ACCOUNTANT`)
- Branch management
- Student management (CRUD + qidiruv/filtr)
- Lead management (CRUD + status + lead -> student conversion)
- Teacher management (CRUD + filtr)
- Group management (CRUD + teacher assignment + students attach)
- Dashboard (asosiy statistikalar + recent students/leads)
- Attendance (kunlik davomat, bulk belgilash, tarix)
- Payments (to'lov kiritish, usul bo'yicha filtr, tarix)
- Debt tracking (oylik to'lov sozlamasi, qarzdorlik ro'yxati, reminder log)
- Financial dashboard (bugungi/oylik tushum, qarzdorlik, usullar kesimi)
- Cash flow log (xronologik kirimlar)
- Expense management (kiritish, tahrirlash, bekor qilish, kategoriya filtrlari)
- Teacher salary (salary model config, davriy hisoblash, partial/full to'lov)
- Financial ledger (INCOME/EXPENSE/SALARY yagona jurnal)
- Monthly reports (revenue, expense, salary, net profit, insightlar)
- Audit log (moliyaviy amallar tarixi)
- Internal notification system (bell, unread count, read actions)
- Task / follow-up system (assign, track, complete)
- Automation engine (absence/debt/lead/group-full rules)
- Smart dashboard widgets (alerts, likely-drop, overdue preview)
- Telegram integration (opt-in + student/parent message sending)
- Daily automation job endpoint and script (`npm run jobs:daily`)

## Boshlash

1. `cp .env.example .env` (Windowsda qo'lda nusxa oling)
2. `DATABASE_URL` va `AUTH_SECRET` ni sozlang
3. Phase 4 uchun qo'shimcha env:
   - `TELEGRAM_BOT_TOKEN` (Telegram bot API token)
   - `AUTOMATION_JOB_SECRET` (daily job endpoint maxfiy kaliti)
   - `APP_URL` (ixtiyoriy, default: `http://localhost:3000`)
4. Paketlar o'rnating:
   ```bash
   npm install
   ```
5. Prisma client yaratish va schema qo'llash:
   ```bash
   npm run prisma:generate
   npm run db:push
   ```
6. Seed ma'lumotlar:
   ```bash
   npm run db:seed
   ```
   yoki bir martada:
   ```bash
   npm run db:setup
   ```
7. Loyihani ishga tushirish:
   ```bash
   npm run dev
   ```

## Test login

- Telefon: `+998900000001`
- Parol: `Admin12345!`

## Skriptlar

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run typecheck`
- `npm run prisma:generate`
- `npm run db:prepare`
- `npm run db:push`
- `npm run db:seed`
- `npm run db:setup`
- `npm run jobs:daily`
