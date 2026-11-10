import io
import mimetypes
import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.orm import Session

import auth
from database import Base, engine, esperar_a_postgres, get_db
from models import Ejercicio, Rutina, Taxonomia
from seed import sembrar

# La imagen python:3.12-slim no trae /etc/mime.types y Python 3.12 no conoce
# .webp: sin esto las fotos se sirven como text/plain.
mimetypes.add_type("image/webp", ".webp")

UPLOADS = Path(os.getenv("UPLOADS_DIR", Path(__file__).parent / "uploads"))
UPLOADS.mkdir(parents=True, exist_ok=True)
MAX_LADO = 1600
MAX_BYTES = 15 * 1024 * 1024

app = FastAPI(title="Rutinario")


@app.on_event("startup")
def arrancar():
    esperar_a_postgres()
    Base.metadata.create_all(engine)
    from database import SessionLocal
    with SessionLocal() as db:
        sembrar(db)


class _Subidas(StaticFiles):
    """Cada imagen subida tiene un nombre único que nunca se reutiliza, así que
    el navegador (y el service worker) pueden guardarla para siempre."""

    async def get_response(self, path, scope):
        resp = await super().get_response(path, scope)
        if resp.status_code == 200:
            resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return resp


app.mount("/uploads", _Subidas(directory=UPLOADS), name="uploads")


# ── Sesión ──────────────────────────────────────────────────────────────────

class Login(BaseModel):
    password: str


@app.post("/auth/login")
def login(body: Login, request: Request, response: Response):
    if not auth.comprobar_password(auth.ip_de(request), body.password):
        raise HTTPException(401, "Contraseña incorrecta")
    auth.poner_cookie(response, auth.crear_token())
    return {"ok": True}


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(auth.COOKIE, path="/")
    return {"ok": True}


@app.get("/auth/me")
def me(_: str = Depends(auth.requiere_admin)):
    return {"user": "admin"}


@app.get("/health")
def health():
    return {"ok": True}


# ── Músculos ────────────────────────────────────────────────────────────────

class Musculo(BaseModel):
    id: str = Field(min_length=1, max_length=60)
    name: str = Field(min_length=1, max_length=80)


class Grupo(BaseModel):
    id: str = Field(min_length=1, max_length=60)
    name: str = Field(min_length=1, max_length=80)
    muscles: list[Musculo]


