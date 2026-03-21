"use client";
import { useEffect, useState, useCallback } from "react";
import BarcodeScanner from "../components/BarcodeScanner";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

    const [newProduct, setNewProduct] = useState({
        name: "", category: "Insumo", unit: "unidad", min_stock: 2, barcode: ""
    });

    const [newLot, setNewLot] = useState({
        product_id: "", lot_number: "", barcode: "", expiry_date: "", unit_cost: 0, qty_initial: 1
    });

    const [newMovement, setNewMovement] = useState({
        type: "SALIDA", product_id: "", lot_id: "", qty: 1, reason: ""
    });

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

    const isAdmin = userRole === "ADMIN";

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
    }, []);

    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [pRes, lRes, mRes] = await Promise.all([
                fetch(`${API}/products?limit=500`, { headers }),
                fetch(`${API}/lots?limit=500`, { headers }),
                fetch(`${API}/movements?limit=500`, { headers }),
            ]);

            if ([pRes, lRes, mRes].some(r => r.status === 401)) {
                logout();
                return;
            }

            const [ps, ls, ms] = await Promise.all([pRes.json(), lRes.json(), mRes.json()]);
            setProducts(ps);
            setLots(ls);
            setMovements(ms);

            // Cargar usuarios solo si es admin
            const role = localStorage.getItem("user_role");
            if (role === "ADMIN") {
                const uRes = await fetch(`${API}/users`, { headers });
                if (uRes.ok) setUsers(await uRes.json());
            }
        } catch {
            showMessage("Error cargando datos. Verifica la conexión.", "danger");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) loadData();
    }, [token, loadData]);

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
                setNewProduct({ name: "", category: "Insumo", unit: "unidad", min_stock: 2, barcode: "" });
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
                setNewLot({ product_id: "", lot_number: "", barcode: "", expiry_date: "", unit_cost: 0, qty_initial: 1 });
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
                })
            });
            if (res.ok) {
                const data = await res.json();
                showMessage(`✅ Movimiento registrado. Stock actual: ${data.qty_current}`, "success");
                setShowMovementForm(false);
                setNewMovement({ type: "SALIDA", product_id: "", lot_id: "", qty: 1, reason: "" });
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
        setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    }

    // ── Cálculos de alertas ───────────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const vencidosCount = lots.filter(l => new Date(l.expiry_date) < today).length;
    const porVencerCount = lots.filter(l => {
        const exp = new Date(l.expiry_date);
        const days = Math.floor((exp - today) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 30;
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

    // ── Filtros ───────────────────────────────────────────────────────────────
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchProducts.toLowerCase()) ||
            (p.barcode && p.barcode.includes(searchProducts));
        const matchesCategory = !filterCategory || p.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const filteredLots = lots.filter(l => {
        const product = products.find(p => p.id === l.product_id);
        const matchesSearch =
            l.lot_number.toLowerCase().includes(searchLots.toLowerCase()) ||
            (product && product.name.toLowerCase().includes(searchLots.toLowerCase()));
        if (!filterStatus) return matchesSearch;
        const expDate = new Date(l.expiry_date);
        const days = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
        if (filterStatus === "OK") return matchesSearch && days > 30;
        if (filterStatus === "WARNING") return matchesSearch && days >= 0 && days <= 30;
        if (filterStatus === "DANGER") return matchesSearch && days < 0;
        return matchesSearch;
    }).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

    const filteredMovements = movements.filter(m =>
        m.product_name?.toLowerCase().includes(searchMovements.toLowerCase()) ||
        m.lot_number?.toLowerCase().includes(searchMovements.toLowerCase()) ||
        m.user_email?.toLowerCase().includes(searchMovements.toLowerCase()) ||
        m.reason?.toLowerCase().includes(searchMovements.toLowerCase())
    );

    function getLotExpiryStatus(expiryDate) {
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) return { 
            status: "vencido", 
            color: "#ef4444", 
            bg: "#fee2e2",
            label: "🔴 VENCIDO", 
            days: daysUntilExpiry 
        };
        if (daysUntilExpiry <= 7) return { 
            status: "critico", 
            color: "#f97316", 
            bg: "#ffedd5",
            label: `⚠️ ${daysUntilExpiry}d (CRÍTICO)`, 
            days: daysUntilExpiry 
        };
        if (daysUntilExpiry <= 30) return { 
            status: "alerta", 
            color: "#d97706", 
            bg: "#fef3c7",
            label: `⏳ ${daysUntilExpiry}d`, 
            days: daysUntilExpiry 
        };
        return { 
            status: "ok", 
            color: "#059669", 
            bg: "#d1fae5",
            label: `✓ ${daysUntilExpiry}d`, 
            days: daysUntilExpiry 
        };
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
            {/* Navbar */}
            <nav style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "1rem 2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
                <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "2rem" }}>🏥</span>
                        <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: "700", margin: 0 }}>Inventario Clínica</h1>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
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
                                        <div style={{ fontSize: "0.7rem", fontWeight: "800", color: "#f59e0b", textTransform: "uppercase" }}>Por Vencer (30d)</div>
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
                        { label: "Total Productos", value: products.length, gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", icon: "📦" },
                        { label: "Total Lotes", value: lots.length, gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)", icon: "🏷️" },
                        { label: "Por Vencer (30d)", value: porVencerCount, gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", icon: "⚠️" },
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
                    {/* KPI especial: Valor Total del Inventario */}
                    {(() => {
                        const totalValue = lots.reduce((sum, l) => sum + (l.qty_current * (l.unit_cost || 0)), 0);
                        return (
                            <div className="card" style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", color: "white", border: "none" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <p style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.5rem" }}>Valor Inventario</p>
                                        <h3 style={{ fontSize: "1.6rem", fontWeight: "700", margin: 0 }}>
                                            ${totalValue.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h3>
                                    </div>
                                    <span style={{ fontSize: "2.5rem" }}>💰</span>
                                </div>
                                <p style={{ fontSize: "0.7rem", opacity: 0.75, marginTop: "0.5rem", marginBottom: 0 }}>Stock actual × costo unitario</p>
                            </div>
                        );
                    })()}
                </div>

                {/* Tabs */}
                <div style={{ background: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    {/* Modern Pill Tabs */}
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: "1px solid #e2e8f0", padding: "0.25rem", background: "#f8fafc", borderRadius: "0.75rem", width: "fit-content", marginLeft: "-0.5rem" }}>
                        {[
                            { id: "products", label: "Productos", icon: "📦", count: products.length },
                            { id: "lots", label: "Lotes FEFO", icon: "🏷️", count: lots.length },
                            { id: "movements", label: "Movimientos", icon: "📋", count: movements.length },
                            ...(isAdmin ? [{ id: "users", label: "Usuarios", icon: "👥", count: users.length }] : [])
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
                    {activeTab === "products" && (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                                <input type="text" id="search-products" placeholder="🔍 Buscar producto o código..." value={searchProducts} onChange={e => setSearchProducts(e.target.value)} className="input" style={{ flex: 1, minWidth: "200px" }} />
                                <select id="filter-category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input" style={{ width: "150px" }}>
                                    <option value="">Todas</option>
                                    <option value="Insumo">Insumo</option>
                                    <option value="Medicamento">Medicamento</option>
                                    <option value="Equipo">Equipo</option>
                                    <option value="Material">Material</option>
                                </select>
                                <button id="btn-new-product" onClick={() => setShowProductForm(true)} className="btn-primary">+ Nuevo</button>
                            </div>
                            {loading ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Cargando...</p>
                            ) : filteredProducts.length === 0 ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No hay productos</p>
                            ) : (
                                <div style={{ overflowX: "auto" }}>
                                    <table>
                                        <thead><tr><th>Nombre</th><th>Categoría</th><th>Stock</th><th>Mín</th><th>Estado</th><th>Acciones</th></tr></thead>
                                        <tbody>
                                            {filteredProducts.map(p => {
                                                const totalStock = lots.filter(l => l.product_id === p.id).reduce((sum, l) => sum + l.qty_current, 0);
                                                const isLow = totalStock < p.min_stock;
                                                return (
                                                    <tr key={p.id}>
                                                        <td style={{ fontWeight: "600" }}>{p.name}</td>
                                                        <td>{p.category}</td>
                                                        <td style={{ fontWeight: "600", color: isLow ? "#ef4444" : "#10b981" }}>{totalStock}</td>
                                                        <td>{p.min_stock}</td>
                                                        <td>
                                                            <span style={{ background: isLow ? "#fef2f2" : "#f0fdf4", color: isLow ? "#ef4444" : "#10b981", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "600" }}>
                                                                {isLow ? "⚠️ Bajo" : "✓ OK"}
                                                            </span>
                                                        </td>
                                                        <td style={{ display: "flex", gap: "0.4rem" }}>
                                                            <button onClick={() => { setEditingProduct(p); setNewProduct({ ...p }); setShowProductForm(true); }} style={{ background: "#e0f2fe", color: "#0284c7", border: "none", borderRadius: "0.5rem", padding: "0.375rem 0.625rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "700" }}>✏️ Editar</button>
                                                            <button onClick={() => deleteProduct(p.id)} title="Eliminar producto" style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "0.5rem", padding: "0.375rem 0.625rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "700", transition: "all 0.2s" }}>🗑️ Eliminar</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Lotes */}
                    {activeTab === "lots" && (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                                <input type="text" id="search-lots" placeholder="🔍 Buscar lote o producto..." value={searchLots} onChange={e => setSearchLots(e.target.value)} className="input" style={{ flex: 1, minWidth: "200px" }} />
                                <select id="filter-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input" style={{ width: "160px" }}>
                                    <option value="">Todos</option>
                                    <option value="OK">✓ OK</option>
                                    <option value="WARNING">⚠️ Por vencer</option>
                                    <option value="DANGER">🔴 Vencidos</option>
                                </select>
                                <button id="btn-new-lot" onClick={() => setShowLotForm(true)} className="btn-primary">+ Nuevo</button>
                            </div>
                            {loading ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Cargando...</p>
                            ) : filteredLots.length === 0 ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No hay lotes</p>
                            ) : (
                                <div style={{ overflowX: "auto" }}>
                                    <table>
                                        <thead><tr>
                                            <th>Producto</th>
                                            <th>Nº Lote</th>
                                            <th>Vence</th>
                                            <th style={{ textAlign: "right" }}>Stock</th>
                                            <th style={{ textAlign: "right" }}>Costo Unit.</th>
                                            <th style={{ textAlign: "right" }}>Valor Lote</th>
                                            <th style={{ textAlign: "right" }}>% Usado</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr></thead>
                                        <tbody>
                                            {filteredLots.map(l => {
                                                const product = products.find(p => p.id === l.product_id);
                                                const status = getLotExpiryStatus(l.expiry_date);
                                                const valorLote = l.qty_current * (l.unit_cost || 0);
                                                const pctUsado = l.qty_initial > 0
                                                    ? Math.round(((l.qty_initial - l.qty_current) / l.qty_initial) * 100)
                                                    : 0;
                                                const pctColor = pctUsado >= 90 ? "#ef4444" : pctUsado >= 60 ? "#f59e0b" : "#10b981";
                                                return (
                                                    <tr key={l.id}>
                                                        <td style={{ fontWeight: "600" }}>{product?.name}</td>
                                                        <td style={{ fontFamily: "monospace" }}>{l.lot_number}</td>
                                                        <td>{new Date(l.expiry_date + "T12:00:00").toLocaleDateString("es")}</td>
                                                        <td style={{ textAlign: "right", fontWeight: "700" }}>{l.qty_current}</td>
                                                        <td style={{ textAlign: "right", color: "#475569" }}>
                                                            {l.unit_cost > 0 ? `$${Number(l.unit_cost).toLocaleString("es", { minimumFractionDigits: 2 })}` : <span style={{ color: "#cbd5e1" }}>—</span>}
                                                        </td>
                                                        <td style={{ textAlign: "right", fontWeight: "700", color: valorLote > 0 ? "#0284c7" : "#cbd5e1" }}>
                                                            {valorLote > 0 ? `$${valorLote.toLocaleString("es", { minimumFractionDigits: 2 })}` : "—"}
                                                        </td>
                                                        <td style={{ textAlign: "right" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                                <div style={{ width: "48px", height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                                                                    <div style={{ width: `${pctUsado}%`, height: "100%", background: pctColor, borderRadius: "999px", transition: "width 0.4s" }} />
                                                                </div>
                                                                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: pctColor }}>{pctUsado}%</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span style={{ background: status.bg, color: status.color, padding: "0.375rem 0.85rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "700", border: `1px solid ${status.color}33`, whiteSpace: "nowrap" }}>
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button onClick={() => { setEditingLot(l); setNewLot({ ...l }); setShowLotForm(true); }} style={{ background: "#e0f2fe", color: "#0284c7", border: "none", borderRadius: "0.5rem", padding: "0.375rem 0.625rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "700" }}>✏️ Editar</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* Fila de totales */}
                                        {filteredLots.length > 0 && (() => {
                                            const totalStock = filteredLots.reduce((s, l) => s + l.qty_current, 0);
                                            const totalValor = filteredLots.reduce((s, l) => s + l.qty_current * (l.unit_cost || 0), 0);
                                            return (
                                                <tfoot>
                                                    <tr style={{ background: "#f8fafc", fontWeight: "700", borderTop: "2px solid #e2e8f0" }}>
                                                        <td colSpan={3} style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                            📊 {filteredLots.length} lotes mostrados
                                                        </td>
                                                        <td style={{ textAlign: "right", color: "#1e293b" }}>{totalStock}</td>
                                                        <td></td>
                                                        <td style={{ textAlign: "right", color: "#0284c7" }}>
                                                            ${totalValor.toLocaleString("es", { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td colSpan={3}></td>
                                                    </tr>
                                                </tfoot>
                                            );
                                        })()}
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Movimientos */}
                    {activeTab === "movements" && (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                                <input type="text" id="search-movements" placeholder="🔍 Buscar movimiento..." value={searchMovements} onChange={e => setSearchMovements(e.target.value)} className="input" style={{ flex: 1 }} />
                                <button id="btn-new-movement" onClick={() => setShowMovementForm(true)} className="btn-primary">+ Nuevo</button>
                            </div>
                            {loading ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Cargando...</p>
                            ) : filteredMovements.length === 0 ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No hay movimientos</p>
                            ) : (
                                <div style={{ overflowX: "auto" }}>
                                    <table>
                                        <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Lote</th><th>Cant</th><th>Razón</th><th>Usuario</th></tr></thead>
                                        <tbody>
                                            {filteredMovements.map((m, idx) => {
                                                const typeColors = { "ENTRADA": "#10b981", "SALIDA": "#ef4444", "MERMA": "#f59e0b", "AJUSTE": "#6366f1" };
                                                return (
                                                    <tr key={m.id || idx}>
                                                        <td style={{ fontSize: "0.875rem" }}>{new Date(m.created_at).toLocaleDateString("es")}</td>
                                                        <td>
                                                            <span style={{ background: typeColors[m.type] || "#6b7280", color: "white", padding: "0.25rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "600" }}>
                                                                {m.type}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontWeight: "500" }}>{m.product_name}</td>
                                                        <td style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{m.lot_number}</td>
                                                        <td style={{ fontWeight: "600" }}>{m.qty}</td>
                                                        <td style={{ fontSize: "0.875rem", color: "#6b7280" }}>{m.reason || "—"}</td>
                                                        <td style={{ fontSize: "0.875rem", color: "#6b7280" }}>{m.user_email}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Usuarios (solo ADMIN) */}
                    {activeTab === "users" && isAdmin && (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                                <div>
                                    <h3 style={{ fontWeight: "700", color: "#1f2937", margin: 0 }}>Gestión de Usuarios</h3>
                                    <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>Control de acceso y trazabilidad</p>
                                </div>
                                <button id="btn-new-user" onClick={() => { setShowUserForm(true); setEditingUser(null); setNewUser({ email: "", password: "", full_name: "", role: "OPERADOR" }); }} className="btn-primary">+ Nuevo Usuario</button>
                            </div>

                            {/* Tabla usuarios */}
                            {loading ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Cargando...</p>
                            ) : users.length === 0 ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No hay usuarios</p>
                            ) : (
                                <div style={{ overflowX: "auto" }}>
                                    <table>
                                        <thead><tr>
                                            <th>Nombre</th>
                                            <th>Email</th>
                                            <th>Rol</th>
                                            <th>Estado</th>
                                            <th>Creado</th>
                                            <th>Acciones</th>
                                        </tr></thead>
                                        <tbody>
                                            {users.map(u => (
                                                <tr key={u.id}>
                                                    <td style={{ fontWeight: "600" }}>{u.full_name || "—"}</td>
                                                    <td style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{u.email}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "700",
                                                            background: u.role === "ADMIN" ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                                            color: "white"
                                                        }}>
                                                            {u.role === "ADMIN" ? "👑 ADMIN" : "👤 OPERADOR"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "600",
                                                            background: u.is_active ? "#d1fae5" : "#fee2e2",
                                                            color: u.is_active ? "#065f46" : "#991b1b"
                                                        }}>
                                                            {u.is_active ? "✓ Activo" : "✗ Inactivo"}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                                        {new Date(u.created_at).toLocaleDateString("es")}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                                            <button
                                                                title="Editar usuario"
                                                                onClick={() => { setEditingUser(u); setNewUser({ email: u.email, password: "", full_name: u.full_name || "", role: u.role }); setShowUserForm(true); }}
                                                                style={{ background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: "0.5rem", padding: "0.375rem 0.75rem", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem" }}
                                                            >✏️ Editar</button>
                                                            {u.email !== userEmail && (
                                                                <>
                                                                    <button
                                                                        title={u.is_active ? "Desactivar" : "Activar"}
                                                                        onClick={() => updateUserRole(u.id, { is_active: u.is_active ? 0 : 1 })}
                                                                        style={{ background: u.is_active ? "#fef3c7" : "#d1fae5", color: u.is_active ? "#92400e" : "#065f46", border: "none", borderRadius: "0.5rem", padding: "0.375rem 0.75rem", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem" }}
                                                                    >{u.is_active ? "🔒 Desactivar" : "🔓 Activar"}</button>
                                                                    <button
                                                                        title="Eliminar usuario"
                                                                        onClick={() => deleteUser(u.id, u.email)}
                                                                        style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "0.5rem", padding: "0.375rem 0.75rem", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem" }}
                                                                    >🗑️</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Modal: Crear/Editar usuario */}
                            {showUserForm && (
                                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => setShowUserForm(false)}>
                                    <div className="card" style={{ maxWidth: "480px", width: "100%", animation: "slideUp 0.3s ease-out" }} onClick={e => e.stopPropagation()}>
                                        <h2 style={{ marginBottom: "1.5rem" }}>{editingUser ? "✏️ Editar Usuario" : "👤 Nuevo Usuario"}</h2>
                                        <form onSubmit={editingUser
                                            ? (e) => { e.preventDefault(); updateUserRole(editingUser.id, { full_name: newUser.full_name, role: newUser.role, password: newUser.password || undefined }); }
                                            : createUser
                                        }>
                                            {!editingUser && (
                                                <div style={{ marginBottom: "1rem" }}>
                                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Email *</label>
                                                    <input id="user-email" type="email" className="input" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required autoFocus />
                                                </div>
                                            )}
                                            <div style={{ marginBottom: "1rem" }}>
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Nombre completo</label>
                                                <input id="user-fullname" className="input" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Ej: María López" />
                                            </div>
                                            <div style={{ marginBottom: "1rem" }}>
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                                                    {editingUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
                                                </label>
                                                <input id="user-password" type="password" className="input" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required={!editingUser} placeholder={editingUser ? "••••••• (opcional)" : "Mínimo 6 caracteres"} />
                                            </div>
                                            <div style={{ marginBottom: "1.5rem" }}>
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Rol</label>
                                                <select id="user-role" className="input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                                    <option value="OPERADOR">👤 Operador — puede ver y registrar movimientos</option>
                                                    <option value="ADMIN">👑 Administrador — acceso total, gestión de usuarios</option>
                                                </select>
                                            </div>
                                            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                                <button type="button" className="btn-secondary" onClick={() => { setShowUserForm(false); setEditingUser(null); }}>Cancelar</button>
                                                <button id="submit-user" type="submit" className="btn-primary">{editingUser ? "Guardar Cambios" : "Crear Usuario"}</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Producto */}
            {showProductForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => { setShowProductForm(false); setEditingProduct(null); setNewProduct({ name: "", category: "Insumo", unit: "unidad", min_stock: 2, barcode: "" }); }}>
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
                                    <option value="Insumo">Insumo</option>
                                    <option value="Medicamento">Medicamento</option>
                                    <option value="Equipo">Equipo</option>
                                    <option value="Material">Material</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Unidad</label>
                                <select id="product-unit" className="input" value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}>
                                    <option value="unidad">Unidad</option>
                                    <option value="caja">Caja</option>
                                    <option value="ml">ML</option>
                                    <option value="gramos">Gramos</option>
                                    <option value="ampolla">Ampolla</option>
                                    <option value="frasco">Frasco</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Stock Mínimo</label>
                                <input id="product-min-stock" type="number" min="0" className="input" value={newProduct.min_stock} onChange={e => setNewProduct({ ...newProduct, min_stock: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                <button type="button" className="btn-secondary" onClick={() => { setShowProductForm(false); setEditingProduct(null); setNewProduct({ name: "", category: "Insumo", unit: "unidad", min_stock: 2, barcode: "" }); }}>Cancelar</button>
                                <button id="submit-product" type="submit" className="btn-primary">{editingProduct ? "Guardar" : "Crear"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Lote */}
            {showLotForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => { setShowLotForm(false); setEditingLot(null); setNewLot({ product_id: "", lot_number: "", barcode: "", expiry_date: "", unit_cost: 0, qty_initial: 1 }); }}>
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
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Nº Lote *</label>
                                <input id="lot-number" className="input" value={newLot.lot_number} onChange={e => setNewLot({ ...newLot, lot_number: e.target.value })} required />
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Fecha Vencimiento *</label>
                                <input id="lot-expiry" type="date" className="input" value={newLot.expiry_date} min={new Date().toISOString().split("T")[0]} onChange={e => setNewLot({ ...newLot, expiry_date: e.target.value })} required />
                            </div>
                            {!editingLot && (
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Cantidad Inicial *</label>
                                    <input id="lot-qty" type="number" min="1" className="input" value={newLot.qty_initial} onChange={e => setNewLot({ ...newLot, qty_initial: parseInt(e.target.value) || 1 })} required />
                                </div>
                            )}
                            {editingLot && (
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Stock Actual</label>
                                    <input id="lot-qty-current" type="number" min="0" className="input" value={newLot.qty_current} onChange={e => setNewLot({ ...newLot, qty_current: parseInt(e.target.value) || 0 })} required />
                                </div>
                            )}
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Costo Unitario</label>
                                <input id="lot-cost" type="number" min="0" step="0.01" className="input" value={newLot.unit_cost} onChange={e => setNewLot({ ...newLot, unit_cost: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Código QR/Barras</label>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <input id="lot-barcode" className="input" value={newLot.barcode} onChange={e => setNewLot({ ...newLot, barcode: e.target.value })} style={{ flex: 1 }} />
                                    <button type="button" className="btn-secondary" onClick={() => { setScannerContext("lot"); setShowScanner(true); }}>📷</button>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                <button type="button" className="btn-secondary" onClick={() => { setShowLotForm(false); setEditingLot(null); setNewLot({ product_id: "", lot_number: "", barcode: "", expiry_date: "", unit_cost: 0, qty_initial: 1 }); }}>Cancelar</button>
                                <button id="submit-lot" type="submit" className="btn-primary">{editingLot ? "Guardar" : "Crear"}</button>
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
                            <div style={{ marginBottom: "1rem" }}>
                                <button type="button" className="btn-secondary" onClick={() => { setScannerContext("movement"); setShowScanner(true); }} style={{ width: "100%" }}>
                                    📷 Escanear QR/Código
                                </button>
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Tipo *</label>
                                <select id="movement-type" className="input" value={newMovement.type} onChange={e => setNewMovement({ ...newMovement, type: e.target.value })}>
                                    <option value="ENTRADA">📥 Entrada</option>
                                    <option value="SALIDA">📤 Salida</option>
                                    <option value="MERMA">⚠️ Merma</option>
                                    <option value="AJUSTE">🔧 Ajuste</option>
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
                                        {lotsForMovement.map(l => {
                                            const status = getLotExpiryStatus(l.expiry_date);
                                            return (
                                                <option key={l.id} value={l.id}>
                                                    {l.lot_number} — Vence: {new Date(l.expiry_date + "T12:00:00").toLocaleDateString("es")} ({status.label}) — Stock: {l.qty_current}
                                                </option>
                                            );
                                        })}
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
                                {selectedLot && newMovement.qty > selectedLot.qty_current && newMovement.type !== "ENTRADA" && (
                                    <p style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: "0.25rem" }}>
                                        ⚠️ Supera el stock disponible ({selectedLot.qty_current})
                                    </p>
                                )}
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Razón</label>
                                <input id="movement-reason" className="input" value={newMovement.reason} onChange={e => setNewMovement({ ...newMovement, reason: e.target.value })} placeholder="Opcional" />
                            </div>
                            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowMovementForm(false)}>Cancelar</button>
                                <button id="submit-movement" type="submit" className="btn-primary">Registrar</button>
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
    );
}
