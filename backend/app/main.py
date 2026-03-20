from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session, joinedload
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, date
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from openpyxl import Workbook
from io import BytesIO
import os
import logging

from .models import Base, User, Product, Lot, Movement, MovementType, UserRole
from .schemas import (
    UserLogin, Token, UserCreate, UserUpdate, UserOut,
    ProductCreate, ProductOut, LotCreate, LotOut, MovementCreate, MovementOut
)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/inventario")
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# ── Security ──────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set!")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Iniciando servidor...")
    Base.metadata.create_all(bind=engine)
    _migrate_users_table()
    _create_default_admin()
    logger.info("✅ Servidor listo.")
    yield
    logger.info("🛑 Cerrando servidor.")

def _migrate_users_table():
    """Agrega columnas nuevas a la tabla users si no existen (safe migration)."""
    with engine.connect() as conn:
        # Agregar columna full_name si no existe
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR"))
            conn.commit()
            logger.info("✅ Columna full_name agregada a users.")
        except Exception:
            conn.rollback()  # Ya existe, ignorar

        # Agregar columna role si no existe
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'OPERADOR'"))
            conn.execute(text("UPDATE users SET role = 'OPERADOR' WHERE role IS NULL"))
            conn.commit()
            logger.info("✅ Columna role agregada a users.")
        except Exception:
            conn.rollback()  # Ya existe, ignorar

        # Agregar columna created_at si no existe
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
            conn.execute(text("UPDATE users SET created_at = NOW() WHERE created_at IS NULL"))
            conn.commit()
            logger.info("✅ Columna created_at agregada a users.")
        except Exception:
            conn.rollback()  # Ya existe, ignorar

        # Asegurarse de que el admin tiene rol ADMIN
        try:
            conn.execute(text("UPDATE users SET role = 'ADMIN', full_name = 'Administrador' WHERE email = 'admin@clinica.com'"))
            conn.commit()
        except Exception:
            conn.rollback()


