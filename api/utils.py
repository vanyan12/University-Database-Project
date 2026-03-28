import os
import re
import base64
import binascii
import hashlib
import hmac
from fastapi import HTTPException



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

# Utility functions for dynamic table access with safety checks
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
