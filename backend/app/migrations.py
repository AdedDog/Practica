"""
Простые миграции SQLite при старте (без Alembic).
"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection

from app.security import hash_code
from app.seed import DEMO_INVITE_CODE


def _migrate_invite_codes_code_column(connection: Connection) -> None:
    inspector = inspect(connection)
    if "invite_codes" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("invite_codes")}
    if "code" not in columns:
        connection.execute(text("ALTER TABLE invite_codes ADD COLUMN code VARCHAR(32)"))

    demo_hash = hash_code(DEMO_INVITE_CODE)
    connection.execute(
        text(
            "UPDATE invite_codes SET code = :code "
            "WHERE code IS NULL AND code_hash = :hash"
        ),
        {"code": DEMO_INVITE_CODE, "hash": demo_hash},
    )


def _migrate_events_dates(connection: Connection) -> None:
    inspector = inspect(connection)
    if "events" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("events")}
    if "start_date" not in columns:
        connection.execute(text("ALTER TABLE events ADD COLUMN start_date DATE"))
    if "end_date" not in columns:
        connection.execute(text("ALTER TABLE events ADD COLUMN end_date DATE"))


def run_migrations(connection: Connection) -> None:
    _migrate_invite_codes_code_column(connection)
    _migrate_events_dates(connection)