def _create_default_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@clinica.com").first()
        if not admin:
            hashed = pwd_context.hash("admin123")
            admin = User(
                email="admin@clinica.com",
                hashed_password=hashed,
                full_name="Administrador",
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
            logger.info("✅ Usuario admin creado.")
        else:
            if admin.role != UserRole.ADMIN:
                admin.role = UserRole.ADMIN
            if not admin.full_name:
                admin.full_name = "Administrador"
            db.commit()
    finally:
        db.close()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Inventario Clínica API",
    version="1.2.0",
    description="API REST para gestión de inventario médico con trazabilidad FEFO y roles de usuario",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Dependencies ──────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email, User.is_active == 1).first()
    if user is None:
        raise credentials_exception
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependencia que requiere rol ADMIN"""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="❌ Acceso denegado. Se requiere rol de Administrador."
        )
    return user

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.post("/auth/login", response_model=Token, tags=["auth"])
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email, User.is_active == 1).first()
    if not user or not pwd_context.verify(credentials.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Credenciales incorrectas o usuario inactivo")

    access_token = jwt.encode(
        {
            "sub": user.email,
            "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    logger.info(f"🔐 Login exitoso: {user.email} (rol: {user.role})")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "full_name": user.full_name or user.email,
    }

@app.get("/auth/me", response_model=UserOut, tags=["auth"])
def get_me(user: User = Depends(get_current_user)):
    return user

# ── User Management (solo ADMIN) ──────────────────────────────────────────────
@app.get("/users", response_model=list[UserOut], tags=["users"])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return db.query(User).order_by(User.created_at.desc()).all()

@app.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED, tags=["users"])
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(400, f"Ya existe un usuario con el email '{payload.email}'")
    hashed = pwd_context.hash(payload.password)
    user = User(
        email=payload.email,
        hashed_password=hashed,
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"👤 Usuario creado por {admin.email}: {user.email} (rol: {user.role})")
    return user

@app.put("/users/{id}", response_model=UserOut, tags=["users"])
def update_user(
    id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    # Evitar que el admin se degrade a sí mismo
    if user.email == admin.email and payload.role and payload.role != UserRole.ADMIN:
        raise HTTPException(400, "No puedes cambiar tu propio rol de Administrador")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        if user.email == admin.email and payload.is_active == 0:
            raise HTTPException(400, "No puedes desactivar tu propia cuenta")
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = pwd_context.hash(payload.password)
    db.commit()
    db.refresh(user)
    logger.info(f"✏️ Usuario {user.email} actualizado por {admin.email}")
    return user

@app.delete("/users/{id}", tags=["users"])
def delete_user(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if user.email == admin.email:
        raise HTTPException(400, "No puedes eliminar tu propia cuenta")
    db.delete(user)
    db.commit()
    logger.info(f"🗑️ Usuario {user.email} eliminado por {admin.email}")
    return {"message": f"Usuario '{user.email}' eliminado correctamente"}

# ── Products ──────────────────────────────────────────────────────────────────
@app.get("/products", response_model=list[ProductOut], tags=["products"])
def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return db.query(Product).offset(skip).limit(limit).all()

@app.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED, tags=["products"])
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    existing = db.query(Product).filter(Product.name == product.name).first()
    if existing:
        raise HTTPException(400, f"Ya existe un producto con el nombre '{product.name}'")
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    logger.info(f"📦 Producto '{product.name}' creado por {user.email}")
    return db_product

@app.delete("/products/{id}", tags=["products"])
def delete_product(id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(403, "Solo los administradores pueden eliminar productos")
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    if db.query(Lot).filter(Lot.product_id == id).count() > 0:
        raise HTTPException(400, "No se puede eliminar: El producto tiene lotes asociados.")
    if db.query(Movement).filter(Movement.product_id == id).count() > 0:
        raise HTTPException(400, "No se puede eliminar: El producto tiene histórico de movimientos.")
    db.delete(product)
    db.commit()
    logger.info(f"🗑️ Producto '{product.name}' eliminado por {user.email}")
    return {"message": "Producto eliminado correctamente"}

# ── Lots ──────────────────────────────────────────────────────────────────────
@app.get("/lots", response_model=list[LotOut], tags=["lots"])
def get_lots(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return db.query(Lot).offset(skip).limit(limit).all()

@app.post("/lots", response_model=LotOut, status_code=status.HTTP_201_CREATED, tags=["lots"])
def create_lot(
    lot: LotCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == lot.product_id).first()
    if not product:
        raise HTTPException(400, "Producto no encontrado")

    existing = db.query(Lot).filter(
        Lot.product_id == lot.product_id,
        Lot.lot_number == lot.lot_number
    ).first()
    if existing:
        raise HTTPException(400, f"Ya existe el lote '{lot.lot_number}' para este producto")

    db_lot = Lot(**lot.dict(), qty_current=lot.qty_initial)
    db.add(db_lot)
    db.commit()
    db.refresh(db_lot)
    logger.info(f"🏷️ Lote '{lot.lot_number}' creado por {user.email}")
    return db_lot

@app.delete("/lots/{id}", tags=["lots"])
def delete_lot(id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(403, "Solo los administradores pueden eliminar lotes")
    lot = db.query(Lot).filter(Lot.id == id).first()
    if not lot:
        raise HTTPException(404, "Lote no encontrado")
    if db.query(Movement).filter(Movement.lot_id == id).count() > 0:
        raise HTTPException(400, "No se puede eliminar: El lote tiene movimientos asociados.")
    db.delete(lot)
    db.commit()
    return {"message": "Lote eliminado correctamente"}

# ── Movements ─────────────────────────────────────────────────────────────────
@app.get("/movements", response_model=list[MovementOut], tags=["movements"])
def get_movements(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    movements = (
        db.query(Movement)
        .options(joinedload(Movement.product), joinedload(Movement.lot))
        .order_by(Movement.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": m.id,
            "type": m.type.value,
            "product_id": m.product_id,
            "lot_id": m.lot_id,
            "qty": m.qty,
            "reason": m.reason,
            "user_email": m.user_email,
            "created_at": m.created_at,
            "product_name": m.product.name if m.product else None,
            "lot_number": m.lot.lot_number if m.lot else None,
        }
        for m in movements
    ]

@app.post("/movements", status_code=status.HTTP_201_CREATED, tags=["movements"])
def create_movement(
    payload: MovementCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.qty <= 0:
        raise HTTPException(400, "La cantidad debe ser mayor a 0")

    product = db.query(Product).filter_by(id=payload.product_id).first()
    if not product:
        raise HTTPException(400, "Producto inválido")

    lot = db.get(Lot, payload.lot_id)
    if not lot or lot.product_id != payload.product_id:
        raise HTTPException(400, "Lote inválido para el producto")

    if payload.type == MovementType.SALIDA and lot.expiry_date <= date.today():
        raise HTTPException(403, "❌ Lote vencido. No se puede usar para SALIDA.")

    if payload.type in (MovementType.SALIDA, MovementType.MERMA):
        if lot.qty_current < payload.qty:
            raise HTTPException(400, f"Stock insuficiente. Disponible: {lot.qty_current}")
        lot.qty_current -= payload.qty
    else:
        lot.qty_current += payload.qty

    movement = Movement(
        type=payload.type,
        product_id=payload.product_id,
        lot_id=payload.lot_id,
        qty=abs(payload.qty),
        reason=payload.reason,
        user_email=user.email,
    )
    db.add(movement)
    db.commit()
    logger.info(f"📋 Movimiento {payload.type.value} por {user.email}: {payload.qty} u. lote {lot.lot_number}")
    return {"status": "success", "message": "Movimiento registrado", "qty_current": lot.qty_current}

# ── Barcode search ────────────────────────────────────────────────────────────
@app.get("/search/barcode/{code}", tags=["search"])
def search_barcode(
    code: str,
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user)
):
    lot = db.query(Lot).filter(Lot.barcode == code).first()
    if lot:
        product = db.query(Product).filter(Product.id == lot.product_id).first()
        return {
            "type": "lot",
            "lot_id": lot.id,
            "lot_number": lot.lot_number,
            "product_id": lot.product_id,
            "product_name": product.name if product else None,
        }

    product = db.query(Product).filter(Product.barcode == code).first()
    if product:
        return {
            "type": "product",
            "product_id": product.id,
            "product_name": product.name,
        }

    raise HTTPException(404, "Código no encontrado")

# ── Excel Report ──────────────────────────────────────────────────────────────
@app.get("/reports/inventory_lots.xlsx", tags=["reports"])
def report_inventory_lots(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user)
):
    try:
        from openpyxl.styles import Font, PatternFill, Alignment

        wb = Workbook()

        # ── Hoja 1: Inventario por lote ──
        ws1 = wb.active
        ws1.title = "Inventario por Lote"
        ws1.append(["Producto", "Categoría", "Unidad", "Lote", "Vencimiento", "Cantidad actual", "Stock mínimo", "Código"])
        lots = (
            db.query(Lot, Product)
            .join(Product, Product.id == Lot.product_id)
            .order_by(Lot.expiry_date.asc())
            .all()
        )
        for lot, product in lots:
            exp_str = lot.expiry_date.strftime("%Y-%m-%d") if lot.expiry_date else "Sin fecha"
            ws1.append([
                product.name or "", product.category or "", product.unit or "",
                lot.lot_number or "", exp_str, lot.qty_current or 0,
                product.min_stock or 0, lot.barcode or "",
            ])

        # ── Hoja 2: Movimientos (trazabilidad) ──
        ws2 = wb.create_sheet("Movimientos")
        ws2.append(["ID", "Tipo", "Producto", "Lote", "Cantidad", "Usuario", "Fecha", "Razón"])
        movements = (
            db.query(Movement)
            .options(joinedload(Movement.product), joinedload(Movement.lot))
            .order_by(Movement.created_at.desc())
            .all()
        )
        for m in movements:
            ws2.append([
                m.id,
                m.type.value,
                m.product.name if m.product else "",
                m.lot.lot_number if m.lot else "",
                m.qty,
                m.user_email,
                m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else "",
                m.reason or "",
            ])

        # ── Estilos headers ──
        header_fill = PatternFill(start_color="667EEA", end_color="667EEA", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        for ws in [ws1, ws2]:
            for cell in ws[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center")
            for col in ws.columns:
                max_len = max((len(str(cell.value or "")) for cell in col), default=10)
                ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 40)

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        logger.info(f"📊 Excel generado por {u.email}")
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=inventario_clinica.xlsx"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando reporte: {str(e)}")

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "version": "1.2.0"}

@app.get("/", tags=["system"])
def root():
    return {"message": "API Inventario Clínica", "version": "1.2.0", "docs": "/docs"}
