
from datetime import datetime, timedelta, timezone
from typing import Any
from utils import *
from fastapi import Body, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
import pyodbc


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


STUDENT_ALLOWED = {
    "Classmates",
    "My_Courses",
    "My_Assignments",
    "Schedule",
}

PROFESSOR_ALLOWED = {
    'sp_Lessons',
    'sp_Students',
    'sp_Courses',
    'sp_Assignments',
    'sp_Participation',
    'sp_Exams',
}

JWT_SECRET_KEY = "PeaceWasNeverAnOption"
JWT_ALGORITHM = "HS512"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

bearer_scheme = HTTPBearer(auto_error=False)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = pyodbc.connect(
        "DRIVER={ODBC Driver 18 for SQL Server};"
        "SERVER=localhost\\SQLSERVER;"
        "DATABASE=uni;"
        "UID=sa;"
        "PWD=123123123;"
        "Encrypt=yes;"
        "TrustServerCertificate=yes;"
    )
    try:
        yield conn # After returning the connection, it executes also finally block to close the connection when done
    finally:
        conn.close()


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {**data, "exp": expire}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    profile_id = payload.get("profile_id")
    role = payload.get("role")
    user_id = payload.get("sub")

    if user_id is None or role is None:
        raise HTTPException(status_code=401, detail="Token payload is incomplete")

    if profile_id is not None:
        try:
            payload["profile_id"] = int(profile_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=401, detail="Token profile_id is invalid")
    else:
        payload["profile_id"] = None

    payload["role"] = str(role).strip().lower()
    return payload


def ensure_can_modify(token_data: dict[str, Any]) -> None:
    if token_data.get("role") == "student":
        raise HTTPException(status_code=403, detail="Students are not allowed to modify data")


def resolve_write_table_name(table_name: str, db) -> str:
    raw_name = str(table_name or "").strip()
    if not raw_name:
        raise HTTPException(status_code=400, detail="Table name is required")

    normalized = raw_name.lower()
    candidates: list[str] = [raw_name]

    if normalized.startswith("sp_") or normalized.startswith("my_"):
        candidates.append(raw_name[3:])

    # UI routes and SQL object names are not always singular/plural aligned.
    additional_candidates: list[str] = []
    for candidate in candidates:
        trimmed = candidate.strip()
        if not trimmed:
            continue

        if trimmed.lower().endswith("s"):
            additional_candidates.append(trimmed[:-1])
        else:
            additional_candidates.append(f"{trimmed}s")

    candidates.extend(additional_candidates)

    seen: set[str] = set()
    deduplicated_candidates: list[str] = []
    for candidate in candidates:
        candidate_text = candidate.strip()
        if not candidate_text:
            continue

        key = candidate_text.lower()
        if key in seen:
            continue
        seen.add(key)
        deduplicated_candidates.append(candidate_text)

    for candidate in deduplicated_candidates:
        if table_exists(candidate, db):
            return candidate

    raise HTTPException(status_code=400, detail=f"Unable to resolve writable table for '{table_name}'")


