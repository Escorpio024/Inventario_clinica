export function getLotExpiryStatus(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return {
        status: "vencido",
        color: "#ffffff",
        bg: "#991b1b",
        label: "🔴 VENCIDO",
        days: daysUntilExpiry
    };
    if (daysUntilExpiry <= 90) return {
        status: "critico",
        color: "#dc2626",
        bg: "#fee2e2",
        label: `🔴 Riesgo (${daysUntilExpiry}d)`,
        days: daysUntilExpiry
    };
    if (daysUntilExpiry <= 365) return {
        status: "alerta",
        color: "#d97706",
        bg: "#fef3c7",
        label: `⏳ Por vencer (${daysUntilExpiry}d)`,
        days: daysUntilExpiry
    };
    return {
        status: "ok",
        color: "#059669",
        bg: "#d1fae5",
        label: `✓ OK (${daysUntilExpiry}d)`,
        days: daysUntilExpiry
    };
}
