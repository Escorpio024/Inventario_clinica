"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import BarcodeScanner from "../components/BarcodeScanner";
import { DashboardContext } from "./DashboardContext";
import ProductsTab from "../components/tabs/ProductsTab";
import LotsTab from "../components/tabs/LotsTab";
import MovementsTab from "../components/tabs/MovementsTab";
import UsersTab from "../components/tabs/UsersTab";
import EmpresasTab from "../components/tabs/EmpresasTab";
import { getLotExpiryStatus } from "../utils/helpers";
import { useDebounce } from "../hooks/useDebounce";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const INITIAL_PRODUCT = {
    name: "", category: "Medicamento", unit: "unidad", min_stock: 2, barcode: "",
    presentacion: "", registro_sanitario: "", principio_activo: "",
    forma_farmaceutica: "", concentracion: "", marca: "", laboratorio: "",
    vida_util: "", clasificacion_riesgo: ""
};

const INITIAL_LOT = {
    product_id: "", lot_number: "", barcode: "", expiry_date: "",
    unit_cost: 0, qty_initial: 1, factura: "", proveedor: "",
    fecha_recepcion: "", estado_recepcion: "Aceptado", causas_rechazo: ""
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("products");
    const [products, setProducts] = useState([]);
    const [lots, setLots] = useState([]);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showProductForm, setShowProductForm] = useState(false);
    const [showLotForm, setShowLotForm] = useState(false);
    const [showMovementForm, setShowMovementForm] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerContext, setScannerContext] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });
    const [searchProducts, setSearchProducts] = useState("");
    const [searchLots, setSearchLots] = useState("");
    const [searchMovements, setSearchMovements] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterProductStatus, setFilterProductStatus] = useState("");

    // Stats rápidos del servidor (evita descargar todo para KPIs)
    const [stats, setStats] = useState({ total_products: 0, total_lots: 0, vencidos_count: 0, valor_inventario: 0, total_movements: 0 });

    // Debounce: espera 450ms tras dejar de escribir antes de pedir a la API
    const debouncedSearchProducts = useDebounce(searchProducts, 450);
    const debouncedSearchLots = useDebounce(searchLots, 450);
    const debouncedSearchMovements = useDebounce(searchMovements, 450);
    const debouncedFilterCategory = useDebounce(filterCategory, 200);
    const debouncedFilterStatus = useDebounce(filterStatus, 200);
    const debouncedFilterProductStatus = useDebounce(filterProductStatus, 200);

    const [newProduct, setNewProduct] = useState(INITIAL_PRODUCT);

    const [newLot, setNewLot] = useState(INITIAL_LOT);

    const [newMovement, setNewMovement] = useState({
        type: "SALIDA", product_id: "", lot_id: "", qty: 1, reason: "", patient: "", doctor: "", destination: ""
    });
    const [visibleRows, setVisibleRows] = useState(50);

    const [token, setToken] = useState(null);
    const [userEmail, setUserEmail] = useState("");
    const [userRole, setUserRole] = useState("");
    const [userFullName, setUserFullName] = useState("");

    // Estado para gestión de usuarios
    const [users, setUsers] = useState([]);
    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "OPERADOR" });

    // Estado para edición
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingLot, setEditingLot] = useState(null);

    // Modal de confirmación personalizado (reemplaza confirm() nativo)
    const [confirmModal, setConfirmModal] = useState({ show: false, message: "", onConfirm: null, danger: true });

    // Estado para gestión de empresas (SaaS)
    const [empresas, setEmpresas] = useState([]);
    const [showEmpresaForm, setShowEmpresaForm] = useState(false);
    const [newEmpresa, setNewEmpresa] = useState({ nombre: "", plan: "FREE" });

    // Estado para envío de reporte de correos
    const [isSendingAlerts, setIsSendingAlerts] = useState(false);

    // Multi-tenant: Nombre de la empresa
    const [empresaNombre, setEmpresaNombre] = useState("");

    const isSuperAdmin = userRole === "SUPERADMIN";
    const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";

    // ⏱️ Auto Logout por inactividad (15 min)
    useEffect(() => {
        let timeoutId;
        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user_email");
                window.location.href = "/";
            }, 15 * 60 * 1000);
        };
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(e => document.addEventListener(e, resetTimer));
        resetTimer();
        return () => {
            events.forEach(e => document.removeEventListener(e, resetTimer));
            clearTimeout(timeoutId);
        };
    }, []);

    // 🛡️ Prevenir salir del dashboard al darle "Atrás" con modales abiertos
    useEffect(() => {
        const modalOpen = showProductForm || showLotForm || showMovementForm || showUserForm || confirmModal.show || editingProduct !== null || editingLot !== null || editingUser !== null || showScanner;

        const handlePopState = (e) => {
            if (modalOpen) {
                setShowProductForm(false);
                setShowLotForm(false);
                setShowMovementForm(false);
                setShowUserForm(false);
                setShowScanner(false);
                setConfirmModal({ show: false, message: "", onConfirm: null, danger: true });
                setEditingProduct(null);
                setEditingLot(null);
                setEditingUser(null);
            }
        };

        // Si se abre un modal, empujamos un estado falso al historial para que la flecha "atrás" 
        // del celular o el navegador consuma ese estado en lugar de salirse de la página.
        if (modalOpen) {
            window.history.pushState({ modal: true }, "");
        }

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [showProductForm, showLotForm, showMovementForm, showUserForm, confirmModal.show, editingProduct, editingLot, editingUser, showScanner]);

    // Cargar token solo en cliente
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
            window.location.href = "/";
            return;
        }
        setToken(storedToken);
        setUserEmail(localStorage.getItem("user_email") || "Usuario");
        setUserRole(localStorage.getItem("user_role") || "");
        setUserFullName(localStorage.getItem("user_full_name") || "");
        setEmpresaNombre(localStorage.getItem("empresa_nombre") || "Mis Datos");
    }, []);

    // Carga inicial: stats para KPIs (liviano) + datos de la pestaña activa
    const loadStats = useCallback(async (headers) => {
        try {
            const res = await fetch(`${API}/stats`, { headers });
            if (res.ok) setStats(await res.json());
        } catch { /* silencioso */ }
    }, []);

    const loadProducts = useCallback(async (headers, search, category) => {
        const params = new URLSearchParams({ limit: "100" });
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        const res = await fetch(`${API}/products?${params}`, { headers });
        if (!res.ok) return;
        setProducts(await res.json());
    }, []);

    const loadLots = useCallback(async (headers, search, status) => {
        const params = new URLSearchParams({ limit: "200" });
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        const res = await fetch(`${API}/lots?${params}`, { headers });
        if (!res.ok) return;
        setLots(await res.json());
    }, []);

    const loadMovements = useCallback(async (headers, search) => {
        const params = new URLSearchParams({ limit: "200" });
        if (search) params.set("search", search);
        const res = await fetch(`${API}/movements?${params}`, { headers });
        if (!res.ok) return;
        setMovements(await res.json());
    }, []);

    const loadEmpresas = useCallback(async (headers) => {
        const res = await fetch(`${API}/empresas`, { headers });
        if (res.ok) setEmpresas(await res.json());
    }, []);

    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };
        // Respeta los filtros activos para que el refresh no borre lo que el usuario estaba buscando
        const curSearch = searchProducts;
        const curCategory = filterCategory;
        const curLotSearch = searchLots;
        const curLotStatus = filterStatus;
        const curMovSearch = searchMovements;
        try {
            await Promise.all([
                loadStats(headers),
                loadProducts(headers, curSearch, curCategory),
                loadLots(headers, curLotSearch, curLotStatus),
                loadMovements(headers, curMovSearch),
            ]);
            const role = localStorage.getItem("user_role");
            if (role === "ADMIN" || role === "SUPERADMIN") {
                const uRes = await fetch(`${API}/users`, { headers });
                if (uRes.ok) setUsers(await uRes.json());
            }
            if (role === "SUPERADMIN") {
                await loadEmpresas(headers);
            }
        } catch {
            showMessage("Error cargando datos. Verifica la conexión.", "danger");
        } finally {
            setLoading(false);
        }
    }, [token, loadStats, loadProducts, loadLots, loadMovements, loadEmpresas,
        searchProducts, filterCategory, searchLots, filterStatus, searchMovements]);

    useEffect(() => {
        if (token) loadData();
    }, [token, loadData]);

    // 🔎 Re-fetches reactivos al debounce — solo llaman la pestaña activa
    useEffect(() => {
        if (!token || loading) return;
        const headers = { Authorization: `Bearer ${token}` };
        loadProducts(headers, debouncedSearchProducts, debouncedFilterCategory);
    }, [token, debouncedSearchProducts, debouncedFilterCategory]);

    useEffect(() => {
        if (!token || loading) return;
        const headers = { Authorization: `Bearer ${token}` };
        loadLots(headers, debouncedSearchLots, debouncedFilterStatus);
    }, [token, debouncedSearchLots, debouncedFilterStatus]);

    useEffect(() => {
        if (!token || loading) return;
        const headers = { Authorization: `Bearer ${token}` };
        loadMovements(headers, debouncedSearchMovements);
    }, [token, debouncedSearchMovements]);

    // ── User CRUD ────────────────────────────────────────────────────────────
    async function createUser(e) {
        e.preventDefault();
        if (!newUser.email || !newUser.password) return showMessage("Email y contraseña son obligatorios", "danger");
        try {
            const res = await fetch(`${API}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();
            if (res.ok) {
                showMessage(`✅ Usuario '${data.email}' creado`, "success");
                setShowUserForm(false);
                setNewUser({ email: "", password: "", full_name: "", role: "OPERADOR" });
                loadData();
            } else {
                showMessage(`❌ ${data.detail || "Error creando usuario"}`, "danger");
            }
        } catch {
            showMessage("❌ Error de conexión", "danger");
        }
    }

    async function updateUserRole(userId, updates) {
        try {
            const res = await fetch(`${API}/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (res.ok) {
                showMessage(`✅ Usuario actualizado`, "success");
                setEditingUser(null);
                loadData();
            } else {
                showMessage(`❌ ${data.detail || "Error actualizando"}`, "danger");
            }
        } catch {
            showMessage("❌ Error de conexión", "danger");
        }
    }

    async function deleteUser(userId, email) {
        setConfirmModal({
            show: true,
            message: `¿Eliminar al usuario '${email}'? Esta acción no se puede deshacer.`,
            danger: true,
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API}/users/${userId}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showMessage(`✅ Usuario '${email}' eliminado`, "success");
                        loadData();
                    } else {
                        showMessage(`❌ ${data.detail || "Error eliminando"}`, "danger");
                    }
                } catch {
                    showMessage("❌ Error de conexión", "danger");
                }
            }
        });
    }

    async function saveProduct(e) {
        e.preventDefault();
        if (!newProduct.name.trim()) return showMessage("El nombre es obligatorio", "danger");
        const method = editingProduct ? "PUT" : "POST";
        const url = editingProduct ? `${API}/products/${editingProduct.id}` : `${API}/products`;

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(newProduct)
            });
            if (res.ok) {
                showMessage(editingProduct ? "✅ Producto actualizado" : "✅ Producto creado", "success");
                setShowProductForm(false);
                setEditingProduct(null);
                setNewProduct(INITIAL_PRODUCT);
                loadData();
            } else {
                const err = await res.json();
                showMessage(err.detail || "❌ Error guardando producto", "danger");
            }
        } catch {
            showMessage("❌ Error de conexión", "danger");
        }
    }

    async function saveLot(e) {
        e.preventDefault();
        if (!newLot.product_id) return showMessage("Debes seleccionar un producto clínico de la lista", "danger");
        if (parseInt(newLot.qty_initial) <= 0) return showMessage("La cantidad debe ser mayor a 0", "danger");
        const method = editingLot ? "PUT" : "POST";
        const url = editingLot ? `${API}/lots/${editingLot.id}` : `${API}/lots`;

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...newLot,
                    qty_current: editingLot ? newLot.qty_current : newLot.qty_initial
                })
            });
            if (res.ok) {
                showMessage(editingLot ? "✅ Lote actualizado" : "✅ Lote creado", "success");
                setShowLotForm(false);
                setEditingLot(null);
                setNewLot(INITIAL_LOT);
                loadData();
            } else {
                const err = await res.json();
                showMessage(err.detail || "❌ Error guardando lote", "danger");
            }
        } catch {
            showMessage("❌ Error de conexión", "danger");
        }
    }

    async function createMovement(e) {
        e.preventDefault();
        const qty = parseInt(newMovement.qty);
        if (!qty || qty <= 0) return showMessage("La cantidad debe ser mayor a 0", "danger");
        if (!newMovement.lot_id) return showMessage("Selecciona un lote", "danger");
        try {
            const res = await fetch(`${API}/movements`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    type: newMovement.type,
                    product_id: parseInt(newMovement.product_id),
                    lot_id: parseInt(newMovement.lot_id),
                    qty,
                    reason: newMovement.reason || null,
                    patient: newMovement.patient || null,
                    doctor: newMovement.doctor || null,
                    destination: newMovement.destination || null,
                })
            });
            if (res.ok) {
                const data = await res.json();
                showMessage(`✅ Movimiento registrado. Stock actual: ${data.qty_current}`, "success");
                setShowMovementForm(false);
                setNewMovement({ type: "SALIDA", product_id: "", lot_id: "", qty: 1, reason: "", patient: "", doctor: "", destination: "" });
                loadData();
            } else {
                const err = await res.json();
                showMessage(err.detail || "❌ Error registrando movimiento", "danger");
            }
        } catch {
            showMessage("❌ Error de conexión", "danger");
        }
    }

    async function deleteProduct(id) {
        setConfirmModal({
            show: true,
            message: "¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.",
            danger: true,
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API}/products/${id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        showMessage("✅ Producto eliminado", "success");
                        loadData();
                    } else {
                        const err = await res.json();
                        showMessage(err.detail || "❌ Error eliminando producto", "danger");
                    }
                } catch {
                    showMessage("❌ Error de conexión", "danger");
                }
            }
        });
    }

    async function deleteLot(id) {
        setConfirmModal({
            show: true,
            message: "¿Estás seguro de eliminar este lote? Esta acción no se puede deshacer.",
            danger: true,
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API}/lots/${id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        showMessage("✅ Lote eliminado", "success");
                        loadData();
                    } else {
                        const err = await res.json();
                        showMessage(err.detail || "❌ Error eliminando lote", "danger");
                    }
                } catch {
                    showMessage("❌ Error de conexión", "danger");
                }
            }
        });
    }

    // ── Email Alerts ──────────────────────────────────────────────────────────
    async function sendEmailAlerts() {
        setConfirmModal({
            show: true,
            message: "¿Deseas analizar el inventario actual y enviar el reporte automatizado de stock al Administrador?",
            danger: false,
            onConfirm: async () => {
                setIsSendingAlerts(true);
                try {
                    const res = await fetch(`${API}/reports/email-alerts`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                        showMessage(`📧 ${data.message}`, "success");
                    } else {
                        showMessage(`❌ ${data.detail || "Error enviando alerta"}`, "danger");
                    }
                } catch (err) {
                    showMessage(`❌ Error de conexión: ${err.message}`, "danger");
                } finally {
                    setIsSendingAlerts(false);
                }
            }
        });
    }

    async function downloadExcel() {
        try {
            const res = await fetch(`${API}/reports/inventory_lots.xlsx`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) { showMessage("❌ Sesión expirada", "danger"); logout(); return; }
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                showMessage(`❌ Error: ${errData.detail || "Error descargando reporte"}`, "danger");
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "inventario_lotes.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showMessage("✅ Excel descargado", "success");
        } catch (err) {
            showMessage(`❌ Error de conexión: ${err.message}`, "danger");
        }
    }

    // ── Barcode scan ──────────────────────────────────────────────────────────
    const handleScan = useCallback(async (code) => {
        try {
            const res = await fetch(`${API}/search/barcode/${encodeURIComponent(code)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();

                if (scannerContext === "lot") {
                    // Asignar el código al campo barcode del formulario de lote
                    setNewLot(prev => ({ ...prev, barcode: code }));
                    showMessage(`✅ Código asignado al lote: ${code}`, "success");

                } else if (scannerContext === "movement") {
                    if (data.type === "lot") {
                        // Lote encontrado → auto-rellena producto y lote
                        setNewMovement(prev => ({
                            ...prev,
                            product_id: data.product_id.toString(),
                            lot_id: data.lot_id.toString()
                        }));
                        showMessage(`✅ ${data.product_name} — Lote: ${data.lot_number}`, "success");
                    } else if (data.type === "product") {
                        // Producto encontrado → auto-rellena producto (lote a elegir)
                        setNewMovement(prev => ({ ...prev, product_id: data.product_id.toString(), lot_id: "" }));
                        showMessage(`✅ Producto: ${data.product_name} — Selecciona el lote`, "success");
                    }
                }

            } else if (res.status === 404) {
                // El código fue escaneado correctamente pero no está en la base de datos
                if (scannerContext === "lot") {
                    // Si escanea en el formulario de lote, asignar igual el código
                    setNewLot(prev => ({ ...prev, barcode: code }));
                    showMessage(`📋 Código nuevo asignado: ${code} — Guárdalo al crear el lote`, "info");
                } else {
                    showMessage(
                        `⚠️ Código ${code} no registrado. Créalo primero en Productos → Lotes.`,
                        "danger"
                    );
                }
            }
        } catch {
            showMessage("❌ Error de conexión al buscar el código", "danger");
        }
        setShowScanner(false);
    }, [token, scannerContext]);

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user_email");
        window.location.href = "/";
    }

    function showMessage(text, type) {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 8000); // Dar más tiempo a los no técnicos para leer el error
    }

    // ── Cálculos de alertas ───────────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const vencidosCount = lots.filter(l => new Date(l.expiry_date + "T12:00:00") < today).length;
    const porVencerCount = lots.filter(l => {
        const exp = new Date(l.expiry_date + "T12:00:00");
        const days = Math.floor((exp - today) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 365;  // Exluye vencidos (day <= 0)
    }).length;
    const stockBajoCount = products.filter(p => {
        const total = lots.filter(l => l.product_id === p.id).reduce((s, l) => s + l.qty_current, 0);
        return total < p.min_stock;
    }).length;
    const hasAlerts = vencidosCount > 0 || porVencerCount > 0 || stockBajoCount > 0;

    // Lotes disponibles para el formulario de movimiento (FEFO)
    const lotsForMovement = newMovement.product_id
        ? lots
            .filter(l => l.product_id === parseInt(newMovement.product_id) && l.qty_current > 0)
            .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
        : [];

    const selectedLot = newMovement.lot_id
        ? lots.find(l => l.id === parseInt(newMovement.lot_id))
        : null;

    // Los filtros de stock bajo (BAJO/OK) se hacen en cliente ya que requieren
    // cruzar lotes y productos — operación liviana con los datos ya cargados.
    const filteredProducts = debouncedFilterProductStatus
        ? products.filter(p => {
            const totalStock = lots.filter(l => l.product_id === p.id).reduce((s, l) => s + l.qty_current, 0);
            const isLow = totalStock < p.min_stock;
            if (debouncedFilterProductStatus === "OK") return !isLow;
            if (debouncedFilterProductStatus === "BAJO") return isLow;
            return true;
        })
        : products;

    // Lotes y movimientos: ya vienen filtrados del servidor
    const filteredLots = lots;
    const filteredMovements = movements;

    const contextValue = {
        products, lots, movements, users, loading, stats,
        activeTab, setActiveTab, isAdmin, isSuperAdmin, userEmail,
        searchProducts, setSearchProducts, filterCategory, setFilterCategory, filterProductStatus, setFilterProductStatus,
        searchLots, setSearchLots, filterStatus, setFilterStatus,
        searchMovements, setSearchMovements,
        visibleRows, setVisibleRows,
        showProductForm, setShowProductForm,
        showLotForm, setShowLotForm,
        showMovementForm, setShowMovementForm,
        showUserForm, setShowUserForm,
        editingProduct, setEditingProduct, setNewProduct,
        editingLot, setEditingLot, setNewLot,
        editingUser, setEditingUser, setNewUser,
        empresas, setEmpresas, showEmpresaForm, setShowEmpresaForm, newEmpresa, setNewEmpresa, createEmpresa,
        filteredProducts, filteredLots, filteredMovements,
        deleteProduct, deleteLot, deleteUser, createUser, updateUserRole,
    };

    async function createEmpresa(e) {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/empresas`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(newEmpresa)
            });
            const data = await res.json();
            if (res.ok) {
                showMessage(`✅ Empresa '${data.nombre}' creada`, "success");
                setShowEmpresaForm(false);
                setNewEmpresa({ nombre: "", plan: "FREE" });
                loadData();
            } else {
                showMessage(`❌ ${data.detail || "Error creando empresa"}`, "danger");
            }
        } catch {
            showMessage("❌ Error de conexión", "danger");
        }
    }

    // ── Products ─────────────────────────────────────────────────────────────────
    return (
        <DashboardContext.Provider value={contextValue}>
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
                {/* Navbar */}
                <nav style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "1rem 2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
                    <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "2rem" }}>🏢</span>
                            <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: "700", margin: 0 }}>
                                {empresaNombre || "Inventario Clínica"}
                            </h1>
                        </div>
                        <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                            <div className="nav-tools" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {/* Email Alert button */}
                                {isAdmin && (
                                    <button id="btn-email-alert" onClick={sendEmailAlerts} disabled={isSendingAlerts} style={{
                                        background: "white", color: "#f59e0b", fontWeight: "700", opacity: isSendingAlerts ? 0.7 : 1,
                                        border: "none", padding: "0.6rem 1.2rem", borderRadius: "0.6rem",
                                        cursor: isSendingAlerts ? "wait" : "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)", transition: "all 0.2s"
                                    }}>
                                        {isSendingAlerts ? "⏳ Enviando..." : "🔔 Alertas"}
                                    </button>
                                )}

                                {/* Excel button - blanco sólido */}
                                <button id="btn-excel" onClick={downloadExcel} style={{
                                    background: "white", color: "#667eea", fontWeight: "700",
                                    border: "none", padding: "0.6rem 1.2rem", borderRadius: "0.6rem",
                                    cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)", transition: "all 0.2s"
                                }}>📊 Excel</button>

                                {/* Refresh button - glass */}
                                <button id="btn-refresh" onClick={loadData} title="Actualizar datos" style={{
                                    background: "rgba(255,255,255,0.15)", color: "white", fontWeight: "600",
                                    border: "1.5px solid rgba(255,255,255,0.5)", padding: "0.6rem 0.9rem",
                                    borderRadius: "0.6rem", cursor: "pointer", fontSize: "1rem",
                                    backdropFilter: "blur(4px)", transition: "all 0.2s"
                                }}>🔄</button>
                            </div>

                            <div className="nav-profile" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                {/* User info */}
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                    <span style={{ color: "white", fontSize: "0.875rem", fontWeight: "600" }}>{userFullName || userEmail}</span>
                                    <span style={{
                                        fontSize: "0.7rem", fontWeight: "700", padding: "0.1rem 0.5rem",
                                        borderRadius: "999px", marginTop: "0.2rem",
                                        background: isAdmin ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.15)",
                                        color: isAdmin ? "#ffd700" : "rgba(255,255,255,0.9)",
                                        border: isAdmin ? "1px solid rgba(255,215,0,0.6)" : "1px solid rgba(255,255,255,0.3)"
                                    }}>
                                        {isAdmin ? "👑 ADMIN" : "👤 OPERADOR"}
                                    </span>
                                </div>

                                {/* Logout button - rojo suave */}
                                <button id="btn-logout" onClick={logout} style={{
                                    background: "rgba(239,68,68,0.85)", color: "white", fontWeight: "600",
                                    border: "1.5px solid rgba(239,68,68,0.5)", padding: "0.6rem 1.1rem",
                                    borderRadius: "0.6rem", cursor: "pointer", fontSize: "0.875rem",
                                    backdropFilter: "blur(4px)", transition: "all 0.2s"
                                }}>🚪 Salir</button>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Toast de mensajes */}
                {message.text && (
                    <div style={{ position: "fixed", top: "6rem", right: "1rem", zIndex: 9999, padding: "1rem 1.5rem", borderRadius: "0.75rem", background: message.type === "success" ? "#10b981" : message.type === "danger" ? "#ef4444" : "#6366f1", color: "white", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", animation: "slideInRight 0.3s ease-out", maxWidth: "350px" }}>
                        {message.text}
                    </div>
                )}

                <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem" }}>

                    {/* Panel de alertas elegante */}
                    {hasAlerts && (
                        <div style={{
                            background: "rgba(245, 158, 11, 0.05)",
                            borderLeft: "6px solid #f59e0b",
                            borderRadius: "1rem",
                            padding: "1.5rem",
                            marginBottom: "2rem",
                            boxShadow: "0 4px 15px rgba(245, 158, 11, 0.08)",
                            borderTop: "1px solid rgba(245, 158, 11, 0.1)",
                            borderRight: "1px solid rgba(245, 158, 11, 0.1)",
                            borderBottom: "1px solid rgba(245, 158, 11, 0.1)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                                <div style={{ background: "#f59e0b", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>⚠️</div>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#92400e", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Alertas Prioritarias</h3>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                                {vencidosCount > 0 && (
                                    <div style={{ background: "white", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #fee2e2", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                        <div style={{ fontSize: "1.5rem" }}>🚫</div>
                                        <div>
                                            <div style={{ fontSize: "0.7rem", fontWeight: "800", color: "#ef4444", textTransform: "uppercase" }}>Vencidos</div>
                                            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1e293b" }}>{vencidosCount}</div>
                                        </div>
                                    </div>
                                )}
                                {porVencerCount > 0 && (
                                    <div style={{ background: "white", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #fef3c7", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                        <div style={{ fontSize: "1.5rem" }}>⏳</div>
                                        <div>
                                            <div style={{ fontSize: "0.7rem", fontWeight: "800", color: "#f59e0b", textTransform: "uppercase" }}>Por Vencer</div>
                                            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1e293b" }}>{porVencerCount}</div>
                                        </div>
                                    </div>
                                )}
                                {stockBajoCount > 0 && (
                                    <div style={{ background: "white", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #e0f2fe", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                        <div style={{ fontSize: "1.5rem" }}>📉</div>
                                        <div>
                                            <div style={{ fontSize: "0.7rem", fontWeight: "800", color: "#0ea5e9", textTransform: "uppercase" }}>Stock Bajo</div>
                                            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1e293b" }}>{stockBajoCount}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                        {[
                            { label: "Medicamentos", value: products.filter(p => p.category === "Medicamento").length, gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", icon: "💊" },
                            { label: "Cosméticos", value: products.filter(p => p.category === "Cosmético").length, gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)", icon: "💄" },
                            { label: "Disp. Médicos", value: products.filter(p => p.category === "Dispositivo Médico").length, gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)", icon: "⚕️" },
                            { label: "Por Vencer", value: porVencerCount, gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", icon: "⚠️" },
                            { label: "Vencidos", value: vencidosCount, gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", icon: "🚫" }
                        ].map((stat, idx) => (
                            <div key={idx} className="card" style={{ background: stat.gradient, color: "white", border: "none" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <p style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.5rem" }}>{stat.label}</p>
                                        <h3 style={{ fontSize: "2.5rem", fontWeight: "700", margin: 0 }}>{stat.value}</h3>
                                    </div>
                                    <span style={{ fontSize: "2.5rem" }}>{stat.icon}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div style={{ background: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                        {/* Modern Pill Tabs */}
                        <div className="tabs-scroll" style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: "1px solid #e2e8f0", padding: "0.25rem", background: "#f8fafc", borderRadius: "0.75rem", width: "100%", overflowX: "auto", overflowY: "hidden", whiteSpace: "nowrap" }}>
                            {[
                                { id: "products", label: "Productos", icon: "📦", count: products.length },
                                { id: "lots", label: "Lotes FEFO", icon: "🏷️", count: lots.length },
                                { id: "movements", label: "Movimientos", icon: "📋", count: movements.length },
                                ...(isAdmin ? [{ id: "users", label: "Usuarios", icon: "👥", count: users.length }] : []),
                                ...(isSuperAdmin ? [{ id: "empresas", label: "Empresas", icon: "🏢", count: empresas.length }] : [])
                            ].map(t => (
                                <button
                                    key={t.id}
                                    id={`tab-${t.id}`}
                                    onClick={() => setActiveTab(t.id)}
                                    style={{
                                        padding: "0.6rem 1.25rem",
                                        background: activeTab === t.id ? "white" : "transparent",
                                        border: "none",
                                        borderRadius: "0.6rem",
                                        color: activeTab === t.id ? "#4f46e5" : "#64748b",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.6rem",
                                        boxShadow: activeTab === t.id ? "0 4px 10px rgba(79, 70, 229, 0.15)" : "none",
                                        fontSize: "0.9rem"
                                    }}
                                >
                                    <span style={{ opacity: activeTab === t.id ? 1 : 0.6 }}>{t.icon}</span>
                                    {t.label}
                                    <span style={{
                                        fontSize: "0.75rem",
                                        padding: "0.1rem 0.5rem",
                                        borderRadius: "999px",
                                        background: activeTab === t.id ? "#4f46e5" : "#e2e8f0",
                                        color: activeTab === t.id ? "white" : "#64748b",
                                        marginLeft: "0.25rem"
                                    }}>
                                        {t.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Tab: Productos */}
                        {activeTab === "products" && <ProductsTab />}

                        {/* Tab: Lotes */}
                        {activeTab === "lots" && <LotsTab />}

                        {/* Tab: Movimientos */}
                        {activeTab === "movements" && <MovementsTab />}

                        {/* Tab: Empresas (solo ADMIN) */}
                        {activeTab === "empresas" && isSuperAdmin && <EmpresasTab />}

                        {/* Tab: Usuarios (solo ADMIN) */}
                        {activeTab === "users" && isAdmin && <UsersTab />}
                    </div>
                </div>
                {/* Modal: Producto */}
                {showProductForm && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => { setShowProductForm(false); setEditingProduct(null); setNewProduct(INITIAL_PRODUCT); }}>
                        <div className="card" style={{ maxWidth: "500px", width: "100%", animation: "slideUp 0.3s ease-out" }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginBottom: "1.5rem" }}>{editingProduct ? "✏️ Editar Producto" : "📦 Nuevo Producto"}</h2>
                            <form onSubmit={saveProduct}>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Nombre *</label>
                                    <input id="product-name" className="input" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required autoFocus />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Categoría</label>
                                    <select id="product-category" className="input" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                                        <option value="Medicamento">Medicamento</option>
                                        <option value="Cosmético">Cosmético</option>
                                        <option value="Dispositivo Médico">Dispositivo Médico</option>
                                        <option value="Insumo">Insumo / Otros</option>
                                    </select>
                                </div>
                                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Presentación Comercial</label>
                                        <input className="input" value={newProduct.presentacion || ""} onChange={e => setNewProduct({ ...newProduct, presentacion: e.target.value })} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Registro Sanitario / Permiso Vigente</label>
                                        <input className="input" value={newProduct.registro_sanitario || ""} onChange={e => setNewProduct({ ...newProduct, registro_sanitario: e.target.value })} />
                                    </div>
                                </div>
                                {/* Marca y Laboratorio — aplica a todas las categorías */}
                                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Marca Comercial</label>
                                        <input className="input" placeholder="Ej: Tylenol, Neutrogena, BD" value={newProduct.marca || ""} onChange={e => setNewProduct({ ...newProduct, marca: e.target.value })} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Laboratorio / Fabricante</label>
                                        <input className="input" placeholder="Ej: Pfizer, Bayer, Genfar" value={newProduct.laboratorio || ""} onChange={e => setNewProduct({ ...newProduct, laboratorio: e.target.value })} />
                                    </div>
                                </div>
                                {newProduct.category === "Medicamento" && (
                                    <>
                                        <div style={{ marginBottom: "1rem" }}>
                                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Principio Activo</label>
                                            <input className="input" value={newProduct.principio_activo || ""} onChange={e => setNewProduct({ ...newProduct, principio_activo: e.target.value })} />
                                        </div>
                                        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Forma Farmacéutica</label>
                                                <input className="input" value={newProduct.forma_farmaceutica || ""} onChange={e => setNewProduct({ ...newProduct, forma_farmaceutica: e.target.value })} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Concentración</label>
                                                <input className="input" value={newProduct.concentracion || ""} onChange={e => setNewProduct({ ...newProduct, concentracion: e.target.value })} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {newProduct.category === "Cosmético" && (
                                    <>
                                        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Vida Útil</label>
                                                <input className="input" value={newProduct.vida_util || ""} onChange={e => setNewProduct({ ...newProduct, vida_util: e.target.value })} placeholder="Ej: 12 meses" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {newProduct.category === "Dispositivo Médico" && (
                                    <>
                                        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Clasificación por Riesgo</label>
                                                <input className="input" value={newProduct.clasificacion_riesgo || ""} onChange={e => setNewProduct({ ...newProduct, clasificacion_riesgo: e.target.value })} placeholder="Ej: I, IIa, IIb, III" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Vida Útil (Si aplica)</label>
                                                <input className="input" value={newProduct.vida_util || ""} onChange={e => setNewProduct({ ...newProduct, vida_util: e.target.value })} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Unidad de Medida / Concentración</label>
                                        <select className="input" value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}>
                                            <option value="unidad">Unidad</option>
                                            <option value="caja">Caja</option>
                                            <option value="paquete">Paquete</option>
                                            <option value="ml">Mililitros (ml)</option>
                                            <option value="l">Litros (L)</option>
                                            <option value="gramos">Gramos (g)</option>
                                            <option value="mg">Miligramos (mg)</option>
                                            <option value="mcg">Microgramos (mcg)</option>
                                            <option value="ampolla">Ampolla</option>
                                            <option value="frasco">Frasco</option>
                                            <option value="vial">Vial</option>
                                            <option value="tubo">Tubo</option>
                                            <option value="tableta">Tableta</option>
                                            <option value="capsula">Cápsula</option>
                                            <option value="ui">Unidades Internacionales (UI)</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Stock Mínimo</label>
                                        <input id="product-min-stock" type="number" min="0" className="input" value={newProduct.min_stock} onChange={e => setNewProduct({ ...newProduct, min_stock: parseInt(e.target.value) || 0 })} />
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                    <button type="button" className="btn-secondary" onClick={() => { setShowProductForm(false); setEditingProduct(null); setNewProduct(INITIAL_PRODUCT); }}>Cancelar</button>
                                    <button id="submit-product" type="submit" className="btn-primary">{editingProduct ? "Guardar" : "Crear"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Lote */}
                {showLotForm && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => { setShowLotForm(false); setEditingLot(null); setNewLot(INITIAL_LOT); }}>
                        <div className="card" style={{ maxWidth: "500px", width: "100%", animation: "slideUp 0.3s ease-out", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginBottom: "1.5rem" }}>{editingLot ? "✏️ Editar Lote" : "🏷️ Nuevo Lote"}</h2>
                            <form onSubmit={saveLot}>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Producto *</label>
                                    <select id="lot-product" className="input" value={newLot.product_id} onChange={e => setNewLot({ ...newLot, product_id: e.target.value })} required disabled={editingLot}>
                                        <option value="">Seleccionar</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Factura Nº</label>
                                    <input className="input" value={newLot.factura} onChange={e => setNewLot({ ...newLot, factura: e.target.value })} />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Nombre del Proveedor</label>
                                    <input className="input" placeholder="Ej: Distribuidora Médica S.A." value={newLot.proveedor} onChange={e => setNewLot({ ...newLot, proveedor: e.target.value })} />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Fecha de Recepción (Compra)</label>
                                    <input type="date" className="input" value={newLot.fecha_recepcion} onChange={e => setNewLot({ ...newLot, fecha_recepcion: e.target.value })} />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Nº de Lote (o Serie) *</label>
                                    <input id="lot-number" className="input" value={newLot.lot_number} onChange={e => setNewLot({ ...newLot, lot_number: e.target.value })} required />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Fecha Vencimiento *</label>
                                    <input id="lot-expiry" type="date" className="input" value={newLot.expiry_date} min={new Date().toISOString().split("T")[0]} onChange={e => setNewLot({ ...newLot, expiry_date: e.target.value })} required />
                                </div>
                                {!editingLot && (
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Cantidad Recibida (Stock Inicial) *</label>
                                        <input id="lot-qty" type="number" min="1" className="input" value={newLot.qty_initial} onChange={e => setNewLot({ ...newLot, qty_initial: parseInt(e.target.value) || 1 })} required />
                                    </div>
                                )}
                                {editingLot && (
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Stock Actual</label>
                                        <input id="lot-qty-current" type="number" min="0" className="input" value={newLot.qty_current} onChange={e => setNewLot({ ...newLot, qty_current: parseInt(e.target.value) || 0 })} required />
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Estado de Recepción</label>
                                        <select className="input" value={newLot.estado_recepcion} onChange={e => setNewLot({ ...newLot, estado_recepcion: e.target.value })}>
                                            <option value="Aceptado">✅ Aceptado</option>
                                            <option value="Rechazado">❌ Rechazado</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Costo Unitario (Opcional)</label>
                                        <input id="lot-cost" type="number" min="0" step="0.01" className="input" value={newLot.unit_cost} onChange={e => setNewLot({ ...newLot, unit_cost: e.target.value })} />
                                    </div>
                                </div>
                                {newLot.estado_recepcion === "Rechazado" && (
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#dc2626" }}>Causas del Rechazo *</label>
                                        <textarea className="input" rows={2} value={newLot.causas_rechazo} onChange={e => setNewLot({ ...newLot, causas_rechazo: e.target.value })} required />
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                    <button type="button" className="btn-secondary" onClick={() => { setShowLotForm(false); setEditingLot(null); setNewLot(INITIAL_LOT); }}>Cancelar</button>
                                    <button id="submit-lot" type="submit" className="btn-primary" disabled={newLot.estado_recepcion === "Rechazado" && !newLot.causas_rechazo}>{editingLot ? "Guardar" : "Crear"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Nuevo Movimiento */}
                {showMovementForm && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => setShowMovementForm(false)}>
                        <div className="card" style={{ maxWidth: "500px", width: "100%", animation: "slideUp 0.3s ease-out", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginBottom: "1.5rem" }}>Registrar Movimiento</h2>
                            <form onSubmit={createMovement}>
                                {/* Escáner oculto a petición del usuario, no eliminar */}
                                <div style={{ marginBottom: "1rem", display: "none" }}>
                                    <button type="button" className="btn-secondary" onClick={() => { setScannerContext("movement"); setShowScanner(true); }} style={{ width: "100%" }}>
                                        📷 Escanear QR/Código
                                    </button>
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Tipo *</label>
                                    <select id="movement-type" value={newMovement.type} onChange={e => setNewMovement({ ...newMovement, type: e.target.value })} className="input" required>
                                        <option value="SALIDA">📤 Salida</option>
                                        <option value="MERMA">🗑️ Merma</option>
                                        <option value="AJUSTE">⚙️ Ajuste Especial</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Producto *</label>
                                    <select id="movement-product" className="input" value={newMovement.product_id} onChange={e => setNewMovement({ ...newMovement, product_id: e.target.value, lot_id: "" })} required>
                                        <option value="">Seleccionar</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                {newMovement.product_id && (
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Lote * (FEFO: más viejo primero)</label>
                                        <select id="movement-lot" className="input" value={newMovement.lot_id} onChange={e => setNewMovement({ ...newMovement, lot_id: e.target.value })} required>
                                            <option value="">Seleccionar</option>
                                            {(() => {
                                                const oldestExpiry = lotsForMovement.length > 0 ? lotsForMovement[0].expiry_date : null;
                                                return lotsForMovement.map(l => {
                                                    const status = getLotExpiryStatus(l.expiry_date);
                                                    const isStrictFEFO = newMovement.type === "SALIDA";
                                                    const isNotOldest = isStrictFEFO && oldestExpiry && new Date(l.expiry_date + "T12:00:00") > new Date(oldestExpiry + "T12:00:00");
                                                    return (
                                                        <option key={l.id} value={l.id} disabled={isNotOldest}>
                                                            {l.lot_number} — Vence: {new Date(l.expiry_date + "T12:00:00").toLocaleDateString("es")} ({status.label}) — Stock: {l.qty_current} {isNotOldest ? " (⚠️ Solo FEFO disponible)" : ""}
                                                        </option>
                                                    );
                                                });
                                            })()}
                                        </select>
                                        {lotsForMovement.length === 0 && (
                                            <p style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: "0.5rem" }}>⚠️ No hay lotes con stock disponible</p>
                                        )}
                                    </div>
                                )}
                                {selectedLot && getLotExpiryStatus(selectedLot.expiry_date).status === "vencido" && (
                                    <div style={{ padding: "0.75rem", background: "#fef2f2", color: "#ef4444", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                                        🔴 LOTE VENCIDO — No se puede usar para SALIDA
                                    </div>
                                )}
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Cantidad *</label>
                                    <input id="movement-qty" type="number" min="1" className="input" value={newMovement.qty} onChange={e => setNewMovement({ ...newMovement, qty: parseInt(e.target.value) || 1 })} required />
                                    {selectedLot && newMovement.qty > selectedLot.qty_current && newMovement.type !== "AJUSTE" && (
                                        <p style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: "0.25rem" }}>
                                            ⚠️ Supera el stock disponible ({selectedLot.qty_current})
                                        </p>
                                    )}
                                </div>
                                {(newMovement.type === "SALIDA" || newMovement.type === "MERMA") && (
                                    <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1rem", border: "1px solid #e2e8f0" }}>
                                        <h4 style={{ margin: "0 0 0.75rem", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>🏥 Trazabilidad Médica (Opcional)</h4>
                                        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                                            <div>
                                                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>Paciente</label>
                                                <input className="input" style={{ padding: "0.6rem", fontSize: "0.85rem" }} value={newMovement.patient} onChange={e => setNewMovement({ ...newMovement, patient: e.target.value })} placeholder="Nombre / CI" />
                                            </div>
                                            <div>
                                                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>Médico autoriza</label>
                                                <input className="input" style={{ padding: "0.6rem", fontSize: "0.85rem" }} value={newMovement.doctor} onChange={e => setNewMovement({ ...newMovement, doctor: e.target.value })} placeholder="Dr. Responsable" />
                                            </div>
                                            <div>
                                                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>Sala/Destino</label>
                                                <input className="input" style={{ padding: "0.6rem", fontSize: "0.85rem" }} value={newMovement.destination} onChange={e => setNewMovement({ ...newMovement, destination: e.target.value })} placeholder="Ej: UCI Cama 4" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>{newMovement.type === 'AJUSTE' ? 'Motivo del Ajuste *' : 'Notas adicionales'}</label>
                                    <input id="movement-reason" className="input" value={newMovement.reason} onChange={e => setNewMovement({ ...newMovement, reason: e.target.value })} placeholder="Observaciones generales..." required={newMovement.type === 'AJUSTE'} />
                                </div>
                                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                    <button type="button" className="btn-secondary" onClick={() => { setShowMovementForm(false); setNewMovement({ type: "SALIDA", product_id: "", lot_id: "", qty: 1, reason: "", patient: "", doctor: "", destination: "" }); }}>Cancelar</button>
                                    <button id="submit-movement" type="submit" className="btn-primary">Registrar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Formulario Usuario */}
                {showUserForm && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => { setShowUserForm(false); setEditingUser(null); }}>
                        <div className="card" style={{ maxWidth: "500px", width: "100%", animation: "slideUp 0.3s ease-out", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginTop: 0 }}>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h2>
                            <form onSubmit={editingUser ? (e) => {
                                e.preventDefault();
                                const payload = { full_name: newUser.full_name, role: newUser.role, email: newUser.email };
                                if (newUser.password) payload.password = newUser.password;
                                updateUserRole(editingUser.id, payload);
                            } : createUser}>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem" }}>Nombre Completo</label>
                                    <input className="input" value={newUser.full_name || ""} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Ej: Juan Pérez" />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem" }}>Email *</label>
                                    <input type="email" className="input" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required disabled={!!editingUser} />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem" }}>Contraseña {editingUser ? "(Dejar en blanco para no cambiar)" : "*"}</label>
                                    <input type="password" className="input" value={newUser.password || ""} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required={!editingUser} />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem" }}>Rol</label>
                                    <select className="input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                        <option value="OPERADOR">👤 Operador</option>
                                        <option value="ADMIN">👑 Admin de Empresa</option>
                                        {isSuperAdmin && <option value="SUPERADMIN">🔱 Super Admin</option>}
                                    </select>
                                </div>
                                {isSuperAdmin && !editingUser && (
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem" }}>🏢 Asignar a Empresa <span style={{ color: "#ef4444" }}>*</span></label>
                                        <select className="input" value={newUser.empresa_id || ""} onChange={e => setNewUser({ ...newUser, empresa_id: e.target.value })} required>
                                            <option value="">-- Seleccionar empresa --</option>
                                            {empresas.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.plan})</option>
                                            ))}
                                        </select>
                                        <p style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.3rem" }}>El usuario solo verá el inventario de esta empresa.</p>
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                    <button type="button" className="btn-secondary" onClick={() => { setShowUserForm(false); setEditingUser(null); }}>Cancelar</button>
                                    <button type="submit" className="btn-primary">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Formulario Empresa */}
                {showEmpresaForm && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => setShowEmpresaForm(false)}>
                        <div className="card" style={{ maxWidth: "450px", width: "100%", animation: "slideUp 0.3s ease-out" }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginTop: 0 }}>Nueva Clínica / Empresa</h2>
                            <form onSubmit={createEmpresa}>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem" }}>Nombre del Comercio *</label>
                                    <input className="input" value={newEmpresa.nombre} onChange={e => setNewEmpresa({ ...newEmpresa, nombre: e.target.value })} placeholder="Ej: Clínica Los Alpes" required />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem" }}>Plan</label>
                                    <select className="input" value={newEmpresa.plan} onChange={e => setNewEmpresa({ ...newEmpresa, plan: e.target.value })}>
                                        <option value="FREE">Gatuito (FREE)</option>
                                        <option value="PREMIUM">Premium</option>
                                        <option value="ENTERPRISE">Enterprise</option>
                                    </select>
                                </div>
                                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                    <button type="button" className="btn-secondary" onClick={() => setShowEmpresaForm(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary">Registrar Empresa</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

                {/* Modal de confirmación personalizado */}
                {confirmModal.show && (
                    <div style={{
                        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 9999, padding: "1rem", backdropFilter: "blur(4px)"
                    }}>
                        <div style={{
                            background: "white", borderRadius: "1rem", padding: "2rem",
                            maxWidth: "420px", width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
                            animation: "slideUp 0.2s ease-out"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                                <div style={{
                                    width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
                                    background: confirmModal.danger ? "#fee2e2" : "#dbeafe",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "1.4rem"
                                }}>
                                    {confirmModal.danger ? "🗑️" : "❓"}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#1e293b" }}>Confirmar acción</h3>
                                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", color: "#64748b", lineHeight: 1.5 }}>
                                        {confirmModal.message}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                                <button
                                    onClick={() => setConfirmModal({ show: false, message: "", onConfirm: null })}
                                    style={{
                                        padding: "0.6rem 1.25rem", borderRadius: "0.6rem", border: "1.5px solid #e2e8f0",
                                        background: "white", color: "#475569", fontWeight: "600", cursor: "pointer",
                                        fontSize: "0.9rem", transition: "all 0.15s"
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirmModal.onConfirm) confirmModal.onConfirm();
                                        setConfirmModal({ show: false, message: "", onConfirm: null });
                                    }}
                                    style={{
                                        padding: "0.6rem 1.25rem", borderRadius: "0.6rem", border: "none",
                                        background: confirmModal.danger ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                                        color: "white", fontWeight: "700", cursor: "pointer",
                                        fontSize: "0.9rem", boxShadow: confirmModal.danger ? "0 4px 12px rgba(239,68,68,0.4)" : "0 4px 12px rgba(99,102,241,0.4)",
                                        transition: "all 0.15s"
                                    }}
                                >
                                    {confirmModal.danger ? "Sí, eliminar" : "Confirmar"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardContext.Provider>
    );
}
