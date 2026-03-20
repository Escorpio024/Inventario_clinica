"use client";
import { useEffect, useRef, useState, useCallback } from "react";

/**
 * BarcodeScanner — Cómo funciona:
 *
 * 1. Al montar el componente, carga dinámicamente la librería html5-qrcode
 *    (import dinámico para evitar errores SSR de Next.js).
 *
 * 2. Pide permiso de cámara al navegador. Si el usuario lo rechaza o no
 *    hay cámara disponible, cae al modo manual automáticamente.
 *
 * 3. La librería activa la cámara trasera (facingMode: "environment") y
 *    analiza cada frame a 10fps buscando QR o códigos de barras (1D/2D).
 *
 * 4. Al detectar un código:
 *    - Detiene la cámara inmediatamente (para evitar disparos múltiples).
 *    - Llama a onScan(codigo) → el Dashboard busca ese código en la API.
 *    - La API busca en lotes (barcode) y en productos (barcode).
 *    - Si encuentra un LOTE → auto-rellena producto + lote en el formulario.
 *    - Si encuentra un PRODUCTO → auto-rellena solo producto.
 *
 * 5. Si no hay cámara, el usuario puede teclear el código manualmente y
 *    presionar Enter o el botón ✓ Usar.
 *
 * Props:
 *   onScan(code: string)  — callback al detectar/ingresar un código
 *   onClose()             — callback al cerrar el escáner
 */
