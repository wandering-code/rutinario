# Rutinario

Web para **diseñar rutinas de entrenamiento** (no para registrar entrenos) y exportarlas
en imagen, PDF, Excel, texto, Markdown, CSV o JSON. Un solo usuario: el administrador.
Instalable como app (PWA) en el móvil y en el ordenador.

## Qué hace

- **Rutinas por semanas**: cada día de lunes a domingo con su tipo (fuerza, cardio,
  movilidad, deporte, descanso activo, descanso) y un título. Rutinas **rotativas** de
  varias semanas (A/B, mesociclos…), que se pueden duplicar, renombrar y reordenar.
- **En el ordenador, la semana entera a la vista** (7 columnas). Los ejercicios se
  arrastran para reordenarlos o moverlos de un día a otro. En el móvil, un día cada vez
  (se cambia deslizando o con la tira de días).
- **Cada ejercicio**: series, repeticiones (admite rangos tipo `8-12`), carga, RIR,
  descanso, tempo, notas, series de calentamiento, tipo de serie (drop set, al fallo,
  AMRAP) y **superseries**. Modo simple (todas las series iguales) o **detallado** serie a
  serie. Los de cardio van por tiempo (duración, distancia, intensidad/zona).
- **Biblioteca de ejercicios** con músculos principales y secundarios, material,
  indicaciones, vídeo y **fotos** (del ejercicio o de la máquina: se suben, se arrastran o
  se pegan con ⌘V). Viene con ~70 ejercicios de base.
- **Contador de series** por grupo muscular o por músculo, por semana y con la media si la
  rutina rota. Los secundarios cuentan ½ (o 0, o 1), con objetivo semanal coloreado.
- **Deshacer/rehacer** (⌘Z / ⇧⌘Z) y **guardado automático**. Si la misma rutina se
  edita desde dos dispositivos, avisa en vez de pisar cambios.
- Copiar/pegar días, copiar un día a varios a la vez, duplicar y archivar rutinas,
  plantillas de arranque (full body, torso/pierna, PPL, Weider), tema claro/oscuro.

## Stack

Igual que Puchi:

- `frontend/` — Vite + React 19 + Tailwind 4 + [Motion](https://motion.dev) + React
  Router 7 + PWA (`vite-plugin-pwa`). dnd-kit para arrastrar, ExcelJS y html-to-image para
  exportar (se cargan solo al exportar). Se compila a `dist/` y lo sirve nginx; no lleva
  Dockerfile.
  **Vite 7, no 8**: Vite 8 compila con Rolldown, cuyo binario nativo muere con «Illegal
  instruction» en el Pentium G4400T del mini PC. Mismas versiones que Puchi.
- `backend/` — FastAPI + SQLAlchemy + Postgres 16, en Docker. Las imágenes se guardan en
  `backend/uploads/` (convertidas a WebP, máx. 1600 px).

### Cómo está guardado

- **Una rutina es un documento** (columna JSONB): semanas → días → ejercicios → series.
  Se edita entera en el navegador y se guarda entera. La forma exacta está comentada al
  principio de `frontend/src/domain/rutina.js`, y `normalizar()` rellena lo que falte en
  rutinas antiguas o importadas.
- Los ejercicios de una rutina apuntan a la biblioteca por id **y llevan copia del
  nombre**: borrar un ejercicio de la biblioteca no rompe ninguna rutina.
- Músculos y grupos: un documento editable desde Ajustes. Las reglas del contador están
  en `frontend/src/domain/volumen.js`.

```
frontend/src/
├── platform/   sesión, API, tema, datos compartidos (biblioteca), viewport
├── domain/     reglas: forma de la rutina, resúmenes, duración, contador de series
├── exports/    texto/markdown/csv, excel, json y la lámina de imagen/PDF
├── ui/         piezas reutilizables (hojas, menús, segmentados, iconos…)
└── screens/    Rutinas, editor/ (Plan, Volumen, Exportar…), ejercicios/, Ajustes
```

## Arrancar en local

```bash
cd ~/repos/rutinario
cp backend/.env.example backend/.env     # y pon ADMIN_PASSWORD y SECRET_KEY
docker compose up --build -d             # backend en :8007, Postgres en :5438
cd frontend && npm install && npm run dev
```

Abrir `http://<ip-lan>:5180` (sirve igual desde el móvil en la misma WiFi).
Para probar la PWA instalada: `npm run build && npm run preview` → `:5181`.

## Despliegue en el mini PC

Checklist general en `~/repos/dev-standards/CLAUDE.md` sección 6. Lo propio de este proyecto:

- Puertos: nginx **3014**, backend **8007** (solo `127.0.0.1`), Postgres sin publicar.
- `backend/.env` con `COOKIE_SECURE=true` (va por HTTPS a través de Cloudflare).
- nginx: copiar `deploy/nginx-rutinario.conf` a `/etc/nginx/sites-enabled/rutinario`.
- Las fotos viven en `backend/uploads/` del host (volumen del contenedor): entran en la
  copia de seguridad del servidor, no en git.

---

Pendientes, cosas probadas/descartadas y decisiones de diseño viven en
[GitHub Issues](../../issues) de este repo, no en este archivo.
