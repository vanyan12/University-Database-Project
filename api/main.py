import os
import re
import base64
import binascii
import hashlib
import hmac
from typing import Any

from fastapi import Body, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import pyodbc


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False

    normalized_hash = stored_hash.strip()

    if hmac.compare_digest(password, normalized_hash):
        return True

    sha256_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if hmac.compare_digest(sha256_hash, normalized_hash.lower()):
        return True

    sha512_hash = hashlib.sha512(password.encode("utf-8")).hexdigest()
    if hmac.compare_digest(sha512_hash, normalized_hash.lower()):
        return True

    if normalized_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations_text, salt, expected_hash = normalized_hash.split("$", 3)
            derived_key = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt.encode("utf-8"),
                int(iterations_text),
            )
            derived_hash = base64.b64encode(derived_key).decode("utf-8").strip()
            return hmac.compare_digest(derived_hash, expected_hash)
        except (TypeError, ValueError, binascii.Error):
            return False

    if normalized_hash.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            bcrypt = __import__("bcrypt")
        except ImportError:
            return False

        return bcrypt.checkpw(password.encode("utf-8"), normalized_hash.encode("utf-8"))

    return False


def table_exists(table_name: str, db) -> bool:
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'dbo' AND table_name = ?
            """,
            (table_name,),
        )
        return cur.fetchone() is not None


def get_user_permissions(role_id: int, user_id: int, db) -> list[str]:
    permissions: set[str] = set()

    has_permissions = table_exists("permissions", db)
    has_role_permissions = table_exists("role_permissions", db)
    has_user_permissions = table_exists("user_permissions", db)

    if not has_permissions:
        return []

    with db.cursor() as cur:
        if has_role_permissions:
            cur.execute(
                """
                SELECT p.permission_name
                FROM dbo.role_permissions rp
                JOIN dbo.permissions p ON p.permission_id = rp.permission_id
                WHERE rp.role_id = ?
                """,
                (role_id,),
            )
            permissions.update(row[0] for row in cur.fetchall())

        if has_user_permissions:
            cur.execute(
                """
                SELECT p.permission_name
                FROM dbo.user_permissions up
                JOIN dbo.permissions p ON p.permission_id = up.permission_id
                WHERE up.user_id = ?
                """,
                (user_id,),
            )
            permissions.update(row[0] for row in cur.fetchall())

    return sorted(permissions)


def quote_identifier(identifier: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", identifier):
        raise HTTPException(status_code=400, detail="Invalid identifier")
    return f"[{identifier}]"


def get_table_columns(table_name: str, db) -> set[str]:
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'dbo' AND table_name = ?
            """,
            (table_name,),
        )
        return {row[0] for row in cur.fetchall()}


def get_primary_key_column(table_name: str, db) -> str:
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT c.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE c
              ON tc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
            WHERE tc.TABLE_SCHEMA = 'dbo'
              AND tc.TABLE_NAME = ?
              AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            """,
            (table_name,),
        )
        rows = cur.fetchall()

    if not rows:
        raise HTTPException(status_code=400, detail="Table has no primary key")
    if len(rows) > 1:
        raise HTTPException(status_code=400, detail="Composite primary keys are not supported")

    return rows[0][0]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=localhost\\SQLSERVER;"
    "DATABASE=university;"
    "UID=sa;"
    "PWD=123123123;"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;")
    try:
        yield conn
    finally:
        conn.close()


@app.get("/")
def root():
    return {"message": "FastAPI is running"}


@app.post("/api/login")
def login(payload: LoginRequest, db=Depends(get_db)):
    email = payload.email.strip().lower()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    with db.cursor() as cur:
        cur.execute(
            """
            SELECT u.user_id, u.email, u.password, u.is_active, u.role_id, r.role_name
            FROM dbo.users u
            JOIN dbo.roles r ON r.role_id = u.role_id
            WHERE LOWER(u.email) = ?
            """,
            (email,),
        )
        user = cur.fetchone()

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id, stored_email, password_hash, is_active, role_id, role_name = user

    if not is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    if not verify_password(payload.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # permissions = get_user_permissions(role_id, user_id, db)

    return {
        "message": "Login successful",
        "email": stored_email,
        "role": role_name,
    }

@app.get("/api/tables")
def list_tables(db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'dbo'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
            """
        )

        tables = [row[0] for row in cur.fetchall()]


    return {"tables": tables}


