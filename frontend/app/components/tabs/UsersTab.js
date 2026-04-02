"use client";
import { useDashboard } from "../../dashboard/DashboardContext";

export default function UsersTab() {
    const {
        users, loading,
        setShowUserForm,
        setEditingUser, setNewUser,
        updateUserRole, deleteUser,
        userEmail
    } = useDashboard();

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                <div>
                    <h3 style={{ fontWeight: "700", color: "#1f2937", margin: 0 }}>Gestión de Usuarios</h3>
                    <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>Control de acceso y trazabilidad</p>
                </div>
                <button id="btn-new-user" onClick={() => { setShowUserForm(true); setEditingUser(null); setNewUser({ email: "", password: "", full_name: "", role: "OPERADOR" }); }} className="btn-primary">+ Nuevo Usuario</button>
            </div>

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
                                            background: u.role === "SUPERADMIN" ? "linear-gradient(135deg, #0f172a, #334155)" :
                                                u.role === "ADMIN" ? "linear-gradient(135deg,#f59e0b,#d97706)" :
                                                    "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                            color: "white"
                                        }}>
                                            {u.role === "SUPERADMIN" ? "🔱 SUPERADMIN" : u.role === "ADMIN" ? "👑 ADMIN" : "👤 OPERADOR"}
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
        </div>
    );
}