@app.get("/taxonomy")
def get_taxonomy(db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    t = db.get(Taxonomia, 1)
    return t.data if t else []


@app.put("/taxonomy")
def put_taxonomy(body: list[Grupo], db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    data = [g.model_dump() for g in body]
    ids = [m["id"] for g in data for m in g["muscles"]]
    if len(ids) != len(set(ids)):
        raise HTTPException(400, "Hay dos músculos con el mismo identificador")
    t = db.get(Taxonomia, 1) or Taxonomia(id=1)
    t.data = data
    db.add(t)
    # Un músculo borrado no puede quedarse colgando en los ejercicios: el
    # contador de series lo contaría como "desconocido".
    validos = set(ids)
    for e in db.query(Ejercicio).all():
        p = [m for m in e.primary if m in validos]
        s = [m for m in e.secondary if m in validos]
        if p != e.primary or s != e.secondary:
            e.primary, e.secondary = p, s
    db.commit()
    return data


# ── Ejercicios ──────────────────────────────────────────────────────────────

class EjercicioIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    kind: str = "fuerza"
    equipment: str = ""
    primary: list[str] = []
    secondary: list[str] = []
    description: str = ""
    video_url: str = ""
    images: list[str] = []
    favorite: bool = False


def _ejercicio_dict(e: Ejercicio) -> dict:
    return {
        "id": e.id, "name": e.name, "kind": e.kind, "equipment": e.equipment,
        "primary": e.primary, "secondary": e.secondary, "description": e.description,
        "video_url": e.video_url, "images": e.images, "favorite": e.favorite,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }


def _imagenes_validas(urls: list[str]) -> list[str]:
    # Solo imágenes subidas aquí: nada de rutas arbitrarias del disco.
    return [u for u in urls if u.startswith("/uploads/") and "/" not in u[len("/uploads/"):]]


def _limpiar_huerfanas(db: Session, candidatas: set[str]) -> None:
    if not candidatas:
        return
    en_uso = {u for e in db.query(Ejercicio).all() for u in e.images}
    for url in candidatas - en_uso:
        try:
            (UPLOADS / url.removeprefix("/uploads/")).unlink(missing_ok=True)
        except OSError:
            pass


@app.get("/exercises")
def list_exercises(db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    return [_ejercicio_dict(e) for e in db.query(Ejercicio).order_by(Ejercicio.name).all()]


@app.post("/exercises")
def create_exercise(body: EjercicioIn, db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    data = body.model_dump()
    data["images"] = _imagenes_validas(data["images"])
    e = Ejercicio(**data)
    db.add(e)
    db.commit()
    return _ejercicio_dict(e)


@app.put("/exercises/{eid}")
def update_exercise(eid: int, body: EjercicioIn, db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    e = db.get(Ejercicio, eid)
    if not e:
        raise HTTPException(404, "Ese ejercicio ya no existe")
    antes = set(e.images)
    data = body.model_dump()
    data["images"] = _imagenes_validas(data["images"])
    renombrado = e.name != data["name"]
    for k, v in data.items():
        setattr(e, k, v)
    if renombrado:
        _renombrar_en_rutinas(db, eid, data["name"])
    db.commit()
    _limpiar_huerfanas(db, antes - set(e.images))
    return _ejercicio_dict(e)


def _renombrar_en_rutinas(db: Session, eid: int, nombre: str) -> None:
    """Las rutinas guardan copia del nombre de cada ejercicio (para no romperse
    si se borra de la biblioteca), así que al renombrarlo hay que propagarlo.

    Sin subir `version` ni `updated_at`: no es una edición de la rutina, y
    subir la versión haría saltar el aviso de conflicto en un editor abierto
    (que ya se sincroniza solo con la biblioteca)."""
    for r in db.query(Rutina).all():
        cambiado = False
        for w in (r.data or {}).get("weeks", []):
            for d in w.get("days", []):
                for en in d.get("entries", []):
                    if en.get("exerciseId") == eid and en.get("name") != nombre:
                        en["name"] = nombre
                        cambiado = True
        if cambiado:
            db.execute(
                update(Rutina).where(Rutina.id == r.id)
                .values(data=r.data, updated_at=Rutina.updated_at)
            )


@app.delete("/exercises/{eid}")
def delete_exercise(eid: int, db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    e = db.get(Ejercicio, eid)
    if not e:
        return {"ok": True}
    imgs = set(e.images)
    db.delete(e)
    db.commit()
    _limpiar_huerfanas(db, imgs)
    return {"ok": True}


@app.post("/uploads")
async def upload_image(file: UploadFile = File(...), _: str = Depends(auth.requiere_admin)):
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "La imagen pesa demasiado (máx. 15 MB)")
    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)  # fotos del móvil: respetar la orientación
    except Exception:
        raise HTTPException(400, "Eso no parece una imagen")
    img.thumbnail((MAX_LADO, MAX_LADO))
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
    name = f"{uuid.uuid4().hex}.webp"
    img.save(UPLOADS / name, "WEBP", quality=84, method=5)
    return {"url": f"/uploads/{name}"}


# ── Rutinas ─────────────────────────────────────────────────────────────────

class RutinaIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    data: dict[str, Any] = {}
    archived: bool = False


class RutinaUpdate(RutinaIn):
    version: int


def _rutina_dict(r: Rutina) -> dict:
    return {
        "id": r.id, "name": r.name, "data": r.data, "archived": r.archived, "version": r.version,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@app.get("/routines")
def list_routines(db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    return [_rutina_dict(r) for r in db.query(Rutina).order_by(Rutina.updated_at.desc()).all()]


@app.get("/routines/{rid}")
def get_routine(rid: int, db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    r = db.get(Rutina, rid)
    if not r:
        raise HTTPException(404, "Esa rutina ya no existe")
    return _rutina_dict(r)


@app.post("/routines")
def create_routine(body: RutinaIn, db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    r = Rutina(name=body.name, data=body.data, archived=body.archived, version=1)
    db.add(r)
    db.commit()
    return _rutina_dict(r)


@app.put("/routines/{rid}")
def update_routine(rid: int, body: RutinaUpdate, db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    r = db.get(Rutina, rid)
    if not r:
        raise HTTPException(404, "Esa rutina ya no existe")
    if body.version != r.version:
        raise HTTPException(409, "La rutina ha cambiado desde otro dispositivo")
    r.name, r.data, r.archived = body.name, body.data, body.archived
    r.version += 1
    db.commit()
    return _rutina_dict(r)


@app.delete("/routines/{rid}")
def delete_routine(rid: int, db: Session = Depends(get_db), _: str = Depends(auth.requiere_admin)):
    r = db.get(Rutina, rid)
    if r:
        db.delete(r)
        db.commit()
    return {"ok": True}
