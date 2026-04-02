"use client";
import { useDashboard } from "../../dashboard/DashboardContext";

export default function ProductsTab() {
    const {
        products, lots, filteredProducts,
        searchProducts, setSearchProducts,
        filterCategory, setFilterCategory,
        filterProductStatus, setFilterProductStatus,
        visibleRows, setVisibleRows,
        loading,
        setShowProductForm,
        setEditingProduct, setNewProduct,
        deleteProduct
    } = useDashboard();

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <input type="text" id="search-products" placeholder="🔍 Buscar producto o código..." value={searchProducts} onChange={e => setSearchProducts(e.target.value)} className="input" style={{ flex: 1, minWidth: "200px" }} />
                <select id="filter-category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input" style={{ width: "150px" }}>
                    <option value="">Todas</option>
                    <option value="Medicamento">Medicamento</option>
                    <option value="Cosmético">Cosmético</option>
                    <option value="Dispositivo Médico">Dispositivo Médico</option>
                    <option value="Insumo">Insumo / Otros</option>
                </select>
                <select id="filter-product-status" value={filterProductStatus} onChange={e => setFilterProductStatus(e.target.value)} className="input" style={{ width: "150px" }}>
                    <option value="">Toda Semaforización</option>
                    <option value="OK">✓ OK</option>
                    <option value="BAJO">⚠️ Bajo</option>
                </select>
                <button id="btn-new-product" onClick={() => setShowProductForm(true)} className="btn-primary">+ Nuevo</button>
            </div>
            {loading ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Cargando...</p>
            ) : filteredProducts.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No hay productos</p>
            ) : (
                <>
                    <div style={{ overflowX: "auto" }}>
                        <table>
                            <thead><tr><th>Nombre</th><th>Categoría</th><th>Stock</th><th>Mín</th><th>Semaforización</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {filteredProducts.slice(0, visibleRows).map(p => {
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
                    {filteredProducts.length > visibleRows && (
                        <div style={{ textAlign: "center", marginTop: "1rem" }}>
                            <button onClick={() => setVisibleRows(prev => prev + 50)} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>↓ Mostrar más ({filteredProducts.length - visibleRows} restantes)</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
