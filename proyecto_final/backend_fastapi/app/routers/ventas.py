"""Registro, consulta e informes de ventas."""
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from io import BytesIO
from typing import Literal

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

from app.config.db import get_db
from app.middlewares.auth import require_auth, require_role
from app.openapi import ERROR_RESPONSES

router = APIRouter(prefix="/api/ventas", tags=["ventas"], responses=ERROR_RESPONSES)


class ItemVenta(BaseModel):
    tipo: Literal["producto", "servicio"]
    id: int = Field(gt=0)
    cantidad: int = Field(gt=0, le=999)


class VentaCrear(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"items": [{"tipo": "producto", "id": 1, "cantidad": 2}]}]})
    items: list[ItemVenta] = Field(min_length=1, max_length=100)
    id_cliente: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def sin_items_repetidos(self):
        identificadores = [(item.tipo, item.id) for item in self.items]
        if len(identificadores) != len(set(identificadores)):
            raise ValueError("Cada producto o servicio debe aparecer una sola vez en el detalle.")
        return self


def _crear_venta(db: Session, cliente: int, operador: int | None, items: list[ItemVenta]):
    detalles, subtotal = [], Decimal("0.00")
    for item in items:
        if item.tipo not in ("producto", "servicio"):
            raise HTTPException(400, "Cada artículo debe ser un producto o servicio.")
        tabla, llave = ("productos", "id_producto") if item.tipo == "producto" else ("servicios", "id_servicio")
        catalogo = db.execute(text(f"SELECT {llave} id, nombre, precio, estado" + (", stock" if item.tipo == "producto" else "") + f" FROM {tabla} WHERE {llave}=:id FOR UPDATE"), {"id": item.id}).mappings().first()
        if not catalogo or catalogo["estado"] != "activo":
            raise HTTPException(400, f"El {item.tipo} seleccionado no está disponible.")
        if item.tipo == "producto" and catalogo["stock"] < item.cantidad:
            raise HTTPException(409, f"Stock insuficiente para {catalogo['nombre']}.")
        precio = Decimal(str(catalogo["precio"]))
        importe = (precio * item.cantidad).quantize(Decimal("0.01"))
        subtotal += importe
        detalles.append((item, catalogo, precio, importe))
    try:
        venta = db.execute(text("INSERT INTO ventas (id_cliente,id_usuario,subtotal,descuento,impuestos,total,estado) VALUES (:cliente,:usuario,:subtotal,0,0,:total,'pendiente')"), {"cliente": cliente, "usuario": operador, "subtotal": subtotal, "total": subtotal})
        venta_id = venta.lastrowid
        numero_factura = f"FV-{venta_id:08d}"
        db.execute(text("INSERT INTO facturas (numero_factura,id_venta,estado) VALUES (:numero,:venta,'emitida')"), {"numero": numero_factura, "venta": venta_id})
        for item, catalogo, precio, importe in detalles:
            db.execute(text("INSERT INTO detalle_ventas (id_venta,tipo,id_producto,id_servicio,nombre_item,cantidad,precio_unitario,subtotal) VALUES (:venta,:tipo,:producto,:servicio,:nombre,:cantidad,:precio,:subtotal)"), {"venta": venta_id, "tipo": item.tipo, "producto": item.id if item.tipo == "producto" else None, "servicio": item.id if item.tipo == "servicio" else None, "nombre": catalogo["nombre"], "cantidad": item.cantidad, "precio": precio, "subtotal": importe})
            if item.tipo == "producto":
                db.execute(text("UPDATE productos SET stock=stock-:cantidad WHERE id_producto=:id"), {"cantidad": item.cantidad, "id": item.id})
        db.commit()
        return venta_id, subtotal, numero_factura
    except Exception:
        db.rollback()
        raise


@router.post("", status_code=201, summary="Registrar una venta y emitir su factura")
def registrar_venta(datos: VentaCrear, db: Session = Depends(get_db), usuario: dict = Depends(require_auth)):
    rol = usuario.get("nombre_rol")
    if rol in ("administrador", "empleado"):
        cliente = datos.id_cliente
        if not cliente:
            raise HTTPException(400, "Selecciona el cliente de la venta.")
        valido = db.execute(text("SELECT id_usuario FROM usuarios WHERE id_usuario=:id AND id_rol=3 AND estado='activo'"), {"id": cliente}).first()
        if not valido:
            raise HTTPException(400, "El cliente seleccionado no está activo.")
        operador = usuario["id_usuario"]
    else:
        cliente, operador = usuario["id_usuario"], None
    venta_id, total, numero_factura = _crear_venta(db, cliente, operador, datos.items)
    return {"mensaje": "Venta registrada correctamente.", "id_venta": venta_id, "numero_factura": numero_factura, "total": str(total)}


