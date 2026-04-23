"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);
    const [serverStatus, setServerStatus] = useState("checking"); // checking | ready | slow

    useEffect(() => {
        setMounted(true);
        if (localStorage.getItem("token")) {
            router.replace("/dashboard");
            return;
        }
        // Wake-up ping: despierta el backend de Render al cargar la página
        const startTime = Date.now();
        const pingTimeout = setTimeout(() => setServerStatus("slow"), 4000); // si tarda >4s avisa
        fetch(`${API}/health`, { method: "GET" })
            .then(r => {
                clearTimeout(pingTimeout);
                if (r.ok) {
                    const elapsed = Date.now() - startTime;
                    // Si tardo más de 3 segundos fue un cold start, mostrar brevemente "listo"
                    if (elapsed > 3000) {
                        setServerStatus("ready");
                        setTimeout(() => setServerStatus("hidden"), 3000);
                    } else {
                        setServerStatus("hidden");
                    }
                }
            })
            .catch(() => {
                clearTimeout(pingTimeout);
                setServerStatus("hidden"); // no bloquear el login si el ping falla
            });
    }, [router]);

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem("token", data.access_token);
                localStorage.setItem("user_email", email);
                localStorage.setItem("user_role", data.role || "OPERADOR");
                localStorage.setItem("user_full_name", data.full_name || email);
                localStorage.setItem("empresa_nombre", data.empresa_nombre || "Mi Empresa");
                router.replace("/dashboard");
            } else {
                const err = await res.json().catch(() => ({}));
                setError(err.detail || "Credenciales incorrectas. Intenta de nuevo.");
            }
        } catch {
            setError("No se pudo conectar al servidor. Verifica tu conexión.");
        } finally {
            setLoading(false);
        }
    }

    if (!mounted) return null;

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            fontFamily: "'Inter', sans-serif",
            background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)"
        }}>
            {/* Panel izquierdo – Branding */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "3rem",
                background: "rgba(255,255,255,0.04)",
                borderRight: "1px solid rgba(255,255,255,0.08)"
            }} className="login-brand-panel">
                <div style={{ textAlign: "center", maxWidth: "380px" }}>
                    <div style={{
                        width: "90px", height: "90px",
                        background: "linear-gradient(135deg, #667eea, #764ba2)",
                        borderRadius: "24px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "2.5rem", margin: "0 auto 2rem",
                        boxShadow: "0 12px 40px rgba(102,126,234,0.4)"
                    }}>🏥</div>

                    <h1 style={{ color: "white", fontSize: "2.25rem", fontWeight: "800", margin: "0 0 1rem", lineHeight: 1.2 }}>
                        Invent
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.1rem", lineHeight: 1.7, margin: "0 0 3rem" }}>
                        Plataforma de inventario.<br />
                        Gestiona tu clínica con total control y seguridad.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {[
                            { icon: "🔒", text: "Datos aislados por empresa" },
                            { icon: "📊", text: "Dashboard en tiempo real" },
                            { icon: "🏷️", text: "Control FEFO de lotes y vencimientos" },
                        ].map(({ icon, text }) => (
                            <div key={text} style={{
                                display: "flex", alignItems: "center", gap: "0.75rem",
                                background: "rgba(255,255,255,0.07)",
                                borderRadius: "0.75rem", padding: "0.875rem 1.25rem",
                                border: "1px solid rgba(255,255,255,0.1)"
                            }}>
                                <span style={{ fontSize: "1.25rem" }}>{icon}</span>
                                <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: "500" }}>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Panel derecho – Formulario */}
            <div style={{
                width: "480px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "3rem 3.5rem",
                background: "white"
            }} className="login-form-panel">
                <div style={{ marginBottom: "2.5rem" }}>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#111827", margin: "0 0 0.5rem" }}>
                        Bienvenido de vuelta
                    </h2>
                    <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>
                        Ingresa a tu cuenta para acceder al inventario
                    </p>
                </div>

                {/* Banner de estado del servidor */}
                {serverStatus === "slow" && (
                    <div style={{
                        marginBottom: "1.25rem",
                        padding: "0.875rem 1rem",
                        background: "#fffbeb",
                        border: "1px solid #fcd34d",
                        borderRadius: "0.75rem",
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        fontSize: "0.85rem", color: "#92400e"
                    }}>
                        <span style={{ fontSize: "1.2rem", animation: "spin 1.5s linear infinite", display: "inline-block" }}>⚙️</span>
                        <span><b>Despertando el servidor</b> — El sistema estuvo inactivo. Espera unos segundos mientras arranca...</span>
                    </div>
                )}
                {serverStatus === "ready" && (
                    <div style={{
                        marginBottom: "1.25rem",
                        padding: "0.875rem 1rem",
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: "0.75rem",
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        fontSize: "0.85rem", color: "#166534"
                    }}>
                        <span>✅</span> <span><b>¡Servidor listo!</b> Puedes iniciar sesión ahora.</span>
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {error && (
                        <div style={{
                            padding: "0.875rem 1rem",
                            background: "#fef2f2",
                            border: "1px solid #fca5a5",
                            borderRadius: "0.75rem",
                            color: "#dc2626",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                            Correo Electrónico
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@tuclinica.com"
                            required
                            autoComplete="email"
                            style={{
                                padding: "0.875rem 1rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.75rem",
                                fontSize: "0.9375rem",
                                fontFamily: "Inter, sans-serif",
                                background: "#f9fafb",
                                color: "#111827",
                                outline: "none",
                                transition: "border-color 0.2s, box-shadow 0.2s"
                            }}
                            onFocus={e => { e.target.style.borderColor = "#667eea"; e.target.style.background = "white"; e.target.style.boxShadow = "0 0 0 4px rgba(102,126,234,0.12)"; }}
                            onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#f9fafb"; e.target.style.boxShadow = "none"; }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                            Contraseña
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            style={{
                                padding: "0.875rem 1rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.75rem",
                                fontSize: "0.9375rem",
                                fontFamily: "Inter, sans-serif",
                                background: "#f9fafb",
                                color: "#111827",
                                outline: "none",
                                transition: "border-color 0.2s, box-shadow 0.2s"
                            }}
                            onFocus={e => { e.target.style.borderColor = "#667eea"; e.target.style.background = "white"; e.target.style.boxShadow = "0 0 0 4px rgba(102,126,234,0.12)"; }}
                            onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#f9fafb"; e.target.style.boxShadow = "none"; }}
                        />
                    </div>

                    <button
                        id="btn-login"
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: "0.5rem",
                            padding: "1rem",
                            background: loading ? "#c4b5fd" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "0.75rem",
                            fontSize: "1rem",
                            fontWeight: "700",
                            cursor: loading ? "not-allowed" : "pointer",
                            boxShadow: loading ? "none" : "0 4px 14px rgba(102,126,234,0.45)",
                            transition: "all 0.25s ease",
                            letterSpacing: "0.3px"
                        }}
                    >
                        {loading ? "Ingresando..." : "Ingresar →"}
                    </button>
                </form>

                <p style={{
                    marginTop: "2.5rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    color: "#9ca3af"
                }}>
                    ¿No tienes acceso? Contacta a tu administrador.
                </p>
            </div>

            {/* CSS responsive para el panel de branding */}
            <style>{`
                @media (max-width: 768px) {
                    .login-brand-panel { display: none !important; }
                    .login-form-panel  { width: 100% !important; padding: 2rem 1.5rem !important; }
                }
            `}</style>
        </div>
    );
}
