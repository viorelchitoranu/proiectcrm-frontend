import { http } from "./http.jsx";

export const adminApi = {
    // parents
    getParents:      (query, page, size) => http.get("/api/admin/parents", { query, page, size }),
    getParentDetails:(parentId)          => http.get(`/api/admin/parents/${parentId}`),

    // children
    getChildrenPaged:(query, page, size) => http.get("/api/admin/children/paged", { query, page, size }),
    getChildDetails: (childId)           => http.get(`/api/admin/children/${childId}`),

    // groups (pt move drawer)
    getGroups: () => http.get("/api/admin/groups"),

    // move child
    moveChild: (childId, payload) => http.post(`/api/admin/children/${childId}/move`, payload),

    // ── Modul 2: Adăugare copil ───────────────────────────────────────────────
    addChildToParent: (parentId, payload) =>
        http.post(`/api/admin/parents/${parentId}/children`, payload),

    // ── Modul 3: Schimbare email ──────────────────────────────────────────────
    changeParentEmail: (parentId, newEmail) =>
        http.patch(`/api/admin/parents/${parentId}/email`, { newEmail }),

    // ── Modul 4: Dezactivare / reactivare PARINTE ─────────────────────────────
    deactivateParent: (parentId) =>
        http.patch(`/api/admin/parents/${parentId}/deactivate`),

    activateParent: (parentId) =>
        http.patch(`/api/admin/parents/${parentId}/activate`),

    // ── Dezactivare / reactivare COPIL individual ─────────────────────────────
    deactivateChild: (childId) =>
        http.patch(`/api/admin/children/${childId}/deactivate`),

    activateChild: (childId) =>
        http.patch(`/api/admin/children/${childId}/activate`),

    // ── Logging: citire fișiere de log de pe server ───────────────────────────
    // GET /api/admin/logs?file=error&lines=200&filter=...
    // Răspuns: { lines: string[], totalReturned: number, file: string, filtered: boolean }
    //
    // file:   "app"   → app.log (toate evenimentele INFO+)
    //         "error" → error.log (WARN și ERROR — mai util pentru monitorizare)
    // lines:  numărul de linii de citit de la finalul fișierului (max 1000)
    // filter: text de filtrare case-insensitive (ex: "ERROR", "DEACTIVATE", "ion***")
    getLogs: (file = "error", lines = 200, filter) =>
        http.get("/api/admin/logs", { file, lines, ...(filter ? { filter } : {}) }),

    // ── Listă de așteptare ────────────────────────────────────────────────────
    // GET  /api/admin/waitlist              → toate cererile (WAITING, ALLOCATED, CANCELLED)
    // POST /api/admin/waitlist/{id}/allocate → alocă copilul la o grupă + creează cont dacă nu există
    // POST /api/admin/waitlist/{id}/cancel   → anulează o cerere WAITING
    getWaitlistEntries: () =>
        http.get("/api/admin/waitlist"),

    allocateWaitlistEntry: (entryId, groupId) =>
        http.post(`/api/admin/waitlist/${entryId}/allocate`, { groupId }),

    cancelWaitlistEntry: (entryId) =>
        http.post(`/api/admin/waitlist/${entryId}/cancel`),
};
