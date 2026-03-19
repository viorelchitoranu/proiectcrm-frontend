
const KEY = "crm_session";

export function saveSession(session, remember = false) {
    const primary = remember ? localStorage : sessionStorage;
    const secondary = remember ? sessionStorage : localStorage;

    primary.setItem(KEY, JSON.stringify(session));
    secondary.removeItem(KEY);
}

export function loadSession() {
    const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export function clearSession() {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
}

export function isRememberedSession() {
    return localStorage.getItem(KEY) !== null;
}