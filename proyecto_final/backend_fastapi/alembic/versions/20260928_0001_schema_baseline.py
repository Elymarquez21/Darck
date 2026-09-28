"""Adopt the checked-in MySQL-compatible schema as the first migration.

Revision ID: 20260928_0001
Revises:
"""
from pathlib import Path
import re

from alembic import op

revision = "20260928_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    schema_file = Path(__file__).resolve().parents[2] / "database" / "schema.sql"
    sql = schema_file.read_text(encoding="utf-8")
    sql = re.sub(r"(?im)^\s*CREATE DATABASE IF NOT EXISTS .*?;\s*", "", sql, count=1, flags=re.S)
    sql = re.sub(r"(?im)^\s*USE\s+[^;]+;\s*", "", sql, count=1)
    # The schema contains no stored programs; semicolon-delimited DDL and seed
    # statements can be executed individually by SQLAlchemy/PyMySQL.
    for statement in sql.split(";"):
        statement = "\n".join(line for line in statement.splitlines() if not line.lstrip().startswith("--"))
        statement = statement.strip()
        if statement:
            op.execute(statement)


def downgrade():
    # This baseline adopts a live application schema. Dropping it would destroy
    # user data, so rollback is intentionally done by restoring a database backup.
    raise RuntimeError("The initial schema baseline is irreversible; restore a database backup instead.")
