-- =====================================================================
--  Ely Marquez · Base de datos relacional (Tercer Avance)
--  Motor: MySQL 8+ / MariaDB 10.4+
--  Contiene: roles, permisos, usuarios, productos y servicios,
--  con las relaciones necesarias para el control de acceso por rol.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS ely_marquez_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ely_marquez_db;

-- ---------------------------------------------------------------------
-- Tabla: roles
-- Define los perfiles de acceso: administrador, empleado y cliente.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id_rol       INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol   VARCHAR(50) NOT NULL UNIQUE,
  descripcion  VARCHAR(255) DEFAULT NULL,
  creado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: permisos
-- Acciones atómicas del sistema (crear_producto, eliminar_usuario, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permisos (
  id_permiso    INT AUTO_INCREMENT PRIMARY KEY,
  nombre_permiso VARCHAR(80) NOT NULL UNIQUE,
  descripcion   VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla intermedia: rol_permisos (relación N:M entre roles y permisos)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rol_permisos (
  id_rol     INT NOT NULL,
  id_permiso INT NOT NULL,
  PRIMARY KEY (id_rol, id_permiso),
  CONSTRAINT fk_rolpermisos_rol
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rolpermisos_permiso
    FOREIGN KEY (id_permiso) REFERENCES permisos(id_permiso)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: usuarios
-- Debe mantener relación directa con los campos del formulario de
-- registro (segundo avance): nombre, apellido, tipo/número de
-- documento, dirección, teléfono, correo y contraseña.
-- La contraseña se guarda con hashing (bcrypt) generado en el Backend.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario        INT AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(60)  NOT NULL,
  apellido          VARCHAR(60)  NOT NULL,
  tipo_documento    ENUM('CC', 'TI', 'CE', 'PA') NOT NULL DEFAULT 'CC',
  numero_documento  VARCHAR(20)  NOT NULL UNIQUE,
  direccion         VARCHAR(150) NOT NULL,
  telefono          VARCHAR(15)  NOT NULL,
  correo            VARCHAR(100) NOT NULL UNIQUE,
  contrasena_hash   VARCHAR(255) NOT NULL,      -- Hash bcrypt, nunca texto plano
  id_rol            INT NOT NULL DEFAULT 3,     -- 1=administrador 2=empleado 3=cliente
  estado            ENUM('activo', 'inactivo', 'bloqueado') NOT NULL DEFAULT 'activo',
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: categorias (soporte para productos y servicios)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(60) NOT NULL UNIQUE,
  tipo         ENUM('producto', 'servicio') NOT NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: productos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id_producto    INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  descripcion    TEXT DEFAULT NULL,
  precio         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock          INT NOT NULL DEFAULT 0,
  imagen_url     VARCHAR(255) DEFAULT NULL,
  id_categoria   INT DEFAULT NULL,
  estado         ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  creado_por     INT DEFAULT NULL,          -- id_usuario (admin/empleado) que lo registró
  creado_en      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_productos_creador
    FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: servicios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios (
  id_servicio     INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  descripcion     TEXT DEFAULT NULL,
  precio          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duracion_minutos INT NOT NULL DEFAULT 30,
  imagen_url      VARCHAR(255) DEFAULT NULL,
  id_categoria    INT DEFAULT NULL,
  estado          ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  creado_por      INT DEFAULT NULL,
  creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_servicios_categoria
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_servicios_creador
    FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Ventas y detalle: se conserva una copia del nombre y precio para que
-- el historial siga siendo correcto aunque cambie el catálogo.
CREATE TABLE IF NOT EXISTS ventas (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NOT NULL,
  id_usuario INT DEFAULT NULL,
  fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(12,2) NOT NULL,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  estado ENUM('pendiente','pagada','cancelada') NOT NULL DEFAULT 'pendiente',
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (id_cliente) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  INDEX idx_ventas_fecha (fecha_venta), INDEX idx_ventas_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalle_ventas (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  tipo ENUM('producto','servicio') NOT NULL,
  id_producto INT DEFAULT NULL,
  id_servicio INT DEFAULT NULL,
  nombre_item VARCHAR(100) NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  descuento DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE SET NULL,
  CONSTRAINT fk_detalle_servicio FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio) ON DELETE SET NULL,
  INDEX idx_detalle_producto (id_producto), INDEX idx_detalle_servicio (id_servicio)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS facturas (
  id_factura INT AUTO_INCREMENT PRIMARY KEY,
  numero_factura VARCHAR(24) NOT NULL UNIQUE,
  id_venta INT NOT NULL UNIQUE,
  fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('emitida','anulada') NOT NULL DEFAULT 'emitida',
  CONSTRAINT fk_facturas_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pqrs (
  id_pqr INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  tipo ENUM('peticion','queja','reclamo','sugerencia') NOT NULL,
  asunto VARCHAR(120) NOT NULL,
  descripcion TEXT NOT NULL,
  estado ENUM('pendiente','en_proceso','respondida','cerrada') NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pqrs_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  INDEX idx_pqrs_estado (estado), INDEX idx_pqrs_creado (creado_en)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: solicitudes_recuperacion (soporte para "Recuperar contraseña"
-- ya implementado en el Frontend en el segundo avance)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitudes_recuperacion (
  id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT NOT NULL,
  token        VARCHAR(255) NOT NULL,
  expira_en    DATETIME NOT NULL,
  usado        BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recuperacion_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
--  DATOS INICIALES (seed)
-- =====================================================================

INSERT INTO roles (id_rol, nombre_rol, descripcion) VALUES
  (1, 'administrador', 'Control total del sistema: usuarios, roles, productos y servicios'),
  (2, 'empleado',      'Gestiona productos, servicios y atención a clientes'),
  (3, 'cliente',       'Usuario final registrado desde el formulario público')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT INTO permisos (nombre_permiso, descripcion) VALUES
  ('usuarios.crear',   'Crear usuarios'),
  ('usuarios.leer',    'Consultar usuarios'),
  ('usuarios.actualizar', 'Actualizar usuarios'),
  ('usuarios.eliminar', 'Eliminar usuarios'),
  ('productos.crear',  'Crear productos'),
  ('productos.leer',   'Consultar productos'),
  ('productos.actualizar', 'Actualizar productos'),
  ('productos.eliminar', 'Eliminar productos'),
  ('servicios.crear',  'Crear servicios'),
  ('servicios.leer',   'Consultar servicios'),
  ('servicios.actualizar', 'Actualizar servicios'),
  ('servicios.eliminar', 'Eliminar servicios')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- administrador: todos los permisos
INSERT IGNORE INTO rol_permisos (id_rol, id_permiso)
  SELECT 1, id_permiso FROM permisos;

-- empleado: gestión de productos y servicios + lectura de usuarios
INSERT IGNORE INTO rol_permisos (id_rol, id_permiso)
  SELECT 2, id_permiso FROM permisos
  WHERE nombre_permiso IN (
    'usuarios.leer',
    'productos.crear','productos.leer','productos.actualizar','productos.eliminar',
    'servicios.crear','servicios.leer','servicios.actualizar','servicios.eliminar'
  );

-- cliente: solo lectura de productos y servicios (catálogo público)
INSERT IGNORE INTO rol_permisos (id_rol, id_permiso)
  SELECT 3, id_permiso FROM permisos
  WHERE nombre_permiso IN ('productos.leer', 'servicios.leer');

INSERT INTO categorias (nombre, tipo) VALUES
  ('Labiales', 'producto'),
  ('Skincare', 'producto'),
  ('Perfumería', 'producto'),
  ('Maquillaje a domicilio', 'servicio'),
  ('Asesoría de imagen', 'servicio')
ON DUPLICATE KEY UPDATE tipo = VALUES(tipo);
