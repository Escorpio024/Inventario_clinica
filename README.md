# 🏥 Sistema de Inventario para Clínica Estética

**Aplicación web profesional para control de inventario médico con trazabilidad completa y gestión de roles de usuario.**

Diseñada para clínicas estéticas y dermatológicas. Accesible desde iPhone, Mac y Android como PWA. Control de insumos médicos de forma segura, trazable y eficiente.

---

## 🎯 Características Principales

### 📦 Gestión de Productos
- Registro completo: nombre, categoría, unidad, stock mínimo
- Código de barras/QR para identificación rápida
- Edición y eliminación con control de acceso
- Alertas visuales de stock bajo

### 🏷️ Control por Lotes (FEFO)
- Gestión por lotes con fecha de vencimiento
- **FEFO Automático**: el sistema sugiere primero el lote que vence antes
- Bloqueo automático de lotes vencidos para SALIDA
- Indicadores de colores: ✓ OK · ⏳ Por vencer · ⚠️ Crítico · 🔴 Vencido
- Edición de lotes (fecha, costo, stock actual)

### 📋 Movimientos y Trazabilidad
- Tipos: **Entrada** · **Salida** · **Merma** · **Ajuste**
- Cada movimiento registra: quién lo hizo, qué, cuándo y por qué
- Historial completo e inmutable para auditorías
- Exportación a **Excel** con hoja de lotes + hoja de movimientos con usuario

### 👥 Gestión de Usuarios y Roles
- **Administrador (👑 ADMIN)**: acceso total, gestión de usuarios, eliminación de registros
- **Operador (👤 OPERADOR)**: puede visualizar y registrar movimientos
- El admin puede crear, editar, activar/desactivar y eliminar usuarios
- Badges con nombre y rol visibles en el navbar

### 📷 Escáner QR / Código de Barras
- Escaneo con cámara del dispositivo desde el navegador
- Auto-completa formularios al escanear
- Compatible con iPhone, Android y PC con cámara

### ⚠️ Alertas Inteligentes
- Panel de alertas prioritarias visible en el dashboard
- Detecta: lotes vencidos, lotes por vencer (≤30 días) y stock bajo

---

## 🚀 Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI + Python 3.12 |
| Frontend | Next.js 15 + React 19 |
| Base de datos | PostgreSQL 16 |
| Contenedores | Docker + Docker Compose |
| Autenticación | JWT (python-jose + bcrypt) |
| PWA | Web App Manifest |

---

## 📦 Instalación Rápida (Docker)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/inventario-clinica.git
cd inventario-clinica

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tu SECRET_KEY segura

# 3. Levantar todos los servicios
docker compose up --build

# Acceder a:
#   Frontend:  http://localhost:3000
#   API:       http://localhost:8000
#   API Docs:  http://localhost:8000/docs
```

---

## 🔐 Credenciales por Defecto

> ⚠️ **Cámbialas inmediatamente después del primer inicio de sesión.**

| Campo | Valor |
|-------|-------|
| Usuario | `admin@clinica.com` |
| Contraseña | `admin123` |
| Rol | ADMIN |

---

## 📱 PWA — Instalar como App

### iPhone / iPad
1. Abre en **Safari**
2. Toca **Compartir** → **Agregar a pantalla de inicio**

### Android
1. Abre en **Chrome**
2. Menú → **Instalar aplicación**

---

## 🏗️ Estructura del Proyecto

```
inventario-clinica/
├── backend/
│   ├── app/
│   │   ├── main.py          # API FastAPI (endpoints, auth, migraciones)
│   │   ├── models.py        # Modelos SQLAlchemy (User, Product, Lot, Movement)
│   │   └── schemas.py       # Validaciones Pydantic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.js          # Página de login
│   │   ├── dashboard/
│   │   │   └── page.js      # Dashboard principal
│   │   ├── components/
│   │   │   └── BarcodeScanner.js
│   │   ├── globals.css      # Estilos globales
│   │   └── layout.js
│   ├── public/
│   │   └── manifest.json    # Configuración PWA
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── project_overview.md
├── docker-compose.yml
├── .env.example             # Plantilla de configuración
└── README.md
```

---

## 📖 Flujo de Uso

### 1. Crear Productos
Ir a la pestaña **Productos** → **+ Nuevo** o editar uno existente.

### 2. Crear Lotes
Ir a **Lotes FEFO** → **+ Nuevo**. Escanear o escribir el código de barras, ingresar fecha de vencimiento y cantidad.

### 3. Registrar Movimientos
Ir a **Movimientos** → **+ Nuevo**. El sistema selecciona automáticamente el lote FEFO correcto y bloquea lotes vencidos para salidas.

### 4. Exportar a Excel
Botón **Excel** en el navbar. Genera un archivo con:
- **Hoja 1**: Inventario de lotes con estados de vencimiento
- **Hoja 2**: Historial de movimientos con el usuario responsable

---

## 🔧 Desarrollo Local (sin Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📝 API Endpoints Principales

Documentación interactiva completa en: `http://localhost:8000/docs`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Autenticación, retorna JWT |
| GET/POST | `/products` | Listar / crear productos |
| PUT/DELETE | `/products/{id}` | Editar / eliminar producto |
| GET/POST | `/lots` | Listar / crear lotes |
| PUT/DELETE | `/lots/{id}` | Editar / eliminar lote |
| GET/POST | `/movements` | Listar / registrar movimientos |
| GET | `/users` | Listar usuarios (solo ADMIN) |
| POST | `/users` | Crear usuario (solo ADMIN) |
| PUT/DELETE | `/users/{id}` | Editar / eliminar usuario (solo ADMIN) |
| GET | `/reports/inventory_lots.xlsx` | Reporte Excel |

---

## 🛡️ Seguridad

- Autenticación **JWT** con tiempo de expiración
- Contraseñas hasheadas con **bcrypt**
- Control de acceso por roles (**RBAC**): endpoints protegidos con `require_admin`
- **CORS** configurado por variable de entorno
- El `.env` nunca se sube a Git

---

## 📈 Roadmap

- [ ] Confirmación modal antes de eliminar registros
- [ ] Paginación para tablas con muchos datos
- [ ] Dashboard con gráficos de consumo mensual
- [ ] Notificaciones email/WhatsApp para alertas críticas
- [ ] Módulo de proveedores y órdenes de compra

---

**Versión**: 1.2.0  
**Última actualización**: Marzo 2026
