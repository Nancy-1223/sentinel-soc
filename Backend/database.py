import shutil
import sqlite3
import os
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker

# Local default keeps SQLite beside this file. Render can override it with
# DATABASE_PATH=/var/data/soc_backend.db on a persistent disk.
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DATABASE_PATH", str(BASE_DIR / "soc_backend.db"))).resolve()
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _backup_database(reason: str) -> None:
    if not DB_PATH.exists():
        return

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    backup_path = DB_PATH.with_name(f"{DB_PATH.stem}.{reason}.{timestamp}{DB_PATH.suffix}")
    shutil.move(str(DB_PATH), str(backup_path))


def _sqlite_file_is_healthy() -> bool:
    if not DB_PATH.exists():
        return True

    try:
        with sqlite3.connect(DB_PATH) as connection:
            result = connection.execute("PRAGMA integrity_check").fetchone()
            return bool(result and result[0] == "ok")
    except sqlite3.DatabaseError:
        return False


def _schema_matches_models(base) -> bool:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table in base.metadata.sorted_tables:
        if table.name not in existing_tables:
            return False

        existing_columns = {column["name"] for column in inspector.get_columns(table.name)}
        model_columns = {column.name for column in table.columns}
        if not model_columns.issubset(existing_columns):
            return False

    return True


def _add_missing_sqlite_columns(base) -> None:
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        for table in base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue

            existing_columns = {column["name"] for column in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue

                if column.name == "detection_enabled":
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table.name} ADD COLUMN {column.name} BOOLEAN NOT NULL DEFAULT 1"
                    )
                elif column.name == "agent_mode":
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table.name} ADD COLUMN {column.name} VARCHAR NOT NULL DEFAULT 'running'"
                    )
                elif column.name == "heartbeat_enabled":
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table.name} ADD COLUMN {column.name} BOOLEAN NOT NULL DEFAULT 1"
                    )
                elif column.name == "removed_at":
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table.name} ADD COLUMN {column.name} DATETIME"
                    )
                elif column.name == "endpoint_id":
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table.name} ADD COLUMN {column.name} INTEGER"
                    )
                elif column.name == "agent_version":
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table.name} ADD COLUMN {column.name} VARCHAR NOT NULL DEFAULT 'unknown'"
                    )
                elif column.name == "uptime_seconds":
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table.name} ADD COLUMN {column.name} FLOAT NOT NULL DEFAULT 0"
                    )


def init_database(base) -> None:
    """Create tables, replacing a corrupted or incompatible SQLite database."""
    if not _sqlite_file_is_healthy():
        _backup_database("corrupt")

    try:
        base.metadata.create_all(bind=engine)
        _add_missing_sqlite_columns(base)
        if not _schema_matches_models(base):
            engine.dispose()
            _backup_database("old_schema")
            base.metadata.create_all(bind=engine)
    except (sqlite3.DatabaseError, SQLAlchemyError):
        engine.dispose()
        _backup_database("recreated")
        base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
