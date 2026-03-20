from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERADOR = "OPERADOR"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.OPERADOR)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)  # Insumo, Medicamento, Equipo, Material
    unit = Column(String)      # unidad, caja, ml, gramos
    min_stock = Column(Integer, default=0)
    barcode = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    lots = relationship("Lot", back_populates="product")
    movements = relationship("Movement", back_populates="product")

class Lot(Base):
    __tablename__ = "lots"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    lot_number = Column(String, index=True)
    barcode = Column(String, nullable=True, index=True)
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
    type = Column(SQLEnum(MovementType))
    product_id = Column(Integer, ForeignKey("products.id"))
    lot_id = Column(Integer, ForeignKey("lots.id"))
    qty = Column(Integer)
    reason = Column(String, nullable=True)
    user_email = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    lot = relationship("Lot", back_populates="movements")
    product = relationship("Product", back_populates="movements")
