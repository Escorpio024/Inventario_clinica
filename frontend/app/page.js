"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
                window.location.href = "/dashboard";
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.detail || "❌ Credenciales incorrectas");
            }
        } catch (err) {
            setError("❌ Error de conexión. Verifica tu red.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}>
            <div className="card" style={{ maxWidth: "400px", width: "100%", margin: "1rem" }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <span style={{ fontSize: "4rem" }}>🏥</span>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1f2937", marginTop: "1rem" }}>
                        Inventario Clínica
                    </h1>
                    <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>Sistema de inventario médico</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@clinica.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: "0.75rem",
                            background: "#fef2f2",
                            color: "#ef4444",
                            borderRadius: "0.5rem",
                            marginBottom: "1rem",
                            fontSize: "0.875rem"
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        id="btn-login"
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ width: "100%" }}
                    >
                        {loading ? "Ingresando..." : "Ingresar"}
                    </button>
                </form>

                <div style={{ marginTop: "2rem", padding: "1rem", background: "#f9fafb", borderRadius: "0.5rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "center", marginBottom: "0.5rem" }}>
                        Credenciales por defecto:
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "#374151", textAlign: "center", fontFamily: "monospace" }}>
                        admin@clinica.com / admin123
                    </p>
                </div>
            </div>
        </div>
    );
}