def get_status_lookup_table_name(db) -> str:
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT TOP 1 c1.TABLE_NAME
            FROM INFORMATION_SCHEMA.COLUMNS c1
            JOIN INFORMATION_SCHEMA.COLUMNS c2
              ON c1.TABLE_SCHEMA = c2.TABLE_SCHEMA
             AND c1.TABLE_NAME = c2.TABLE_NAME
            WHERE c1.TABLE_SCHEMA = 'dbo'
              AND c1.COLUMN_NAME = 'status_id'
              AND c2.COLUMN_NAME = 'status_name'
            ORDER BY c1.TABLE_NAME
            """
        )
        table_row = cur.fetchone()

    if table_row is None:
        raise HTTPException(status_code=500, detail="Unable to resolve status lookup table")

    return str(table_row[0])


def resolve_status_id(status_value: Any, db) -> int:
    if status_value is None:
        raise HTTPException(status_code=400, detail="Status value is required")

    # Allow clients to send status_id directly.
    if isinstance(status_value, int):
        return status_value

    status_text = str(status_value).strip()
    if not status_text:
        raise HTTPException(status_code=400, detail="Status value is required")

    if status_text.isdigit():
        return int(status_text)

    status_table = quote_identifier(get_status_lookup_table_name(db))

    with db.cursor() as cur:
        cur.execute(
            f"SELECT TOP 1 {quote_identifier('status_id')} FROM dbo.{status_table} WHERE LOWER({quote_identifier('status_name')}) = LOWER(?)",
            (status_text,),
        )
        status_row = cur.fetchone()

    if status_row is None:
        raise HTTPException(status_code=400, detail=f"Invalid status_name: {status_text}")

    return int(status_row[0])


@app.get("/api/status-options")
def get_status_options(
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):
    _ = token_data
    status_table = quote_identifier(get_status_lookup_table_name(db))

    with db.cursor() as cur:
        cur.execute(
            f"SELECT {quote_identifier('status_id')}, {quote_identifier('status_name')} FROM dbo.{status_table} ORDER BY {quote_identifier('status_id')}"
        )
        rows = cur.fetchall()

    options = [
        {
            "status_id": int(row[0]),
            "status_name": str(row[1]),
        }
        for row in rows
    ]

    return {"options": options}


@app.get("/api/course-id")
def get_course_id_by_name(
    course_name: str,
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):
    _ = token_data
    normalized_course_name = str(course_name or "").strip()
    if not normalized_course_name:
        raise HTTPException(status_code=400, detail="course_name is required")

    table_name = resolve_write_table_name("Courses", db)
    safe_table_name = quote_identifier(table_name)

    with db.cursor() as cur:
        cur.execute(
            f"""
            SELECT TOP 1 {quote_identifier('course_id')}
            FROM dbo.{safe_table_name}
            WHERE LOWER({quote_identifier('course_name')}) = LOWER(?)
            """,
            (normalized_course_name,),
        )
        row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail=f"Course not found: {normalized_course_name}")

    return {"course_id": int(row[0])}


@app.post("/api/login")
def login(payload: LoginRequest, db=Depends(get_db)):
    email = payload.email.strip().lower()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    with db.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM dbo.v_user_login U
            WHERE LOWER(U.email) = ?
            """,
            (email,),
        )
        user = cur.fetchone()

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id, stored_email, password_hash, is_active, role_name, student_id, professor_id = user
    role_name = str(role_name).strip().lower()
    profile_id = student_id if student_id is not None else professor_id

    if not is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    if not verify_password(payload.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(
        {
            "sub": str(user_id),
            "role": role_name,
            "profile_id": int(profile_id) if profile_id is not None else None,
            "email": stored_email,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {
        "message": "Login successful",
        "email": stored_email,
        "role": role_name,
        "user_id": user_id,
        "profile_id": profile_id,
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@app.get("/api/tables")
def list_all_tables(token_data: dict[str, Any] = Depends(get_current_user_token), db=Depends(get_db)):
    role = token_data.get("role")
    allowed_routines = sorted(STUDENT_ALLOWED if role == "student" else PROFESSOR_ALLOWED)
    placeholders = ", ".join("?" for _ in allowed_routines)

    with db.cursor() as cur:
        cur.execute(
            f"""
            SELECT ROUTINE_NAME AS table_name
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_SCHEMA = 'dbo'
            AND ROUTINE_TYPE = 'PROCEDURE'
            AND ROUTINE_NAME IN ({placeholders})
            ORDER BY ROUTINE_NAME;
            """,
            tuple(allowed_routines),
        )
        tables = [row[0] for row in cur.fetchall()]

    return {"tables": tables}


@app.get("/api/table/{table_name}")
def get_table_info(
    table_name: str,
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):
    role = token_data.get("role", "").lower()
    
    if role == "student" and table_name not in STUDENT_ALLOWED:
        raise HTTPException(status_code=403, detail="Students are not allowed to access this table")

    if role == "professor" and table_name not in (set(PROFESSOR_ALLOWED) | {"Courses"}):
        raise HTTPException(status_code=403, detail="Professors are not allowed to access this table")

    if role not in ("student", "professor"):
        raise HTTPException(status_code=403, detail="User role is not recognized")

    with db.cursor() as cur:
        safe_table_name = quote_identifier(table_name)
        cur.execute(f"EXEC dbo.{safe_table_name} ?", (token_data.get("profile_id"),))
        
        raw_rows = cur.fetchall()
        columns_list = [column[0] for column in cur.description]
        rows = [dict(zip(columns_list, row)) for row in raw_rows]

    columns = get_table_columns(table_name, db)
    return {"table": table_name, "columns": columns, "rows": rows}

@app.get("/api/sp/{table_name}")
def get_table_rows(
    table_name: str,
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):

    role = token_data["role"]
    profile_id = token_data["profile_id"]

    if role == "student" and table_name not in STUDENT_ALLOWED:
        raise HTTPException(status_code=403, detail="Students are not allowed to access this table")

    with db.cursor() as cur:
        safe_table_name = quote_identifier(table_name)

        if role in ("student", "professor"):
            cur.execute(f"EXEC dbo.{safe_table_name} ?", (profile_id,))



        raw_rows = cur.fetchall()


        columns = [column[0] for column in cur.description]
        rows = [dict(zip(columns, row)) for row in raw_rows]

    return {"table": table_name, "rows": rows}

@app.delete("/api/table/{table_name}/{row_id}")
def delete_table_row(
    table_name: str,
    row_id: str,
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):
    ensure_can_modify(token_data)
    target_table_name = resolve_write_table_name(table_name, db)
    pk_column = get_primary_key_column(target_table_name, db)

    safe_table_name = quote_identifier(target_table_name)
    safe_pk = quote_identifier(pk_column)
    query = f"DELETE FROM dbo.{safe_table_name} WHERE {safe_pk} = ?"

    with db.cursor() as cur:
        cur.execute(query, (row_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Row not found")
        db.commit()

    return {"message": "Row deleted successfully"}

@app.post("/api/table/{table_name}")
def create_table_row(
    table_name: str,
    payload: dict[str, Any] = Body(...),
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):
    ensure_can_modify(token_data)

    if not payload:
        raise HTTPException(status_code=400, detail="Request body cannot be empty")

    payload = {
        column: value
        for column, value in payload.items()
        if not str(column).startswith("__")
    }

    target_table_name = resolve_write_table_name(table_name, db)

    normalized_table_name = table_name.strip().lower()
    if normalized_table_name in {"participation", "sp_participation", "sp_participations"}:
        incoming_status_value = payload.get("status_id", payload.get("status_name"))
        if incoming_status_value is not None:
            payload["status_id"] = resolve_status_id(incoming_status_value, db)
            payload.pop("status_name", None)

    table_columns = get_table_columns(target_table_name, db)
    table_columns_lookup = {column.lower(): column for column in table_columns}

    try:
        pk_columns = get_primary_key_columns(target_table_name, db)
    except HTTPException as exc:
        if exc.status_code == 400 and str(exc.detail) == "Table has no primary key":
            pk_columns = []
        else:
            raise

    normalized_payload: dict[str, Any] = {}
    for column, value in payload.items():
        resolved_column = table_columns_lookup.get(str(column).lower())
        if resolved_column is None:
            continue

        # New rows initialized in the grid use empty strings for untouched fields.
        if isinstance(value, str) and value.strip() == "":
            normalized_payload[resolved_column] = None
        else:
            normalized_payload[resolved_column] = value

    insert_columns: list[str] = []
    single_pk_column = pk_columns[0] if len(pk_columns) == 1 else None
    for column, value in normalized_payload.items():
        # Keep PK value when UI provides it (e.g. Assignment.assignment_id),
        # but skip null/empty PK so identity-like tables can auto-generate.
        if single_pk_column is not None and column == single_pk_column and value is None:
            continue
        insert_columns.append(column)

    if not insert_columns:
        raise HTTPException(status_code=400, detail="No insertable fields provided")

    safe_table_name = quote_identifier(target_table_name)
    columns_clause = ", ".join(quote_identifier(column) for column in insert_columns)
    placeholders = ", ".join("?" for _ in insert_columns)
    query = (
        f"INSERT INTO dbo.{safe_table_name} ({columns_clause}) "
        f"OUTPUT INSERTED.* "
        f"VALUES ({placeholders})"
    )
    values = [normalized_payload[column] for column in insert_columns]

    with db.cursor() as cur:
        cur.execute(query, values)
        created_row = cur.fetchone()
        columns = [column[0] for column in cur.description]
        db.commit()

    return {"table": target_table_name, "row": dict(zip(columns, created_row))}


@app.put("/api/table/Participation/{student_id}/{lesson_id}")
def update_participation_row(
    student_id: str,
    lesson_id: str,
    payload: dict[str, Any] = Body(...),
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):
    ensure_can_modify(token_data)

    if not payload:
        raise HTTPException(status_code=400, detail="Request body cannot be empty")

    safe_table_name = quote_identifier("Participation")
    normalized_payload = {
        column.lower(): value
        for column, value in payload.items()
        if not str(column).startswith("__")
    }

    incoming_status_value = normalized_payload.get("status_id", normalized_payload.get("status_name"))
    status_id = resolve_status_id(incoming_status_value, db)

    query = (
        f"UPDATE dbo.{safe_table_name} "
        f"SET {quote_identifier('status_id')} = ? "
        f"OUTPUT INSERTED.* "
        f"WHERE {quote_identifier('student_id')} = ? AND {quote_identifier('lesson_id')} = ?"
    )

    values = [status_id, student_id, lesson_id]

    with db.cursor() as cur:
        cur.execute(query, values)
        updated_row = cur.fetchone()
        if updated_row is None:
            raise HTTPException(status_code=404, detail="Row not found")

        columns = [column[0] for column in cur.description]
        db.commit()

    return {"table": "Participation", "row": dict(zip(columns, updated_row))}


@app.put("/api/table/{table_name}/{row_id}")
def update_table_row(
    table_name: str,
    row_id: str,
    payload: dict[str, Any] = Body(...),
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):
    ensure_can_modify(token_data)

    if table_name.strip().lower() in {"participation", "sp_participation", "sp_participations"}:
        raise HTTPException(
            status_code=400,
            detail="Use /api/table/Participation/{student_id}/{lesson_id} endpoint for updates",
        )

    if not payload:
        raise HTTPException(status_code=400, detail="Request body cannot be empty")

    target_table_name = resolve_write_table_name(table_name, db)
    table_columns = get_table_columns(target_table_name, db)
    pk_columns = get_primary_key_columns(target_table_name, db)

    key_values: dict[str, Any] = {}
    if len(pk_columns) == 1:
        key_values[pk_columns[0]] = row_id
    else:
        for pk_column in pk_columns:
            if pk_column in payload and payload[pk_column] is not None:
                key_values[pk_column] = payload[pk_column]

        missing_pk_columns = [pk_column for pk_column in pk_columns if pk_column not in key_values]
        if missing_pk_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing composite key values for: {', '.join(missing_pk_columns)}",
            )

    normalized_table_name = table_name.strip().lower()
    if normalized_table_name in {"participation", "sp_participation", "sp_participations"}:
        incoming_status_value = payload.get("status_id", payload.get("status_name"))
        if incoming_status_value is None:
            raise HTTPException(status_code=400, detail="status_id or status_name is required for Participation updates")

        payload = {"status_id": resolve_status_id(incoming_status_value, db)}

    update_columns = [column for column in payload.keys() if column not in set(pk_columns)]

    if not update_columns:
        raise HTTPException(status_code=400, detail="No updatable fields provided")

    invalid_columns = [column for column in update_columns if column not in table_columns]
    if invalid_columns:
        raise HTTPException(status_code=400, detail=f"Invalid columns: {', '.join(invalid_columns)}")

    safe_table_name = quote_identifier(target_table_name)
    set_clause = ", ".join(f"{quote_identifier(column)} = ?" for column in update_columns)
    where_clause = " AND ".join(
        f"{quote_identifier(pk_column)} = ?" for pk_column in pk_columns
    )

    query = (
        f"UPDATE dbo.{safe_table_name} "
        f"SET {set_clause} "
        f"OUTPUT INSERTED.* "
        f"WHERE {where_clause}"
    )

    values = [payload[column] for column in update_columns] + [key_values[pk_column] for pk_column in pk_columns]

    with db.cursor() as cur:
        try:
            cur.execute(query, values)
        except Exception as e:
            raise HTTPException(status_code=500, detail="An error occurred while updating the row")

        updated_row = cur.fetchone()
        if updated_row is None:
            raise HTTPException(status_code=404, detail="Row not found")

        columns = [column[0] for column in cur.description]
        db.commit()

    return {"table": target_table_name, "row": dict(zip(columns, updated_row))}