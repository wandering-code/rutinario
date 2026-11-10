"""Un solo usuario: el administrador, con la contraseña del .env.

La sesión es un JWT en una cookie httpOnly (el JavaScript de la página no
puede leerla), igual que en Puchi."""

import hmac
import os
import time
from collections import deque
from datetime import datetime, timedelta, timezone

from fastapi import Cookie, HTTPException, Request
from jose import JWTError, jwt

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE = "rutinario_token"
ALGORITHM = "HS256"
DURACION = timedelta(days=180)

# Freno simple a quien pruebe contraseñas: 8 intentos fallidos por IP cada 15 min.
_fallos: dict[str, deque] = {}


def comprobar_password(ip: str, password: str) -> bool:
    ventana = _fallos.setdefault(ip, deque())
    limite = time.time() - 15 * 60
    while ventana and ventana[0] < limite:
        ventana.popleft()
    if len(ventana) >= 8:
        raise HTTPException(429, "Demasiados intentos. Espera unos minutos.")
    if ADMIN_PASSWORD and hmac.compare_digest(password.encode(), ADMIN_PASSWORD.encode()):
        ventana.clear()
        return True
    ventana.append(time.time())
    time.sleep(0.4)
    return False


def crear_token() -> str:
    exp = datetime.now(timezone.utc) + DURACION
    return jwt.encode({"sub": "admin", "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def poner_cookie(response, token: str) -> None:
    response.set_cookie(
        COOKIE, token, httponly=True, samesite="lax", secure=COOKIE_SECURE,
        max_age=int(DURACION.total_seconds()), path="/",
    )


def ip_de(request: Request) -> str:
    # Detrás de Cloudflare Tunnel + nginx la IP real viene en una cabecera.
    return (
        request.headers.get("cf-connecting-ip")
        or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "?")
    )


def requiere_admin(rutinario_token: str | None = Cookie(default=None)) -> str:
    if not rutinario_token:
        raise HTTPException(401, "No has iniciado sesión")
    try:
        payload = jwt.decode(rutinario_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Sesión caducada")
    if payload.get("sub") != "admin":
        raise HTTPException(401, "Sesión no válida")
    return "admin"
