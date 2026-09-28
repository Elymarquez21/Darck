"""Conversión de entidades del catálogo a respuestas de API."""
from app.models import Producto, Servicio
from app.schemas.producto import ProductoRespuesta
from app.schemas.servicio import ServicioRespuesta


def presentar_producto(producto: Producto) -> ProductoRespuesta:
    return ProductoRespuesta(
        id_producto=producto.id_producto,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        precio=producto.precio,
        stock=producto.stock,
        imagen_url=producto.imagen_url,
        estado=producto.estado,
        categoria=producto.categoria_nombre,
    )


def presentar_servicio(servicio: Servicio) -> ServicioRespuesta:
    return ServicioRespuesta(
        id_servicio=servicio.id_servicio,
        nombre=servicio.nombre,
        descripcion=servicio.descripcion,
        precio=servicio.precio,
        duracion_minutos=servicio.duracion_minutos,
        imagen_url=servicio.imagen_url,
        estado=servicio.estado,
        categoria=servicio.categoria_nombre,
    )
