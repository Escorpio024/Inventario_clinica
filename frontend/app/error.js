"use client";
import { useEffect } from "react";

export default function Error({ error, reset }) {
    useEffect(() => {
        // Loguear el error para debug futuro
        console.error("[App Error]", error);
    }, [error]);

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Inter', sans-serif",
            background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
            padding: "2rem",
            textAlign: "center"
        }}>
            <div style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "1.5rem",
                padding: "3rem",
                maxWidth: "480px",
                width: "100%",
                backdropFilter: "blur(10px)"
            }}>
                <div style={{
                    fontSize: "4rem",
                    marginBottom: "1.5rem"
                }}>⚠️</div>

                <h1 style={{
                    color: "white",
                    fontSize: "1.5rem",
                    fontWeight: "800",
                    margin: "0 0 1rem"
                }}>
                    Algo salió mal
                </h1>

                <p style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.95rem",
                    lineHeight: 1.7,
                    margin: "0 0 2rem"
                }}>
                    Ocurrió un error inesperado en la aplicación. Puedes intentar recargar la página o volver al inicio.
                </p>

                {error?.message && (
                    <p style={{
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: "0.75rem",
                        padding: "0.75rem 1rem",
                        color: "#fca5a5",
                        fontSize: "0.8rem",
                        marginBottom: "2rem",
                        wordBreak: "break-word",
                        textAlign: "left"
                    }}>
                        <strong>Detalle:</strong> {error.message}
                    </p>
                )}

                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: "0.875rem 1.5rem",
                            background: "linear-gradient(135deg, #667eea, #764ba2)",
                            color: "white",
                            border: "none",
                            borderRadius: "0.75rem",
                            fontSize: "0.95rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            boxShadow: "0 4px 14px rgba(102,126,234,0.4)"
                        }}
                    >
                        🔄 Intentar de nuevo
                    </button>

                    <button
                        onClick={() => { window.location.href = "/"; }}
                        style={{
                            padding: "0.875rem 1.5rem",
                            background: "rgba(255,255,255,0.1)",
                            color: "white",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "0.75rem",
                            fontSize: "0.95rem",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        🏠 Volver al inicio
                    </button>
                </div>
            </div>
        </div>
    );
}
