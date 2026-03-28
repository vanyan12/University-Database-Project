
from datetime import datetime, timedelta, timezone
import os
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

JWT_SECRET_KEY = "PeaceWasNeverAnOption"
JWT_ALGORITHM = "HS512"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

bearer_scheme = HTTPBearer(auto_error=False)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite frontend
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

    if user_id is None or profile_id is None or role is None:
        raise HTTPException(status_code=401, detail="Token payload is incomplete")

    try:
        payload["profile_id"] = int(profile_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Token profile_id is invalid")

    payload["role"] = str(role).strip().lower()
    return payload


def ensure_can_modify(token_data: dict[str, Any]) -> None:
    if token_data.get("role") == "student":
        raise HTTPException(status_code=403, detail="Students are not allowed to modify data")


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
def list_tables(token_data: dict[str, Any] = Depends(get_current_user_token), db=Depends(get_db)):
    role = token_data.get("role")

    with db.cursor() as cur:
        if role == "student":
            placeholders = ", ".join("?" for _ in STUDENT_ALLOWED)
            cur.execute(
                f"""
                SELECT ROUTINE_NAME AS table_name
                FROM INFORMATION_SCHEMA.ROUTINES
                WHERE ROUTINE_SCHEMA = 'dbo'
                AND ROUTINE_TYPE = 'PROCEDURE'
                AND ROUTINE_NAME IN ({placeholders})
                ORDER BY ROUTINE_NAME;
                """,
                tuple(sorted(STUDENT_ALLOWED)),
            )
        else:
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
        table_columns = get_table_columns(table_name, db)
        safe_table_name = quote_identifier(table_name)

        where_column = None
        if role == "student" and "student_id" in table_columns:
            where_column = "student_id"
        if role == "student" and "group_id" in table_columns:
            where_column = "group_id"
        elif role == "professor" and "professor_id" in table_columns:
            where_column = "professor_id"

        print(f"Debug: role={role}, table={table_name}, where_column={where_column}, profile_id={profile_id}")


        cur.execute("EXEC ? ?", (table_name,profile_id,))

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
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):
    ensure_can_modify(token_data)

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
    token_data: dict[str, Any] = Depends(get_current_user_token),
    db=Depends(get_db),
):
    ensure_can_modify(token_data)

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