@router.get("", summary="Consultar historial de ventas con filtros y paginación")
def historial_ventas(
    fecha_desde: date | None = Query(default=None), fecha_hasta: date | None = Query(default=None),
    cliente: int | None = Query(default=None, gt=0), producto: int | None = Query(default=None, gt=0),
    servicio: int | None = Query(default=None, gt=0), estado: str | None = Query(default=None, pattern="^(pendiente|pagada|cancelada)$"),
    valor_min: Decimal | None = Query(default=None, ge=0), valor_max: Decimal | None = Query(default=None, ge=0),
    pagina: int = Query(default=1, ge=1), por_pagina: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador", "empleado")),
):
    condiciones, params = ["1=1"], {}
    if fecha_desde: condiciones.append("v.fecha_venta >= :desde"); params["desde"] = datetime.combine(fecha_desde, time.min)
    if fecha_hasta: condiciones.append("v.fecha_venta < :hasta"); params["hasta"] = datetime.combine(fecha_hasta + timedelta(days=1), time.min)
    if cliente: condiciones.append("v.id_cliente=:cliente"); params["cliente"] = cliente
    if producto: condiciones.append("EXISTS (SELECT 1 FROM detalle_ventas d WHERE d.id_venta=v.id_venta AND d.id_producto=:producto)"); params["producto"] = producto
    if servicio: condiciones.append("EXISTS (SELECT 1 FROM detalle_ventas d WHERE d.id_venta=v.id_venta AND d.id_servicio=:servicio)"); params["servicio"] = servicio
    if estado: condiciones.append("v.estado=:estado"); params["estado"] = estado
    if valor_min is not None: condiciones.append("v.total>=:minimo"); params["minimo"] = valor_min
    if valor_max is not None: condiciones.append("v.total<=:maximo"); params["maximo"] = valor_max
    params.update({"limite": por_pagina, "desplazamiento": (pagina - 1) * por_pagina})
    query = text("SELECT v.id_venta,v.fecha_venta,v.id_cliente,CONCAT(c.nombre,' ',c.apellido) cliente,v.subtotal,v.descuento,v.impuestos,v.total,v.estado,COALESCE(u.nombre,'Sitio web') operador FROM ventas v JOIN usuarios c ON c.id_usuario=v.id_cliente LEFT JOIN usuarios u ON u.id_usuario=v.id_usuario WHERE " + " AND ".join(condiciones) + " ORDER BY v.fecha_venta DESC LIMIT :limite OFFSET :desplazamiento")
    ventas = db.execute(query, params).mappings().all()
    ids = [v["id_venta"] for v in ventas]
    detalles = db.execute(text("SELECT id_venta,tipo,nombre_item,cantidad,precio_unitario,descuento,subtotal FROM detalle_ventas WHERE id_venta IN :ids").bindparams(bindparam("ids", expanding=True)), {"ids": ids}).mappings().all() if ids else []
    por_venta = {}
    for detalle in detalles: por_venta.setdefault(detalle["id_venta"], []).append(dict(detalle))
    return [{**dict(v), "detalles": por_venta.get(v["id_venta"], [])} for v in ventas]


class EstadoVenta(BaseModel):
    estado: str


