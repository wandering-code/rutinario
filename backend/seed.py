"""Datos de arranque: solo se insertan si la tabla está vacía, así que borrar o
editar cualquiera de ellos desde la app es definitivo (no vuelven al reiniciar)."""

from sqlalchemy.orm import Session

from models import Ejercicio, Taxonomia

TAXONOMIA = [
    {"id": "pecho", "name": "Pecho", "muscles": [
        {"id": "pectoral", "name": "Pectoral"},
        {"id": "pectoral-sup", "name": "Pectoral superior"},
    ]},
    {"id": "espalda", "name": "Espalda", "muscles": [
        {"id": "dorsal", "name": "Dorsal ancho"},
        {"id": "espalda-media", "name": "Espalda media"},
        {"id": "trapecio", "name": "Trapecio"},
        {"id": "lumbar", "name": "Lumbar"},
    ]},
    {"id": "hombros", "name": "Hombros", "muscles": [
        {"id": "delt-ant", "name": "Deltoide anterior"},
        {"id": "delt-lat", "name": "Deltoide lateral"},
        {"id": "delt-post", "name": "Deltoide posterior"},
    ]},
    # Bíceps, tríceps y antebrazo van cada uno en su grupo: juntarlos en
    # "Brazos" sumaba series de músculos opuestos en el contador por grupo.
    {"id": "g-biceps", "name": "Bíceps", "muscles": [{"id": "biceps", "name": "Bíceps"}]},
    {"id": "g-triceps", "name": "Tríceps", "muscles": [{"id": "triceps", "name": "Tríceps"}]},
    {"id": "g-antebrazo", "name": "Antebrazo", "muscles": [{"id": "antebrazo", "name": "Antebrazo"}]},
    # Piernas, igual: cada músculo en su grupo (y aducción y abducción aparte).
    {"id": "g-cuadriceps", "name": "Cuádriceps", "muscles": [{"id": "cuadriceps", "name": "Cuádriceps"}]},
    {"id": "g-isquios", "name": "Isquiotibiales", "muscles": [{"id": "isquios", "name": "Isquiotibiales"}]},
    {"id": "g-gluteos", "name": "Glúteos", "muscles": [{"id": "gluteos", "name": "Glúteos"}]},
    {"id": "g-aductores", "name": "Aductores", "muscles": [{"id": "aductores", "name": "Aductores"}]},
    {"id": "g-abductores", "name": "Abductores", "muscles": [{"id": "abductores", "name": "Abductores"}]},
    {"id": "g-gemelos", "name": "Gemelos", "muscles": [{"id": "gemelos", "name": "Gemelos"}]},
    {"id": "core", "name": "Core", "muscles": [
        {"id": "abdomen", "name": "Abdomen"},
        {"id": "oblicuos", "name": "Oblicuos"},
    ]},
]

