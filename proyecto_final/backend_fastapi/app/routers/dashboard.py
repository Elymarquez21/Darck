"""Indicadores administrativos y recepción básica de PQR."""
from datetime import date, timedelta
from decimal import Decimal
import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config.db import get_db
from app.middlewares.auth import require_auth, require_role
from app.openapi import ERROR_RESPONSES

router = APIRouter(prefix="/api", tags=["dashboard"], responses=ERROR_RESPONSES)
logger = logging.getLogger("ely_marquez.pqrs")


def _registrar_pqr_recibida(id_pqr: int, tipo: str) -> None:
    logger.info("PQR recibida id=%s tipo=%s", id_pqr, tipo)


@router.get("/dashboard/ventas")
def dashboard_ventas(
    fecha_desde: date | None = Query(default=None, description="Fecha inicial, formato AAAA-MM-DD."),
    fecha_hasta: date | None = Query(default=None, description="Fecha final, formato AAAA-MM-DD."),
    agrupacion: str = Query(default="dia", pattern="^(dia|semana|mes)$"),
    producto: int | None = Query(default=None, gt=0),
    servicio: int | None = Query(default=None, gt=0),
    estado: str | None = None,
    cliente: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    usuario: dict = Depends(require_auth),
):
    """Series agregadas en servidor; un cliente siempre queda limitado a sus ventas."""
    if agrupacion not in ("dia", "semana", "mes"):
        raise HTTPException(400, "La agrupación debe ser dia, semana o mes.")
    if estado and estado not in ("pendiente", "pagada", "cancelada"):
        raise HTTPException(400, "Estado de venta no válido.")
    hoy = date.today()
    desde = fecha_desde or (hoy - timedelta(days=29))
    hasta = fecha_hasta or hoy
    if desde > hasta:
        raise HTTPException(400, "La fecha inicial no puede ser posterior a la fecha final.")

    filtros = ["DATE(v.fecha_venta)>=:desde", "DATE(v.fecha_venta)<=:hasta"]
    params = {"desde": desde, "hasta": hasta}
    if usuario.get("nombre_rol") == "cliente":
        filtros.append("v.id_cliente=:cliente_sesion")
        params["cliente_sesion"] = usuario["id_usuario"]
    else:
        if usuario.get("nombre_rol") not in ("administrador", "empleado"):
            raise HTTPException(403, "No tienes permisos para consultar el dashboard.")
        if cliente:
            filtros.append("v.id_cliente=:cliente")
            params["cliente"] = cliente
    if producto:
        filtros.append("EXISTS (SELECT 1 FROM detalle_ventas d WHERE d.id_venta=v.id_venta AND d.id_producto=:producto)")
        params["producto"] = producto
    if servicio:
        filtros.append("EXISTS (SELECT 1 FROM detalle_ventas d WHERE d.id_venta=v.id_venta AND d.id_servicio=:servicio)")
        params["servicio"] = servicio
    if estado:
        filtros.append("v.estado=:estado")
        params["estado"] = estado

    filas = db.execute(text("SELECT v.fecha_venta,v.total,v.estado FROM ventas v WHERE " + " AND ".join(filtros) + " ORDER BY v.fecha_venta"), params).mappings().all()
    series = {}
    if agrupacion == "dia":
        cursor = desde
        while cursor <= hasta:
            series[cursor.isoformat()] = {"periodo": cursor.isoformat(), "ventas": 0, "facturacion": Decimal("0.00")}
            cursor += timedelta(days=1)
    elif agrupacion == "semana":
        cursor = desde - timedelta(days=desde.weekday())
        while cursor <= hasta:
            etiqueta = cursor.isoformat()
            series[etiqueta] = {"periodo": etiqueta, "ventas": 0, "facturacion": Decimal("0.00")}
            cursor += timedelta(days=7)
    else:
        cursor = date(desde.year, desde.month, 1)
        while cursor <= hasta:
            etiqueta = cursor.strftime("%Y-%m")
            series[etiqueta] = {"periodo": etiqueta, "ventas": 0, "facturacion": Decimal("0.00")}
            cursor = date(cursor.year + (cursor.month == 12), 1 if cursor.month == 12 else cursor.month + 1, 1)
    cantidad_ventas = 0
    total_facturado = Decimal("0.00")
    for fila in filas:
        dia = fila["fecha_venta"].date() if hasattr(fila["fecha_venta"], "date") else fila["fecha_venta"]
        if agrupacion == "dia":
            etiqueta = dia.isoformat()
        elif agrupacion == "semana":
            etiqueta = (dia - timedelta(days=dia.weekday())).isoformat()
        else:
            etiqueta = dia.strftime("%Y-%m")
        punto = series.setdefault(etiqueta, {"periodo": etiqueta, "ventas": 0, "facturacion": Decimal("0.00")})
        if fila["estado"] != "cancelada":
            punto["ventas"] += 1
            punto["facturacion"] += Decimal(str(fila["total"]))
            cantidad_ventas += 1
            total_facturado += Decimal(str(fila["total"]))

    promedio = total_facturado / cantidad_ventas if cantidad_ventas else Decimal("0.00")
    return {
        "rol": usuario.get("nombre_rol"),
        "filtros": {"fecha_desde": desde, "fecha_hasta": hasta, "agrupacion": agrupacion, "producto": producto, "servicio": servicio, "estado": estado, "cliente": usuario["id_usuario"] if usuario.get("nombre_rol") == "cliente" else cliente},
        "indicadores": {"ventas": cantidad_ventas, "facturacion": float(total_facturado), "promedio_venta": float(promedio)},
        "serie": [{**punto, "facturacion": float(punto["facturacion"])} for punto in sorted(series.values(), key=lambda punto: punto["periodo"])],
    }


