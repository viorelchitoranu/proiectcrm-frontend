import { http } from "../http.jsx";
import { clearSession } from "./session.jsx";

export const authApi = {
    login: (payload) => http.post("/api/auth/login", payload),
    me: () => http.get("/api/auth/me"),
    logout: () => http.post("/api/auth/logout"),
};

export async function logoutAndClear() {
    try {
        await authApi.logout();
    } finally {
        clearSession();
    }
}