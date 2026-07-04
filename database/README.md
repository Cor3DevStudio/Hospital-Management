# MariaDB setup (HeidiSQL)

This app uses **MariaDB** as the real database. Browser `localStorage` is still used for some modules until they are migrated; **authentication and users** are stored in MariaDB.

## 1. Install MariaDB

- Download MariaDB: https://mariadb.org/download/
- Or install via XAMPP/WAMP (includes MariaDB/MySQL + HeidiSQL is separate)

Default local settings (adjust if yours differ):

| Setting  | Value            |
|----------|------------------|
| Host     | `localhost`      |
| Port     | `3306`           |
| User     | `root`           |
| Password | *(your password)* |

## 2. Open HeidiSQL

1. **New session** → Network type: **MariaDB or MySQL (TCP/IP)**
2. Hostname: `127.0.0.1`, User: `root`, Password: your MariaDB password
3. Click **Open**

## 3. Run the SQL (one file only)

1. **File → Run SQL file…** → select `database/install_all.sql`
2. Wait until it finishes (includes schema, users, indexes, and ~8,935 PhilHealth case rates)

You should see database `medical_center` with tables: `users`, `hospital_settings`, `patients`, `auth_sessions`, `app_clinical_state`, `philhealth_records`.

## 4. Configure the app

Copy `.env.example` to `.env` in the project root and set your MariaDB credentials:

```env
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password_here
DATABASE_NAME=medical_center
```

## 5. Start the app

```bash
npm run dev
```

Test the connection: open `http://localhost:5173/api/health/db` — you should see `{ "ok": true, "database": "medical_center" }`.

## Default login accounts

| Username       | Password          | Role            |
|----------------|-------------------|-----------------|
| admin          | admin123          | Administrator   |
| dr.santos      | dr.santos123      | Doctor          |
| dr.reyes       | dr.reyes123       | Doctor          |
| receptionist   | receptionist123   | Receptionist    |
| cashier        | cashier123        | Cashier         |

## Seed from Node (optional)

```bash
npm run db:seed
```

This runs `install_all.sql`, refreshes user password hashes, and loads **demo clinical data** for every module.

After seeding, log in and open **Settings → Maintenance → Load from Database** if the UI still shows empty lists (localStorage may hold an older empty state).

To refresh PhilHealth case rates inside `install_all.sql` from a live database:

```bash
npm run db:export-case-rates-seed
```