@router.patch("/{id_venta}/estado")
def cambiar_estado_venta(id_venta: Annotated[int, Path(gt=0)], datos: EstadoVenta, db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador", "empleado"))):
    if datos.estado not in ("pagada", "cancelada"):
        raise HTTPException(400, "El estado debe ser pagada o cancelada.")
    try:
        venta = db.execute(text("SELECT estado FROM ventas WHERE id_venta=:id FOR UPDATE"), {"id": id_venta}).first()
        if not venta:
            raise HTTPException(404, "Venta no encontrada.")
        if venta.estado == "cancelada":
            raise HTTPException(409, "Una venta cancelada no se puede reabrir.")
        if datos.estado == "cancelada" and venta.estado != "cancelada":
            db.execute(text("UPDATE productos p JOIN detalle_ventas d ON d.id_producto=p.id_producto SET p.stock=p.stock+d.cantidad WHERE d.id_venta=:id AND d.tipo='producto'"), {"id": id_venta})
        db.execute(text("UPDATE ventas SET estado=:estado WHERE id_venta=:id"), {"estado": datos.estado, "id": id_venta})
        if datos.estado == "cancelada":
            db.execute(text("UPDATE facturas SET estado='anulada' WHERE id_venta=:id"), {"id": id_venta})
        db.commit()
        return {"mensaje": "Estado de la venta actualizado.", "estado": datos.estado}
    except Exception:
        db.rollback()
        raise


def _reporte(db: Session, fecha: date):
    return historial_ventas(fecha_desde=fecha, fecha_hasta=fecha, db=db, _usuario={"nombre_rol": "administrador"})


@router.get("/reporte-diario")
def reporte_diario(fecha: date = Query(default_factory=date.today), db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador", "empleado"))):
    ventas = _reporte(db, fecha)
    return {"proyecto": "Ely Marquez", "fecha_reporte": fecha, "generado_en": datetime.now().isoformat(timespec="seconds"), "cantidad_ventas": len(ventas), "total_dia": str(sum((Decimal(str(v["total"])) for v in ventas), Decimal("0.00"))), "ventas": ventas}


@router.get("/reporte-diario/pdf")
def reporte_diario_pdf(fecha: date = Query(default_factory=date.today), db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador", "empleado"))):
    reporte = reporte_diario(fecha, db, _usuario)
    # PDF liviano generado sin dependencias externas.
    import unicodedata
    def clean(s):
        s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    lines = ["ELY MARQUEZ - REPORTE DIARIO DE VENTAS", f"Fecha del reporte: {fecha}", f"Generado: {reporte['generado_en']}", ""]
    for venta in reporte["ventas"]:
        lines.append(f"Venta #{venta['id_venta']} | {venta['cliente']} | {venta['estado']} | Total: ${venta['total']}")
        for item in venta["detalles"]: lines.append(f"  {item['tipo']} {item['nombre_item']} x{item['cantidad']} | ${item['subtotal']}")
    lines.extend(["", f"Ventas: {reporte['cantidad_ventas']} | Total del dia: ${reporte['total_dia']}"])
    chunks = [lines[i:i+48] for i in range(0, len(lines), 48)] or [[]]
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b""]
    page_refs = []
    for n, chunk in enumerate(chunks):
        page_id, stream_id = 3 + n * 2, 4 + n * 2
        page_refs.append(f"{page_id} 0 R")
        commands = ["BT /F1 10 Tf 48 790 Td 14 TL"] + [f"({clean(line)}) Tj T*" for line in chunk] + ["ET"]
        stream = "\n".join(commands).encode("latin-1", "replace")
        objects.extend([f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents {stream_id} 0 R >>".encode(), f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream"])
    objects[1] = f"<< /Type /Pages /Kids [{' '.join(page_refs)}] /Count {len(page_refs)} >>".encode()
    pdf = BytesIO(); pdf.write(b"%PDF-1.4\n"); offsets = [0]
    for i, obj in enumerate(objects, 1): offsets.append(pdf.tell()); pdf.write(f"{i} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = pdf.tell(); pdf.write(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]: pdf.write(f"{offset:010d} 00000 n \n".encode())
    pdf.write(f"trailer << /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()); pdf.seek(0)
    return StreamingResponse(pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=reporte-ventas-{fecha}.pdf"})


@router.get("/reporte-diario/excel")
def reporte_diario_excel(fecha: date = Query(default_factory=date.today), db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador", "empleado"))):
    reporte = reporte_diario(fecha, db, _usuario)
    libro = Workbook()
    hoja = libro.active
    hoja.title = "Ventas del día"
    hoja.append(["Proyecto", reporte["proyecto"]])
    hoja.append(["Fecha del reporte", str(fecha)])
    hoja.append(["Generado", reporte["generado_en"]])
    hoja.append([])
    hoja.append(["N.º venta", "N.º factura", "Fecha y hora", "Cliente", "Tipo", "Producto / servicio", "Cantidad", "Precio unitario", "Descuento", "Subtotal línea", "Subtotal venta", "Impuestos", "Total venta", "Estado"])
    for venta in reporte["ventas"]:
        numero = f"FV-{venta['id_venta']:08d}"
        for detalle in venta["detalles"]:
            hoja.append([venta["id_venta"], numero, venta["fecha_venta"], venta["cliente"], detalle["tipo"], detalle["nombre_item"], detalle["cantidad"], float(detalle["precio_unitario"]), float(detalle["descuento"]), float(detalle["subtotal"]), float(venta["subtotal"]), float(venta["impuestos"]), float(venta["total"]), venta["estado"]])
    fila_final_datos = hoja.max_row
    hoja.append([])
    hoja.append(["Total de ventas del día", reporte["cantidad_ventas"], "Valor facturado", float(reporte["total_dia"])])
    hoja.auto_filter.ref = f"A5:N{max(5, fila_final_datos)}"
    hoja.freeze_panes = "A6"
    for columna, ancho in {"A":12,"B":16,"C":22,"D":26,"E":14,"F":32,"G":12,"H":18,"I":16,"J":18,"K":18,"L":14,"M":16,"N":14}.items():
        hoja.column_dimensions[columna].width = ancho
    for celda in hoja[5]:
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill("solid", fgColor="722F37")
    salida = BytesIO()
    libro.save(salida)
    salida.seek(0)
    return StreamingResponse(salida, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=reporte-ventas-{fecha}.xlsx"})


@router.get("/facturas")
def listar_facturas(numero: str | None = None, cliente: int | None = None, fecha_desde: date | None = None, fecha_hasta: date | None = None, db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador", "empleado"))):
    filtros, params = ["1=1"], {}
    if numero:
        filtros.append("f.numero_factura LIKE :numero"); params["numero"] = f"%{numero}%"
    if cliente:
        filtros.append("v.id_cliente=:cliente"); params["cliente"] = cliente
    if fecha_desde:
        filtros.append("f.fecha_emision>=:desde"); params["desde"] = datetime.combine(fecha_desde, time.min)
    if fecha_hasta:
        filtros.append("f.fecha_emision<:hasta"); params["hasta"] = datetime.combine(fecha_hasta + timedelta(days=1), time.min)
    facturas = db.execute(text("SELECT f.numero_factura,f.fecha_emision,f.estado factura_estado,v.id_venta,v.id_cliente,CONCAT(u.nombre,' ',u.apellido) cliente,v.subtotal,v.impuestos,v.total,v.estado venta_estado FROM facturas f JOIN ventas v ON v.id_venta=f.id_venta JOIN usuarios u ON u.id_usuario=v.id_cliente WHERE " + " AND ".join(filtros) + " ORDER BY f.fecha_emision DESC LIMIT 500"), params).mappings().all()
    ids = [f["id_venta"] for f in facturas]
    lineas = db.execute(text("SELECT id_venta,tipo,nombre_item,cantidad,precio_unitario,descuento,subtotal FROM detalle_ventas WHERE id_venta IN :ids").bindparams(bindparam("ids", expanding=True)), {"ids": ids}).mappings().all() if ids else []
    detalle_map = {}
    for linea in lineas:
        detalle_map.setdefault(linea["id_venta"], []).append(dict(linea))
    return [{**dict(f), "detalles": detalle_map.get(f["id_venta"], [])} for f in facturas]


@router.get("/facturas/{numero_factura}/pdf")
def descargar_factura(numero_factura: str, db: Session = Depends(get_db), _usuario: dict = Depends(require_role("administrador", "empleado"))):
    factura = db.execute(text("SELECT f.numero_factura,f.fecha_emision,f.estado factura_estado,v.id_venta,CONCAT(u.nombre,' ',u.apellido) cliente,u.tipo_documento,u.numero_documento,u.direccion,u.telefono,u.correo,v.subtotal,v.descuento,v.impuestos,v.total,v.estado venta_estado FROM facturas f JOIN ventas v ON v.id_venta=f.id_venta JOIN usuarios u ON u.id_usuario=v.id_cliente WHERE f.numero_factura=:numero"), {"numero": numero_factura}).mappings().first()
    if not factura:
        raise HTTPException(404, "Factura no encontrada.")
    lineas = db.execute(text("SELECT tipo,nombre_item,cantidad,precio_unitario,descuento,subtotal FROM detalle_ventas WHERE id_venta=:venta"), {"venta": factura["id_venta"]}).mappings().all()
    lineas_pdf = ["ELY MARQUEZ - FACTURA DE VENTA", f"Factura: {factura['numero_factura']}", f"Fecha: {factura['fecha_emision']}", f"Estado: {factura['factura_estado']}", "", "DATOS DEL CLIENTE", f"{factura['cliente']} | {factura['tipo_documento']} {factura['numero_documento']}", f"{factura['direccion']} | {factura['telefono']} | {factura['correo']}", "", "DETALLE DE LA VENTA"]
    for linea in lineas:
        lineas_pdf.append(f"{linea['tipo']} - {linea['nombre_item']} | Cant: {linea['cantidad']} | Unit: ${linea['precio_unitario']} | Desc: ${linea['descuento']} | Subtotal: ${linea['subtotal']}")
    lineas_pdf.extend(["", f"Subtotal: ${factura['subtotal']}", f"Impuestos: ${factura['impuestos']}", f"Total: ${factura['total']}", f"Estado de venta: {factura['venta_estado']}"])
    import unicodedata
    def clean(s):
        return unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    commands = ["BT /F1 10 Tf 48 790 Td 14 TL"] + [f"({clean(linea)}) Tj T*" for linea in lineas_pdf] + ["ET"]
    stream = "\n".join(commands).encode("latin-1", "replace")
    objetos = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>", f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>".encode(), f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream"]
    pdf = BytesIO(); pdf.write(b"%PDF-1.4\n"); offsets = [0]
    for i, obj in enumerate(objetos, 1): offsets.append(pdf.tell()); pdf.write(f"{i} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = pdf.tell(); pdf.write(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]: pdf.write(f"{offset:010d} 00000 n \n".encode())
    pdf.write(f"trailer << /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()); pdf.seek(0)
    return StreamingResponse(pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={numero_factura}.pdf"})
