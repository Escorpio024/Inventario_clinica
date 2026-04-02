"use client";
import { createContext, useContext } from "react";

export const DashboardContext = createContext(null);

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error("useDashboard debe usarse dentro de un DashboardProvider");
    }
    return context;
}