@router.get("/dashboard")
def indicadores(db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador"))):
    def scalar(sql):
        return db.execute(text(sql)).scalar() or 0

    return {
        "usuarios": scalar("SELECT COUNT(*) FROM usuarios"),
        "productos": scalar("SELECT COUNT(*) FROM productos WHERE estado='activo'"),
        "servicios": scalar("SELECT COUNT(*) FROM servicios WHERE estado='activo'"),
        "ventas": scalar("SELECT COUNT(*) FROM ventas"),
        "facturacion": str(scalar("SELECT COALESCE(SUM(total),0) FROM ventas WHERE estado<>'cancelada'")),
        "facturas": scalar("SELECT COUNT(*) FROM facturas WHERE estado='emitida'"),
        "pqrs_recibidas": scalar("SELECT COUNT(*) FROM pqrs"),
        "pqrs_pendientes": scalar("SELECT COUNT(*) FROM pqrs WHERE estado='pendiente'"),
    }


class PQRSCrear(BaseModel):
    """Solicitud PQR enviada por el cliente."""
    tipo: str = Field(description="peticion, queja, reclamo o sugerencia", examples=["peticion"])
    asunto: str = Field(min_length=4, max_length=120)
    descripcion: str = Field(min_length=10, max_length=5000)


@router.post("/pqrs", status_code=201, summary="Registrar una PQR")
def crear_pqr(datos: PQRSCrear, background_tasks: BackgroundTasks, db: Session = Depends(get_db), usuario: dict = Depends(require_auth)):
    if usuario.get("nombre_rol") != "cliente":
        raise HTTPException(403, "El registro de PQR está disponible para clientes.")
    if datos.tipo not in ("peticion", "queja", "reclamo", "sugerencia"):
        raise HTTPException(400, "Tipo de PQR no válido.")
    resultado = db.execute(text("INSERT INTO pqrs (id_usuario,tipo,asunto,descripcion) VALUES (:usuario,:tipo,:asunto,:descripcion)"), {"usuario": usuario["id_usuario"], "tipo": datos.tipo, "asunto": datos.asunto.strip(), "descripcion": datos.descripcion.strip()})
    db.commit()
    background_tasks.add_task(_registrar_pqr_recibida, resultado.lastrowid, datos.tipo)
    return {"mensaje": "Tu solicitud fue recibida.", "id_pqr": resultado.lastrowid, "estado": "pendiente"}


@router.get("/pqrs/mias")
def mis_pqrs(db: Session = Depends(get_db), usuario: dict = Depends(require_auth)):
    filas = db.execute(text("SELECT id_pqr,tipo,asunto,descripcion,estado,creado_en FROM pqrs WHERE id_usuario=:id ORDER BY creado_en DESC"), {"id": usuario["id_usuario"]}).mappings().all()
    return [dict(fila) for fila in filas]


@router.get("/pqrs")
def listar_pqrs(db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador", "empleado"))):
    filas = db.execute(text("SELECT p.id_pqr,p.tipo,p.asunto,p.descripcion,p.estado,p.creado_en,u.id_usuario,CONCAT(u.nombre,' ',u.apellido) cliente,u.correo FROM pqrs p JOIN usuarios u ON u.id_usuario=p.id_usuario ORDER BY FIELD(p.estado,'pendiente','en_proceso','respondida','cerrada'),p.creado_en DESC LIMIT 500")).mappings().all()
    return [dict(fila) for fila in filas]


class PQRSActualizar(BaseModel):
    estado: str


@router.patch("/pqrs/{id_pqr}/estado", summary="Actualizar estado de una PQR")
def actualizar_estado_pqr(id_pqr: Annotated[int, Path(gt=0)], datos: PQRSActualizar, db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador", "empleado"))):
    if datos.estado not in ("pendiente", "en_proceso", "respondida", "cerrada"):
        raise HTTPException(400, "Estado de PQR no válido.")
    existente = db.execute(text("SELECT id_pqr FROM pqrs WHERE id_pqr=:id"), {"id": id_pqr}).first()
    if not existente:
        raise HTTPException(404, "Solicitud PQR no encontrada.")
    db.execute(text("UPDATE pqrs SET estado=:estado WHERE id_pqr=:id"), {"estado": datos.estado, "id": id_pqr})
    db.commit()
    return {"mensaje": "Estado de PQR actualizado.", "estado": datos.estado}
