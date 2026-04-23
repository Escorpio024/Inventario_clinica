"use client";
import { useState } from "react";
import { useDashboard } from "../../dashboard/DashboardContext";
import { getLotExpiryStatus } from "../../utils/helpers";

export default function LotsTab() {
    const {
        lots, products, filteredLots,
        searchLots, setSearchLots,
        filterStatus, setFilterStatus,
        visibleRows, setVisibleRows,
        loading,
        setShowLotForm,
        setEditingLot, setNewLot
    } = useDashboard();

    const [selectedLotForDrawer, setSelectedLotForDrawer] = useState(null);

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <input type="text" id="search-lots" placeholder="🔍 Buscar por producto, lote, factura, proveedor, marca, laboratorio..." value={searchLots} onChange={e => setSearchLots(e.target.value)} className="input" style={{ flex: 1, minWidth: "200px" }} />
                <select id="filter-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input" style={{ width: "160px" }}>
                    <option value="">Todos</option>
                    <option value="OK">✓ OK</option>
                    <option value="WARNING">⚠️ Por vencer</option>
                    <option value="DANGER">🔴 Riesgo / Vencidos</option>
                </select>
                <button id="btn-new-lot" onClick={() => setShowLotForm(true)} className="btn-primary">+ Registrar Lote</button>
            </div>
            {loading ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Cargando...</p>
            ) : filteredLots.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No hay lotes</p>
            ) : (
                <>
                    <div style={{ overflowX: "auto" }}>
                        <table>
                            <thead><tr>
                                <th>Producto</th>
                                <th>Nº Lote / Factura</th>
                                <th>F. Recepción</th>
                                <th>F. Vencimiento</th>
                                <th style={{ textAlign: "right" }}>Stock</th>
                                <th>ℹ️ Recepción</th>
                                <th style={{ textAlign: "right" }}>% Consumido</th>
                                <th>Semaforización</th>
                                <th>Acciones</th>
                            </tr></thead>
                            <tbody>
                                {filteredLots.slice(0, visibleRows).map(l => {
                                    const product = products.find(p => p.id === l.product_id);
                                    const status = getLotExpiryStatus(l.expiry_date);
                                    const valorLote = l.qty_current * (l.unit_cost || 0);
                                    const pctUsado = l.qty_initial > 0
                                        ? Math.round(((l.qty_initial - l.qty_current) / l.qty_initial) * 100)
                                        : 0;
                                    const pctColor = pctUsado >= 90 ? "#ef4444" : pctUsado >= 60 ? "#f59e0b" : "#10b981";
                                    return (
                                        <tr key={l.id}
                                            onClick={() => setSelectedLotForDrawer(l)}
                                            style={{ cursor: "pointer", transition: "background 0.2s" }}
                                            onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <td style={{ fontWeight: "600" }}>
                                                {product?.name}
                                                <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "400", marginTop: "0.1rem" }}>{product?.category}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontFamily: "monospace", fontWeight: "600", color: "#0f172a" }}>{l.lot_number}</div>
                                                {l.factura && <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.1rem" }}>🧳 {l.factura}</div>}
                                            </td>
                                            <td style={{ fontSize: "0.875rem", color: "#475569" }}>
                                                {l.fecha_recepcion
                                                    ? new Date(l.fecha_recepcion + "T12:00:00").toLocaleDateString("es")
                                                    : <span style={{ color: "#cbd5e1" }}>—</span>}
                                            </td>
                                            <td style={{ fontSize: "0.875rem" }}>{new Date(l.expiry_date + "T12:00:00").toLocaleDateString("es")}</td>
                                            <td style={{ textAlign: "right", fontWeight: "700" }}>{l.qty_current}<span style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: "0.2rem" }}>/{l.qty_initial}</span></td>
                                            <td>
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                                    background: l.estado_recepcion === "Rechazado" ? "#fef2f2" : "#ecfdf5",
                                                    color: l.estado_recepcion === "Rechazado" ? "#dc2626" : "#059669",
                                                    padding: "0.2rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: "700"
                                                }}>
                                                    {l.estado_recepcion === "Rechazado" ? "❌ Rechazado" : "✅ Aceptado"}
                                                </span>
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
                                            <td style={{ display: "flex", gap: "0.4rem" }}>
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedLotForDrawer(l); }} style={{ background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: "0.5rem", padding: "0.375rem 0.625rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.2rem" }}>👁️ Ver</button>
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
                                            <td colSpan={4} style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                📊 {filteredLots.length} lotes mostrados
                                            </td>
                                            <td style={{ textAlign: "right", color: "#1e293b" }}>{filteredLots.reduce((s, l) => s + l.qty_current, 0)}</td>
                                            <td colSpan={4}></td>
                                        </tr>
                                    </tfoot>
                                );
                            })()}
                        </table>
                    </div>
                    {filteredLots.length > visibleRows && (
                        <div style={{ textAlign: "center", marginTop: "1rem" }}>
                            <button onClick={() => setVisibleRows(prev => prev + 50)} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>↓ Mostrar más ({filteredLots.length - visibleRows} restantes)</button>
                        </div>
                    )}
                </>
            )}

            {/* Side Drawer */}
            {selectedLotForDrawer && (() => {
                const l = selectedLotForDrawer;
                const p = products.find(prod => prod.id === l.product_id) || {};

                return (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", justifyContent: "flex-end", transition: "all 0.3s ease", backdropFilter: "blur(2px)" }} onClick={() => setSelectedLotForDrawer(null)}>
                        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
                        <div style={{ width: "100%", maxWidth: "450px", background: "white", height: "100%", padding: "2rem", boxShadow: "-4px 0 25px rgba(0,0,0,0.15)", overflowY: "auto", animation: "slideInRight 0.3s ease-out" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
                                <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b" }}>Resumen de Lote</h2>
                                <button onClick={() => setSelectedLotForDrawer(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}>✖</button>
                            </div>

                            {/* Section 1: Product Details */}
                            <div style={{ marginBottom: "2rem", background: "#f8fafc", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #f1f5f9" }}>
                                <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>📦 Detalles del Producto</h3>
                                <div style={{ display: "grid", gap: "0.85rem" }}>
                                    <div style={{ display: "flex" }}>
                                        <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Nombre</span>
                                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>{p.name || "—"}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Categoría</span>
                                        <span style={{ fontSize: "0.8rem", background: "#e0e7ff", color: "#4338ca", padding: "0.15rem 0.6rem", borderRadius: "999px", fontWeight: "600" }}>{p.category || "—"}</span>
                                    </div>
                                    <div style={{ borderTop: "1px dashed #e2e8f0", margin: "0.25rem 0" }} />
                                    <div style={{ display: "flex" }}>
                                        <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Marca Comercial</span>
                                        <div style={{ color: "#334155", fontSize: "0.95rem" }}>{p.marca || <span style={{ color: "#cbd5e1" }}>—</span>}</div>
                                    </div>
                                    <div style={{ display: "flex" }}>
                                        <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Laboratorio</span>
                                        <div style={{ color: "#334155", fontSize: "0.95rem" }}>{p.laboratorio || <span style={{ color: "#cbd5e1" }}>—</span>}</div>
                                    </div>
                                    <div style={{ display: "flex" }}>
                                        <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Presentación</span>
                                        <div style={{ color: "#334155", fontSize: "0.95rem" }}>{p.presentacion || <span style={{ color: "#cbd5e1" }}>—</span>}</div>
                                    </div>
                                    <div style={{ display: "flex" }}>
                                        <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Reg. Sanitario</span>
                                        <div style={{ color: "#334155", fontSize: "0.95rem" }}>{p.registro_sanitario || <span style={{ color: "#cbd5e1" }}>—</span>}</div>
                                    </div>
                                    {p.principio_activo && (
                                        <div style={{ display: "flex" }}>
                                            <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Principio Activo</span>
                                            <div style={{ color: "#334155", fontSize: "0.95rem" }}>{p.principio_activo}</div>
                                        </div>
                                    )}
                                    {p.forma_farmaceutica && (
                                        <div style={{ display: "flex" }}>
                                            <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Forma Farmacéutica</span>
                                            <div style={{ color: "#334155", fontSize: "0.95rem" }}>{p.forma_farmaceutica}</div>
                                        </div>
                                    )}
                                    {p.concentracion && (
                                        <div style={{ display: "flex" }}>
                                            <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Concentración</span>
                                            <div style={{ color: "#334155", fontSize: "0.95rem" }}>{p.concentracion}</div>
                                        </div>
                                    )}
                                    {p.clasificacion_riesgo && (
                                        <div style={{ display: "flex" }}>
                                            <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Clasificación Riesgo</span>
                                            <div style={{ color: "#334155", fontSize: "0.95rem" }}>{p.clasificacion_riesgo}</div>
                                        </div>
                                    )}
                                    {p.vida_util && (
                                        <div style={{ display: "flex" }}>
                                            <span style={{ minWidth: "145px", fontSize: "0.85rem", color: "#94a3b8" }}>Vida Útil</span>
                                            <div style={{ color: "#334155", fontSize: "0.95rem" }}>{p.vida_util}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Reception Details */}
                            <div style={{ marginBottom: "2rem", background: "#fff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                                <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>📥 Detalles de Recepción</h3>

                                <div style={{ display: "grid", gap: "1rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.25rem" }}>Lote / Serie</span><div style={{ fontFamily: "monospace", color: "#0284c7", fontWeight: "700", background: "#f0f9ff", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", display: "inline-block" }}>{l.lot_number}</div></div>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.25rem" }}>Factura Nº</span><div style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.95rem" }}>{l.factura || "—"}</div></div>
                                    </div>

                                    {/* Proveedor */}
                                    <div style={{ display: "flex" }}>
                                        <span style={{ minWidth: "140px", fontSize: "0.85rem", color: "#94a3b8" }}>Proveedor</span>
                                        <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.95rem" }}>{l.proveedor || <span style={{ color: "#cbd5e1" }}>— No registrado</span>}</div>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.25rem" }}>Fecha Recepción</span><div style={{ color: "#334155", fontSize: "0.95rem" }}>{l.fecha_recepcion ? new Date(l.fecha_recepcion + "T12:00:00").toLocaleDateString("es") : "—"}</div></div>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.25rem" }}>Fecha Vencimiento</span><div style={{ color: "#334155", fontSize: "0.95rem" }}>{new Date(l.expiry_date + "T12:00:00").toLocaleDateString("es")}</div></div>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.25rem" }}>Cantidad Inicial (Compra)</span><div style={{ color: "#334155", fontSize: "0.95rem" }}>{l.qty_initial}</div></div>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.25rem" }}>Costo Unitario</span><div style={{ color: "#334155", fontSize: "0.95rem" }}>{l.unit_cost ? `$${Number(l.unit_cost).toLocaleString("es", { minimumFractionDigits: 2 })}` : "—"}</div></div>
                                    </div>

                                    <div style={{ marginTop: "0.5rem", paddingTop: "1rem", borderTop: "1px dashed #e2e8f0" }}>
                                        <span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.5rem" }}>Estado de Recepción</span>
                                        <div style={{ display: "inline-block", background: l.estado_recepcion === "Rechazado" ? "#fef2f2" : "#ecfdf5", color: l.estado_recepcion === "Rechazado" ? "#dc2626" : "#059669", fontWeight: "600", padding: "0.35rem 0.75rem", borderRadius: "999px", fontSize: "0.9rem" }}>
                                            {l.estado_recepcion === "Rechazado" ? "❌ Rechazado" : "✅ Aceptado"}
                                        </div>
                                    </div>

                                    {l.estado_recepcion === "Rechazado" && (
                                        <div style={{ background: "#fef2f2", padding: "1rem", borderRadius: "0.5rem", borderLeft: "4px solid #ef4444" }}>
                                            <span style={{ fontSize: "0.85rem", color: "#ef4444", display: "block", marginBottom: "0.35rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Causas del Rechazo</span>
                                            <div style={{ color: "#991b1b", fontSize: "0.95rem", fontStyle: "italic", lineHeight: 1.5 }}>"{l.causas_rechazo}"</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
