from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


def ahora():
    return datetime.now(timezone.utc)


class Taxonomia(Base):
    """Grupos musculares y sus músculos, como un único documento.

    Es una lista corta que se edita entera desde Ajustes, así que guardarla de
    una vez es más simple que dos tablas con su orden y sus claves foráneas.
    Forma: [{id, name, muscles: [{id, name}]}]"""

    __tablename__ = "taxonomia"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    data: Mapped[list] = mapped_column(JSONB, default=list)


class Ejercicio(Base):
    __tablename__ = "ejercicios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    # fuerza | cardio | movilidad
    kind: Mapped[str] = mapped_column(String(20), default="fuerza")
    equipment: Mapped[str] = mapped_column(String(40), default="")
    # Ids de músculos (de la taxonomía). Los secundarios cuentan a medias en el
    # contador de series si así se elige.
    primary: Mapped[list] = mapped_column(JSONB, default=list)
    secondary: Mapped[list] = mapped_column(JSONB, default=list)
    description: Mapped[str] = mapped_column(Text, default="")
    video_url: Mapped[str] = mapped_column(String(500), default="")
    # URLs relativas (/uploads/xxx.webp), la primera es la portada.
    images: Mapped[list] = mapped_column(JSONB, default=list)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora, onupdate=ahora)


class Rutina(Base):
    """Una rutina es un documento: semanas → días → ejercicios → series.

    Se edita entera en el navegador (con deshacer/rehacer) y se guarda entera,
    así que no tiene sentido partirla en cinco tablas. Los ejercicios se
    referencian por id y además llevan una copia del nombre, para que una
    rutina no se rompa si el ejercicio se borra de la biblioteca."""

    __tablename__ = "rutinas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    data: Mapped[dict] = mapped_column(JSONB, default=dict)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    # Sube en cada guardado. Si el navegador guarda sobre una versión que no es
    # la última (la rutina se editó entretanto desde otro dispositivo), el
    # servidor responde 409 en vez de pisar esos cambios sin avisar.
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora, onupdate=ahora)
