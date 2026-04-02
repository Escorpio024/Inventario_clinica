from pydantic import BaseModel, Field, validator
from datetime import date, datetime
from typing import Optional
from .models import MovementType, UserRole

# ── Auth ──────────────────────────────────────────────────────────────────────
class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: Optional[str] = None
    empresa_id: Optional[int] = None
    empresa_nombre: Optional[str] = None

class SaaSRegister(BaseModel):
    empresa_nombre: str = Field(..., min_length=2, max_length=200)
    admin_email: str = Field(..., min_length=5)
    admin_password: str = Field(..., min_length=6)
    admin_name: str = Field(..., min_length=2)

# ── Empresas ──────────────────────────────────────────────────────────────────
class EmpresaCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=200)
    slug: Optional[str] = Field(None, max_length=100)   # auto-generado si no se envía
    plan: str = "FREE"

class EmpresaOut(BaseModel):
    id: int
    nombre: str
    slug: str
    plan: str
    activa: int
    created_at: datetime

    class Config:
        from_attributes = True

# ── Users ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = Field(None, max_length=100)
    role: UserRole = UserRole.OPERADOR
    empresa_id: Optional[int] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[int] = None
    password: Optional[str] = Field(None, min_length=6)

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    is_active: int
    empresa_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ── Products ──────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(...)
    unit: str = Field(..., min_length=1, max_length=50)
    min_stock: int = Field(0, ge=0)
    barcode: Optional[str] = None
    
    presentacion: Optional[str] = None
    registro_sanitario: Optional[str] = None
    principio_activo: Optional[str] = None
    forma_farmaceutica: Optional[str] = None
    concentracion: Optional[str] = None
    marca: Optional[str] = None
    vida_util: Optional[str] = None
    clasificacion_riesgo: Optional[str] = None

class ProductOut(ProductCreate):
    id: int
    empresa_id: Optional[int] = None
    created_at: datetime
    
    presentacion: Optional[str] = None
    registro_sanitario: Optional[str] = None
    principio_activo: Optional[str] = None
    forma_farmaceutica: Optional[str] = None
    concentracion: Optional[str] = None
    marca: Optional[str] = None
    vida_util: Optional[str] = None
    clasificacion_riesgo: Optional[str] = None

    class Config:
        from_attributes = True

# ── Lots ──────────────────────────────────────────────────────────────────────
class LotCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    lot_number: str = Field(..., min_length=1, max_length=100)
    barcode: Optional[str] = None
    
    factura: Optional[str] = None
    fecha_recepcion: Optional[date] = None
    estado_recepcion: Optional[str] = None
    causas_rechazo: Optional[str] = None
    
    expiry_date: date
    unit_cost: float = Field(0.0, ge=0)
    qty_initial: int = Field(..., gt=0, description="Debe ser mayor a 0")

    @validator("expiry_date")
    def expiry_must_be_future(cls, v):
        if v < date.today():
            raise ValueError("La fecha de vencimiento no puede ser en el pasado")
        return v

class LotOut(BaseModel):
    id: int
    empresa_id: Optional[int] = None
    product_id: int
    lot_number: str
    barcode: Optional[str]
    expiry_date: date
    unit_cost: float
    qty_initial: int
    qty_current: int
    created_at: datetime
    
    factura: Optional[str] = None
    fecha_recepcion: Optional[date] = None
    estado_recepcion: Optional[str] = None
    causas_rechazo: Optional[str] = None

    class Config:
        from_attributes = True

# ── Movements ─────────────────────────────────────────────────────────────────
class MovementCreate(BaseModel):
    type: MovementType
    product_id: int = Field(..., gt=0)
    lot_id: int = Field(..., gt=0)
    qty: int = Field(..., gt=0, description="Cantidad positiva. Para AJUSTE suma stock.")
    reason: Optional[str] = Field(None, max_length=500)
    patient: Optional[str] = Field(None, max_length=200)
    doctor: Optional[str] = Field(None, max_length=200)
    destination: Optional[str] = Field(None, max_length=200)

class MovementOut(BaseModel):
    id: int
    type: str
    empresa_id: Optional[int] = None
    product_id: int
    lot_id: int
    qty: int
    reason: Optional[str]
    patient: Optional[str] = None
    doctor: Optional[str] = None
    destination: Optional[str] = None
    user_email: str
    created_at: datetime
    product_name: Optional[str] = None
    lot_number: Optional[str] = None

    class Config:
        from_attributes = True