@app.get("/api/table/{table_name}")
def get_table_rows(table_name: str, db=Depends(get_db)):
    # verify table exists in dbo schema

    with db.cursor() as cur:
        safe_table_name = quote_identifier(table_name)
        cur.execute(f"SELECT * FROM dbo.{safe_table_name}")
        raw_rows = cur.fetchall()

        columns = [column[0] for column in cur.description]
        rows = [dict(zip(columns, row)) for row in raw_rows]

    return {"table": table_name, "rows": rows}

@app.delete("/api/table/{table_name}/{row_id}")
def delete_table_row(table_name: str, row_id: str, db=Depends(get_db)):
    pk_column = get_primary_key_column(table_name, db)

    safe_table_name = quote_identifier(table_name)
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
    db=Depends(get_db),
):

    if not payload:
        raise HTTPException(status_code=400, detail="Request body cannot be empty")

    table_columns = get_table_columns(table_name, db)
    pk_column = get_primary_key_column(table_name, db)

    insert_columns = [column for column in payload.keys() if column != pk_column]
    if not insert_columns:
        raise HTTPException(status_code=400, detail="No insertable fields provided")

    invalid_columns = [column for column in insert_columns if column not in table_columns]
    if invalid_columns:
        raise HTTPException(status_code=400, detail=f"Invalid columns: {', '.join(invalid_columns)}")

    safe_table_name = quote_identifier(table_name)
    columns_clause = ", ".join(quote_identifier(column) for column in insert_columns)
    placeholders = ", ".join("?" for _ in insert_columns)
    query = (
        f"INSERT INTO dbo.{safe_table_name} ({columns_clause}) "
        f"OUTPUT INSERTED.* "
        f"VALUES ({placeholders})"
    )
    values = [payload[column] for column in insert_columns]

    with db.cursor() as cur:
        cur.execute(query, values)
        created_row = cur.fetchone()
        columns = [column[0] for column in cur.description]
        db.commit()

    return {"table": table_name, "row": dict(zip(columns, created_row))}


@app.put("/api/table/{table_name}/{row_id}")
def update_table_row(
    table_name: str,
    row_id: str,
    payload: dict[str, Any] = Body(...),
    db=Depends(get_db),
):

    if not payload:
        raise HTTPException(status_code=400, detail="Request body cannot be empty")

    table_columns = get_table_columns(table_name, db)
    pk_column = get_primary_key_column(table_name, db)

    update_columns = [column for column in payload.keys() if column != pk_column]
    if not update_columns:
        raise HTTPException(status_code=400, detail="No updatable fields provided")

    invalid_columns = [column for column in update_columns if column not in table_columns]
    if invalid_columns:
        raise HTTPException(status_code=400, detail=f"Invalid columns: {', '.join(invalid_columns)}")

    safe_table_name = quote_identifier(table_name)
    safe_pk = quote_identifier(pk_column)
    set_clause = ", ".join(f"{quote_identifier(column)} = ?" for column in update_columns)
    query = (
        f"UPDATE dbo.{safe_table_name} "
        f"SET {set_clause} "
        f"OUTPUT INSERTED.* "
        f"WHERE {safe_pk} = ?"
    )

    values = [payload[column] for column in update_columns] + [row_id]

    with db.cursor() as cur:
        cur.execute(query, values)
        updated_row = cur.fetchone()
        if updated_row is None:
            raise HTTPException(status_code=404, detail="Row not found")

        columns = [column[0] for column in cur.description]
        db.commit()

    return {"table": table_name, "row": dict(zip(columns, updated_row))}