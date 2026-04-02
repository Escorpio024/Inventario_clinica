"use client";
import { useDashboard } from "../../dashboard/DashboardContext";

export default function EmpresasTab() {
    const { 
        empresas, 
        setShowEmpresaForm,
        isSuperAdmin,
        loading 
    } = useDashboard();

    if (loading) return <div className="loading-state">Cargando empresas...</div>;

    return (
        <div style={{ animation: "fadeIn 0.5s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h2 style={{ margin: 0, color: "#111827" }}>Gestión de Empresas (SaaS)</h2>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Administra las clínicas y comercios que usan el sistema</p>
                </div>
                <button 
                    className="btn-primary" 
                    onClick={() => setShowEmpresaForm(true)}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                    <span>➕</span> Nueva Clínica
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre de la Empresa</th>
                            <th>Slug (URL)</th>
                            <th>Plan</th>
                            <th>Estado</th>
                            <th>Fecha Registro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empresas.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                                    No hay empresas registradas aún.
                                </td>
                            </tr>
                        ) : (
                            empresas.map((emp) => (
                                <tr key={emp.id}>
                                    <td style={{ fontWeight: "600", color: "#6b7280" }}>#{emp.id}</td>
                                    <td>
                                        <div style={{ fontWeight: "600", color: "#111827" }}>{emp.nombre}</div>
                                    </td>
                                    <td><code style={{ background: "#f3f4f6", padding: "2px 4px", borderRadius: "4px" }}>{emp.slug}</code></td>
                                    <td>
                                        <span style={{ 
                                            padding: "4px 8px", 
                                            borderRadius: "99px", 
                                            fontSize: "0.75rem", 
                                            fontWeight: "600",
                                            background: emp.plan === "FREE" ? "#f3f4f6" : "#e0e7ff",
                                            color: emp.plan === "FREE" ? "#374151" : "#4338ca"
                                        }}>
                                            {emp.plan}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ color: emp.activa ? "#10b981" : "#ef4444" }}>
                                            {emp.activa ? "● Activa" : "● Inactiva"}
                                        </span>
                                    </td>
                                    <td style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                                        {new Date(emp.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#6b7280", background: "#f9fafb", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
                <strong>💡 Nota del Administrador:</strong> Al crear una empresa aquí, luego puedes ir a la pestaña <strong>Usuarios</strong> para crear un administrador específico para esa clínica.
            </div>
        </div>
    );
}
