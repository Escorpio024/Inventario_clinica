# Documentación del Proyecto: Inventario Clínica

Este documento describe la estructura y propósito del código fuente del proyecto.

## 📂 Backend (Python / FastAPI)

El backend se encarga de la lógica de negocio, conexión a base de datos y autenticación.

### Archivos Principales

- **`backend/app/main.py`**: Es el punto de entrada de la API.
  - Configura la aplicación FastAPI.
  - Define la conexión a la base de datos (PostgreSQL/SQLite).
  - Contiene los "endpoints" (URLs) para:
    - **Autenticación**: Login y generación de tokens JWT.
    - **Productos**: Crear y listar productos.
    - **Lotes**: Gestionar lotes, fechas de vencimiento y stock.
    - **Movimientos**: Registrar entradas, salidas, mermas y ajustes.
    - **Búsqueda**: Buscar por código de barras.
    - **Reportes**: Generar Excel de inventario.

- **`backend/app/models.py`**: Define las tablas de la base de datos usando SQLAlchemy.
  - `User`: Usuarios del sistema.
  - `Product`: Catálogo de productos (nombre, categoría, stock mínimo).
  - `Lot`: Lotes específicos de productos (fecha vencimiento, stock actual).
  - `Movement`: Historial de movimientos (Kardex).

- **`backend/app/schemas.py`**: Define la estructura de los datos que entran y salen de la API (validación).

## 📂 Frontend (Next.js / React)

El frontend es la interfaz de usuario web.

### Archivos Principales

- **`frontend/app/page.js`**: Página de Inicio de Sesión (Login).
  - Permite ingresar con email y contraseña.
  - Guarda el token de sesión en el navegador.

- **`frontend/app/dashboard/page.js`**: Panel Principal (Dashboard).
  - Muestra tarjetas con resumen de alertas (vencidos, stock bajo).
  - **Pestaña Productos**: Listado de productos y su estado de stock.
  - **Pestaña Lotes**: Gestión de lotes (FEFO - First Expired, First Out).
  - **Pestaña Movimientos**: Historial de transacciones.
  - Modales para crear productos, lotes y registrar movimientos.

- **`frontend/app/components/BarcodeScanner.js`**: Componente de Escáner.
  - Usa la cámara del dispositivo para leer códigos QR y de barras.
  - Se integra en los formularios para facilitar la búsqueda y registro.

## 🗑️ Archivos Sin Uso Detectados

- **`frontend/app/dashboard/page.js.incomplete`**: Parece ser una versión antigua o incompleta del dashboard. Se recomienda eliminarla.
