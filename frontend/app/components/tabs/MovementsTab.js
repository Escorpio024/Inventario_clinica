"use client";
import { useDashboard } from "../../dashboard/DashboardContext";

export default function MovementsTab() {
    const {
        movements, filteredMovements,
        searchMovements, setSearchMovements,
        visibleRows, setVisibleRows,
        loading,
        setShowMovementForm
    } = useDashboard();

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <input type="text" id="search-movements" placeholder="🔍 Buscar movimiento..." value={searchMovements} onChange={e => setSearchMovements(e.target.value)} className="input" style={{ flex: 1 }} />
                <button id="btn-new-movement" onClick={() => setShowMovementForm(true)} className="btn-primary">+ Nuevo Movimiento</button>
            </div>
            {loading ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Cargando...</p>
            ) : filteredMovements.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No hay movimientos</p>
            ) : (
                <>
                <div style={{ overflowX: "auto" }}>
                    <table>
                        <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Lote</th><th>Cant</th><th>Razón / Trazabilidad</th><th>Usuario</th></tr></thead>
                        <tbody>
                            {filteredMovements.slice(0, visibleRows).map((m, idx) => {
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
                                        <td style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: "1.4" }}>
                                            {m.patient && <div style={{ color: "#0f172a" }}><strong>Paciente:</strong> {m.patient}</div>}
                                            {m.doctor && <div><strong>Médico:</strong> {m.doctor}</div>}
                                            {m.destination && <div><strong>Destino:</strong> {m.destination}</div>}
                                            {m.reason && <div style={{ fontStyle: "italic", marginTop: "0.2rem" }}>Nota: {m.reason}</div>}
                                            {(!m.patient && !m.doctor && !m.destination && !m.reason) && "—"}
                                        </td>
                                        <td style={{ fontSize: "0.875rem", color: "#6b7280" }}>{m.user_email}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredMovements.length > visibleRows && (
                    <div style={{ textAlign: "center", marginTop: "1rem" }}>
                        <button onClick={() => setVisibleRows(prev => prev + 50)} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>↓ Mostrar más ({filteredMovements.length - visibleRows} restantes)</button>
                    </div>
                )}
                </>
            )}
        </div>
    );
}