export default function BarcodeScanner({ onScan, onClose }) {
    // Referencia al contenedor del video (html5-qrcode lo necesita por ID)
    const html5QrRef = useRef(null);   // instancia de Html5Qrcode
    const isRunningRef = useRef(false); // evita llamadas dobles a stop()
    const onScanRef = useRef(onScan);   // ref estable para evitar stale closures

    const [manualCode, setManualCode] = useState("");
    const [status, setStatus] = useState("loading"); // loading | scanning | error | manual
    const [errorMsg, setErrorMsg] = useState("");
    const [lastScanned, setLastScanned] = useState("");

    // Mantener onScanRef actualizado sin re-montar el scanner
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    // ── Iniciar cámara ────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function startCamera() {
            try {
                setStatus("loading");

                // Import dinámico — evita errores de SSR con Next.js
                const { Html5Qrcode } = await import("html5-qrcode");

                if (cancelled) return;

                const scanner = new Html5Qrcode("qr-video-container");
                html5QrRef.current = scanner;

                await scanner.start(
                    { facingMode: "environment" }, // preferir cámara trasera en móvil
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        disableFlip: false,          // intentar también imagen espejada
                    },
                    (decodedText) => {
                        // Evitar disparos múltiples del mismo código
                        if (!isRunningRef.current) return;
                        isRunningRef.current = false;

                        scanner.stop()
                            .catch(() => {})
                            .finally(() => {
                                if (cancelled) return;
                                setLastScanned(decodedText);
                                setStatus("manual"); // mostrar confirmación visual
                                onScanRef.current(decodedText);
                            });
                    },
                    () => { /* Errores de frame (no encontró código en ese frame) — normal */ }
                );

                if (!cancelled) {
                    isRunningRef.current = true;
                    setStatus("scanning");
                }

            } catch (err) {
                if (cancelled) return;
                console.warn("Cámara no disponible:", err?.message || err);

                // Si el error es de permisos o no hay cámara, ir a modo manual
                const isPermissionError =
                    err?.name === "NotAllowedError" ||
                    err?.name === "NotFoundError" ||
                    err?.name === "OverconstrainedError" ||
                    err?.message?.includes("Permission") ||
                    err?.message?.includes("Camera");

                setErrorMsg(
                    isPermissionError
                        ? "Permiso de cámara denegado. Usa el modo manual."
                        : "No se pudo iniciar la cámara. Usa el modo manual."
                );
                setStatus("error");
            }
        }

        startCamera();

        // Cleanup: detener cámara al cerrar el modal
        return () => {
            cancelled = true;
            if (html5QrRef.current && isRunningRef.current) {
                html5QrRef.current.stop().catch(() => {});
                isRunningRef.current = false;
            }
        };
    }, []); // Solo al montar — sin dependencias

    // ── Entrada manual ────────────────────────────────────────────────────────
    const handleManualSubmit = useCallback((e) => {
        e.preventDefault();
        const code = manualCode.trim();
        if (!code) return;
        setLastScanned(code);
        setManualCode("");
        onScanRef.current(code);
    }, [manualCode]);

    // ── Colores por estado ────────────────────────────────────────────────────
    const statusConfig = {
        loading:  { color: "#6366f1", icon: "⏳", text: "Iniciando cámara..." },
        scanning: { color: "#10b981", icon: "🔍", text: "Escáner activo — apunta al código" },
        error:    { color: "#ef4444", icon: "⚠️", text: errorMsg },
        manual:   { color: "#10b981", icon: "✅", text: `Código detectado: ${lastScanned}` },
    };
    const st = statusConfig[status] || statusConfig.loading;

    return (
        <div style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            overflowY: "auto",
        }}>
            <div style={{ maxWidth: "520px", width: "100%", textAlign: "center" }}>

                {/* Título */}
                <h2 style={{ color: "white", fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.25rem" }}>
                    📷 Escanear Código QR / Barras
                </h2>

                {/* Panel de estado */}
                <div style={{
                    background: st.color + "22",
                    border: `2px solid ${st.color}`,
                    borderRadius: "0.75rem",
                    padding: "0.75rem 1rem",
                    marginBottom: "1rem",
                    color: "white",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    justifyContent: "center",
                }}>
                    <span style={{ fontSize: "1.25rem" }}>{st.icon}</span>
                    <span>{st.text}</span>
                </div>

                {/* Contenedor del video — siempre en el DOM para que html5-qrcode lo encuentre */}
                <div style={{
                    background: "white",
                    borderRadius: "1rem",
                    padding: "0.75rem",
                    marginBottom: "1rem",
                    display: status === "error" ? "none" : "block", // ocultar si no hay cámara
                }}>
                    <div
                        id="qr-video-container"
                        style={{ width: "100%", minHeight: "260px", borderRadius: "0.5rem", overflow: "hidden" }}
                    />
                </div>

                {/* Cómo funciona (info) */}
                {status === "scanning" && (
                    <div style={{
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: "0.75rem",
                        padding: "0.75rem",
                        marginBottom: "1rem",
                        color: "#9ca3af",
                        fontSize: "0.8rem",
                        textAlign: "left",
                        lineHeight: "1.6",
                    }}>
                        <strong style={{ color: "white" }}>💡 Cómo usar:</strong><br />
                        1. Apunta la cámara al código QR o de barras del lote/producto.<br />
                        2. Mantén el código dentro del recuadro verde.<br />
                        3. El sistema lo detectará automáticamente.
                    </div>
                )}

                {/* Separador */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.2)" }} />
                    <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>o ingresa manualmente</span>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.2)" }} />
                </div>

                {/* Input manual */}
                <div style={{ background: "white", borderRadius: "1rem", padding: "1.25rem", marginBottom: "1rem" }}>
                    <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                            id="manual-barcode-input"
                            type="text"
                            className="input"
                            value={manualCode}
                            onChange={e => setManualCode(e.target.value)}
                            placeholder="Ej: LOT-2024-001 o 7501234567890"
                            style={{ flex: 1 }}
                            autoComplete="off"
                            autoFocus={status === "error"} // auto-focus si no hay cámara
                        />
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={!manualCode.trim()}
                            style={{ whiteSpace: "nowrap" }}
                        >
                            ✓ Usar
                        </button>
                    </form>
                </div>

                {/* Botón cerrar */}
                <button
                    id="btn-close-scanner"
                    onClick={onClose}
                    className="btn-secondary"
                    style={{ color: "white", borderColor: "rgba(255,255,255,0.5)", width: "100%" }}
                >
                    ✕ Cerrar sin escanear
                </button>
            </div>
        </div>
    );
}
