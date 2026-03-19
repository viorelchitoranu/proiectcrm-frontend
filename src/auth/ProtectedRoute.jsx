import React from "react";
import { Navigate } from "react-router-dom";
import { loadSession } from "./session.jsx";

export default function ProtectedRoute({ allowRoles, children }) {
    const session = loadSession();

    if (!session?.userId) {
        return <Navigate to="/login" replace />;
    }

    if (Array.isArray(allowRoles) && allowRoles.length > 0) {
        const currentRole = String(session.role || "").toUpperCase();
        const normalizedAllowed = allowRoles.map((r) => String(r).toUpperCase());

        if (!normalizedAllowed.includes(currentRole)) {
            return <Navigate to="/login" replace />;
        }
    }

    return children;
}