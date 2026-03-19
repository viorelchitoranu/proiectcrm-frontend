/**
 * API pentru trimiterea logurilor din frontend la backend.
 *
 * Endpoint: POST /api/public/client-log
 * Autentificare: nu necesară (/api/public/** e permis fără sesiune)
 *
 * Folosit în două locuri:
 *   1. ErrorBoundary.jsx → logError() pentru JavaScript crashes (componentDidCatch)
 *   2. http.jsx (opțional) → logWarn() pentru request-uri HTTP eșuate (4xx/5xx)
 *
 * Design: fire-and-forget fără retry.
 * Dacă trimiterea logului eșuează (server down, rețea etc.) — ignorăm silențios.
 * Nu vrem ca sistemul de logging să provoace erori suplimentare în UI.
 *
 * GDPR: nu trimitem date personale în loguri.
 * message și stack conțin doar mesaje tehnice JavaScript, nu date de utilizator.
 * url conține ruta React (ex: /admin/parents?parentId=5) — fără date sensibile.
 */

const LOG_ENDPOINT = "/api/public/client-log";

/**
 * Trimite un log de eroare la backend.
 * Fire-and-forget: nu returnează nimic, nu aruncă excepție.
 *
 * @param {Object} params
 * @param {"ERROR"|"WARN"|"INFO"} params.level   - severitatea
 * @param {string}                params.message - descrierea erorii
 * @param {string}                params.section - pagina/componenta React
 * @param {string}                [params.stack] - stack trace (opțional)
 */
function sendLog({ level, message, section, stack }) {
    // Folosim try-catch global pentru a nu risca erori în handler-ul de erori
    try {
        fetch(LOG_ENDPOINT, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                level,
                message: String(message).substring(0, 500),  // limităm lungimea
                section: section || "unknown",
                url: window.location.pathname + window.location.search,
                // stack poate fi undefined pentru erori fără stack trace
                stack: stack ? String(stack).substring(0, 2000) : null,
            }),
        }).catch(() => {
            // Ignorăm silențios erorile de rețea — serverul poate fi down
        });
    } catch {
        // Ignorăm orice eroare din sendLog — nu vrem logging recursiv
    }
}

/**
 * Loghează un crash JavaScript (nivel ERROR).
 * Apelat de ErrorBoundary.componentDidCatch().
 *
 * @param {Error}  error   - obiectul Error JavaScript
 * @param {string} section - numele componentei/paginii
 */
export function logError(error, section) {
    sendLog({
        level: "ERROR",
        message: error?.message || String(error),
        section,
        stack: error?.stack,
    });
}

/**
 * Loghează un avertisment (nivel WARN).
 * Folosit opțional pentru request-uri HTTP eșuate sau situații neașteptate.
 *
 * @param {string} message - descrierea problemei
 * @param {string} section - pagina/componenta unde a apărut
 */
export function logWarn(message, section) {
    sendLog({
        level: "WARN",
        message,
        section,
        stack: null,
    });
}
