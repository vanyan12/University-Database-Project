# University Database

A full-stack university database project with a FastAPI backend, a React/Vite frontend, and SQL scripts for database creation and seed data.

## Project Structure

- `api/` - FastAPI backend
  - `main.py` - API routes, authentication, and database access
  - `utils.py` - password verification and SQL helper functions
  - `requirements.txt` - Python dependencies
  - `.env` - local environment variables for the backend
- `frontend/` - React application built with Vite
  - `src/App.jsx` - main dashboard and table editor
  - `src/main.jsx` - app entry point
  - `src/sign-in-side/` - sign-in screen components
  - `src/shared-theme/` - shared MUI theme customizations
  - `package.json` - npm dependencies and scripts
- `sql/` - database scripts
  - `00_create_database.sql` - creates the database
  - `01_create_tables.sql` - creates schema objects
  - `02_participation_status.sql` - inserts participation status lookup values
  - `03_professors.sql` - inserts professor records
  - `04_faculty_and_chairs.sql` - inserts faculties and chair records
  - `05_assign_chairs.sql` - assigns professors to chairs
  - `06_discount_types.sql` - inserts discount type lookup values
  - `07_courses.sql` - inserts course records
  - `08_groups.sql` - inserts student group records
  - `09_students.sql` - inserts student records
  - `10_assign_groups_principals.sql` - assigns group principals
  - `11_lessons.sql` - inserts lesson schedule records
  - `12_exams.sql` - inserts exam records
  - `13_enrollments.sql` - inserts enrollment records
  - `14_assignments.sql` - inserts assignment records
  - `15_participation.sql` - inserts participation records
  - `16_student_discounts.sql` - inserts student discount records
  - `17_student_assignmnets.sql` - inserts student assignment records
  - `DCL.sql` - creates roles/users/logins and grants permissions
  - `DQL.sql` - contains 25 DQL (SELECT) queries for data analysis and verification
  - `master_script.sql` - runs the SQL scripts in order

## Requirements

- Python 3.12 or compatible
- Node.js 18+ or newer
- SQL Server with ODBC Driver 18 for SQL Server installed

## One-Click Start (Windows)

If you are on Windows, copy the `University Database` project folder to your Desktop first.

Then start both the frontend and backend with:

`C:\Users\<YourUserName>\Desktop\Database\University Database\Start.bat`

What this script does:

1. Installs frontend dependencies with `npm install`.
2. Installs backend dependencies from `api/requirements.txt`.
3. Opens two terminals:
  - Frontend: `npm run dev` in `frontend/`
  - API: `uvicorn main:app --reload --host 0.0.0.0 --port 8000` in `api/`

Before running the script, make sure `api/.env` exists with your local settings:

```env
JWT_SECRET_KEY=your-secret-key
DB_SERVER=localhost\\SQLSERVER
DB_NAME=uni
DB_USER=sa
DB_PASSWORD=your-password
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_ENCRYPT=yes
DB_TRUST_SERVER_CERTIFICATE=yes
CORS_ORIGINS=http://localhost:5173
```


## Database Setup

1. Open the SQL scripts in SQL Server Management Studio or your preferred SQL client.
2. Make sure **SQLCMD Mode** is enabled in SSMS: `Query -> SQLCMD Mode`.
3. If SQLCMD Mode is disabled, `:r` include commands in `sql/master_script.sql` will fail with an error.
4. Run `sql/master_script.sql` to create the database, tables, seed data, and apply DCL permissions.
5. Make sure the SQL Server connection details in `api/.env` match your local instance.

## Notes

- The backend uses JWT bearer authentication.
- The frontend stores the access token in local storage and sends it with protected API requests.
- If you change backend host, frontend host, or SQL Server credentials, update `api/.env` accordingly.
