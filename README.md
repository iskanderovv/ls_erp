# O'quv Markaz ERP/CRM (Phase 1-3)

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

## Phase 1-3 modullar

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

## Boshlash

1. `cp .env.example .env` (Windowsda qo'lda nusxa oling)
2. `DATABASE_URL` va `AUTH_SECRET` ni sozlang
3. Paketlar o'rnating:
   ```bash
   npm install
   ```
4. Prisma client yaratish va schema qo'llash:
   ```bash
   npm run prisma:generate
   npm run db:push
   ```
5. Seed ma'lumotlar:
   ```bash
   npm run db:seed
   ```
   yoki bir martada:
   ```bash
   npm run db:setup
   ```
6. Loyihani ishga tushirish:
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
