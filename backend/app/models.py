from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    SUPERADMIN = "SUPERADMIN"
    ADMIN = "ADMIN"
    OPERADOR = "OPERADOR"

# ── Multi-Tenant: Tabla maestra de empresas ───────────────────────────────────
class Empresa(Base):
    __tablename__ = "empresas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True)   # Ej: "Clínica San José"
    slug  = Column(String, unique=True, index=True)    # Ej: "clinica-san-jose"
    plan  = Column(String, default="FREE")             # FREE | PRO | ENTERPRISE
    activa = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    users    = relationship("User",    back_populates="empresa")
    products = relationship("Product", back_populates="empresa")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.OPERADOR)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", back_populates="users")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True, index=True)
    name = Column(String, index=True)
    category = Column(String)  # Insumo, Medicamento, Equipo, Material
    unit = Column(String)      # unidad, caja, ml, gramos
    min_stock = Column(Integer, default=0)
    barcode = Column(String, nullable=True)
    
    # --- Nuevos campos (Datos Maestros) ---
    presentacion = Column(String, nullable=True)
    registro_sanitario = Column(String, nullable=True)
    
    # Específicos MEDICAMENTOS
    principio_activo = Column(String, nullable=True)
    forma_farmaceutica = Column(String, nullable=True)
    concentracion = Column(String, nullable=True)
    
    # Marca y fabricante (aplica a todas las categorías)
    marca = Column(String, nullable=True)          # Marca comercial
    laboratorio = Column(String, nullable=True)    # Laboratorio / Fabricante
    vida_util = Column(String, nullable=True)
    
    # Específicos DISPOSITIVOS MÉDICOS
    clasificacion_riesgo = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    
    empresa  = relationship("Empresa", back_populates="products")
    lots = relationship("Lot", back_populates="product")
    movements = relationship("Movement", back_populates="product")

class Lot(Base):
    __tablename__ = "lots"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    lot_number = Column(String, index=True)
    barcode = Column(String, nullable=True, index=True)
    
    # --- Nuevos campos (Transaccionales) ---
    factura = Column(String, nullable=True)
    proveedor = Column(String, nullable=True)      # Nombre del proveedor
    fecha_recepcion = Column(Date, nullable=True)
    estado_recepcion = Column(String, nullable=True) # Aceptado / Rechazado
    causas_rechazo = Column(String, nullable=True)
    
    expiry_date = Column(Date)
    unit_cost = Column(Float, default=0.0)
    qty_initial = Column(Integer)
    qty_current = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="lots")
    movements = relationship("Movement", back_populates="lot")

class MovementType(str, enum.Enum):
    ENTRADA = "ENTRADA"
    SALIDA = "SALIDA"
    MERMA = "MERMA"
    AJUSTE = "AJUSTE"

class Movement(Base):
    __tablename__ = "movements"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True, index=True)
    type = Column(SQLEnum(MovementType))
    product_id = Column(Integer, ForeignKey("products.id"))
    lot_id = Column(Integer, ForeignKey("lots.id"))
    qty = Column(Integer)
    reason = Column(String, nullable=True)
    patient = Column(String, nullable=True)
    doctor = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    user_email = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    lot = relationship("Lot", back_populates="movements")
    product = relationship("Product", back_populates="movements")