# (nombre, tipo, material, principales, secundarios)
EJERCICIOS = [
    # Pecho
    ("Press banca", "fuerza", "barra", ["pectoral"], ["triceps", "delt-ant"]),
    ("Press inclinado con barra", "fuerza", "barra", ["pectoral-sup"], ["triceps", "delt-ant"]),
    ("Press banca con mancuernas", "fuerza", "mancuernas", ["pectoral"], ["triceps", "delt-ant"]),
    ("Press inclinado con mancuernas", "fuerza", "mancuernas", ["pectoral-sup"], ["triceps", "delt-ant"]),
    ("Press de pecho en máquina", "fuerza", "maquina", ["pectoral"], ["triceps", "delt-ant"]),
    ("Aperturas con mancuernas", "fuerza", "mancuernas", ["pectoral"], []),
    ("Cruce de poleas", "fuerza", "polea", ["pectoral"], []),
    ("Contractor de pecho (pec deck)", "fuerza", "maquina", ["pectoral"], []),
    ("Fondos en paralelas", "fuerza", "peso-corporal", ["pectoral", "triceps"], ["delt-ant"]),
    ("Flexiones", "fuerza", "peso-corporal", ["pectoral"], ["triceps", "delt-ant"]),
    # Espalda
    ("Dominadas", "fuerza", "peso-corporal", ["dorsal"], ["biceps", "espalda-media"]),
    ("Jalón al pecho", "fuerza", "polea", ["dorsal"], ["biceps", "espalda-media"]),
    ("Remo con barra", "fuerza", "barra", ["espalda-media", "dorsal"], ["biceps", "delt-post", "lumbar"]),
    ("Remo con mancuerna a una mano", "fuerza", "mancuernas", ["dorsal", "espalda-media"], ["biceps"]),
    ("Remo en polea baja", "fuerza", "polea", ["espalda-media", "dorsal"], ["biceps"]),
    ("Remo en máquina", "fuerza", "maquina", ["espalda-media"], ["dorsal", "biceps"]),
    ("Pullover en polea", "fuerza", "polea", ["dorsal"], []),
    ("Peso muerto", "fuerza", "barra", ["isquios", "gluteos", "lumbar"], ["trapecio", "cuadriceps", "antebrazo"]),
    ("Encogimientos con mancuernas", "fuerza", "mancuernas", ["trapecio"], []),
    ("Hiperextensiones", "fuerza", "peso-corporal", ["lumbar"], ["gluteos", "isquios"]),
    # Hombros
    ("Press militar", "fuerza", "barra", ["delt-ant"], ["triceps", "delt-lat"]),
    ("Press de hombros con mancuernas", "fuerza", "mancuernas", ["delt-ant"], ["triceps", "delt-lat"]),
    ("Elevaciones laterales", "fuerza", "mancuernas", ["delt-lat"], []),
    ("Elevaciones laterales en polea", "fuerza", "polea", ["delt-lat"], []),
    ("Pájaros (aperturas invertidas)", "fuerza", "mancuernas", ["delt-post"], ["espalda-media"]),
    ("Face pull", "fuerza", "polea", ["delt-post"], ["espalda-media", "trapecio"]),
    ("Reverse pec deck", "fuerza", "maquina", ["delt-post"], ["espalda-media"]),
    # Brazos
    ("Curl con barra", "fuerza", "barra", ["biceps"], ["antebrazo"]),
    ("Curl con mancuernas", "fuerza", "mancuernas", ["biceps"], ["antebrazo"]),
    ("Curl martillo", "fuerza", "mancuernas", ["biceps", "antebrazo"], []),
    ("Curl en banco Scott", "fuerza", "maquina", ["biceps"], []),
    ("Curl en polea", "fuerza", "polea", ["biceps"], []),
    ("Extensión de tríceps en polea", "fuerza", "polea", ["triceps"], []),
    ("Press francés", "fuerza", "barra", ["triceps"], []),
    ("Extensión de tríceps sobre la cabeza", "fuerza", "polea", ["triceps"], []),
    ("Press banca agarre cerrado", "fuerza", "barra", ["triceps"], ["pectoral", "delt-ant"]),
    ("Curl de muñeca", "fuerza", "mancuernas", ["antebrazo"], []),
    # Piernas
    ("Sentadilla", "fuerza", "barra", ["cuadriceps", "gluteos"], ["aductores", "lumbar"]),
    ("Sentadilla frontal", "fuerza", "barra", ["cuadriceps"], ["gluteos", "abdomen"]),
    ("Prensa de piernas", "fuerza", "maquina", ["cuadriceps", "gluteos"], ["aductores"]),
    ("Sentadilla hack", "fuerza", "maquina", ["cuadriceps"], ["gluteos"]),
    ("Sentadilla búlgara", "fuerza", "mancuernas", ["cuadriceps", "gluteos"], ["aductores"]),
    ("Zancadas", "fuerza", "mancuernas", ["cuadriceps", "gluteos"], ["isquios"]),
    ("Extensión de cuádriceps", "fuerza", "maquina", ["cuadriceps"], []),
    ("Peso muerto rumano", "fuerza", "barra", ["isquios", "gluteos"], ["lumbar"]),
    ("Curl femoral tumbado", "fuerza", "maquina", ["isquios"], []),
    ("Curl femoral sentado", "fuerza", "maquina", ["isquios"], []),
    ("Hip thrust", "fuerza", "barra", ["gluteos"], ["isquios"]),
    ("Patada de glúteo en polea", "fuerza", "polea", ["gluteos"], []),
    ("Abductores en máquina", "fuerza", "maquina", ["abductores"], []),
    ("Aductores en máquina", "fuerza", "maquina", ["aductores"], []),
    ("Elevación de gemelos de pie", "fuerza", "maquina", ["gemelos"], []),
    ("Elevación de gemelos sentado", "fuerza", "maquina", ["gemelos"], []),
    # Core
    ("Plancha", "fuerza", "peso-corporal", ["abdomen"], ["oblicuos"]),
    ("Crunch en polea", "fuerza", "polea", ["abdomen"], []),
    ("Elevación de piernas colgado", "fuerza", "peso-corporal", ["abdomen"], ["oblicuos"]),
    ("Rueda abdominal", "fuerza", "otro", ["abdomen"], ["dorsal"]),
    ("Pallof press", "fuerza", "polea", ["oblicuos"], ["abdomen"]),
    ("Russian twist", "fuerza", "peso-corporal", ["oblicuos"], ["abdomen"]),
    # Cardio
    ("Cinta (correr)", "cardio", "maquina", [], []),
    ("Cinta inclinada (caminar)", "cardio", "maquina", [], []),
    ("Bicicleta estática", "cardio", "maquina", [], []),
    ("Elíptica", "cardio", "maquina", [], []),
    ("Remo ergómetro", "cardio", "maquina", [], []),
    ("Escaladora", "cardio", "maquina", [], []),
    ("Comba", "cardio", "otro", [], []),
    ("Correr al aire libre", "cardio", "peso-corporal", [], []),
    # Movilidad
    ("Movilidad de cadera", "movilidad", "peso-corporal", [], []),
    ("Movilidad de hombros", "movilidad", "banda", [], []),
    ("Estiramientos generales", "movilidad", "peso-corporal", [], []),
]


