import os
import time

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://rutinario:rutinario@localhost:5438/rutinario")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def esperar_a_postgres(intentos: int = 30) -> None:
    """Tras un corte de luz los dos contenedores arrancan a la vez y Postgres
    tarda unos segundos en aceptar conexiones. Sin esta espera el backend
    muere al arrancar y nginx devuelve 502 hasta que alguien lo reinicia."""
    for i in range(intentos):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception:
            if i == intentos - 1:
                raise
            time.sleep(1)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