def _separar_grupo(t: Taxonomia, gid: str) -> None:
    """Migración: cada músculo del grupo `gid` pasa a ser su propio grupo, en el
    mismo sitio. Los ids de los músculos no cambian, así que los ejercicios no
    se enteran. Si el grupo ya no existe, no hace nada."""
    grupos = list(t.data or [])
    i = next((i for i, g in enumerate(grupos) if g.get("id") == gid), None)
    if i is None:
        return
    nuevos = [{"id": f"g-{m['id']}", "name": m["name"], "muscles": [m]} for m in grupos[i]["muscles"]]
    t.data = grupos[:i] + nuevos + grupos[i + 1:]


def _anadir_abductores(db: Session, t: Taxonomia) -> None:
    """Migración: músculo "Abductores" (justo después de Aductores) y la máquina
    de abductores pasa a contar para él en vez de para glúteos. Solo si la
    máquina sigue como venía de serie: si la editaste a mano, no se toca."""
    grupos = list(t.data or [])
    if any(m["id"] == "abductores" for g in grupos for m in g["muscles"]):
        return
    i = next((i for i, g in enumerate(grupos) if g.get("id") == "g-aductores"), len(grupos) - 1)
    grupos.insert(i + 1, {"id": "g-abductores", "name": "Abductores", "muscles": [{"id": "abductores", "name": "Abductores"}]})
    t.data = grupos
    for e in db.query(Ejercicio).filter(Ejercicio.name == "Abductores en máquina").all():
        if e.primary == ["gluteos"]:
            e.primary = ["abductores"]


def sembrar(db: Session) -> None:
    t = db.query(Taxonomia).first()
    if not t:
        db.add(Taxonomia(id=1, data=TAXONOMIA))
    else:
        # Migraciones del 2026-11-10: fuera "Brazos" y "Piernas".
        _separar_grupo(t, "brazos")
        _separar_grupo(t, "piernas")
        _anadir_abductores(db, t)
    if not db.query(Ejercicio).first():
        for name, kind, equipment, primary, secondary in EJERCICIOS:
            db.add(Ejercicio(name=name, kind=kind, equipment=equipment, primary=primary, secondary=secondary))
    db.commit()
