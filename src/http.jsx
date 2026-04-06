// FIX: VITE_API_BASE e setat în .env.production pentru deploy
// În dev rămâne gol → Vite proxy gestionează /api/* → http://localhost:8080
const API_BASE = import.meta.env.VITE_API_BASE || "";

export class HttpError extends Error {
    constructor(status, statusText, details, rawText) {
        const message =
            (details && typeof details === "object" && details.message)
                ? String(details.message)
                : rawText || `${status} ${statusText}`;

        super(message);
        this.name = "HttpError";
        this.status = status;
        this.statusText = statusText;
        this.details = details;
        this.rawText = rawText;
    }
}

function buildUrl(path, query) {
    const url = new URL(`${API_BASE}${path}`, window.location.origin);
    if (query) {
        Object.entries(query).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
        });
    }
    return url.toString().replace(window.location.origin, "");
}

/**
 * Citește cookie-ul XSRF-TOKEN setat de Spring Security.
 * Backend-ul trimite acest cookie la primul request autentificat.
 * Frontend-ul îl trimite înapoi în header-ul X-XSRF-TOKEN pentru
 * a dovedi că cererea vine din același origin (protecție CSRF).
 */
function getCsrfToken() {
    return document.cookie
        .split("; ")
        .find(row => row.startsWith("XSRF-TOKEN="))
        ?.split("=")[1] ?? "";
}

/**
 * Parsează corpul unui response HTTP cu eroare (non-2xx).
 *
 * Extrasă din request() pentru a reduce complexitatea ciclomatică cu 1 punct
 * (SonarCloud: 16 → 15) — blocul if/else de parsing contribuia la complexitate.
 *
 * Încearcă să parseze JSON, cu fallback pe text simplu.
 * Erorile de parsing sunt înghițite — nu vrem să ascundem eroarea originală.
 *
 * @param {Response} res - response-ul fetch cu status non-2xx
 * @returns {Promise<{details: object|null, rawText: string}>}
 */
async function parseErrorResponse(res) {
    const contentType = res.headers.get("content-type") || "";
    let details = null;
    let rawText = "";

    if (contentType.includes("application/json")) {
        try { details = await res.json(); } catch { details = null; }
        try { rawText = JSON.stringify(details); } catch { rawText = ""; }
    } else {
        rawText = await res.text().catch(() => "");
    }

    return { details, rawText };
}

async function request(method, path, { query, body } = {}) {
    const url = buildUrl(path, query);

    let res;
    try {
        const hasBody = body !== undefined && body !== null;
        const isReadOnly = method === "GET" || method === "HEAD" || method === "OPTIONS";

        // X-XSRF-TOKEN: trimis la toate request-urile care modifică starea (non-GET)
        // GET/HEAD/OPTIONS sunt safe methods și nu necesită CSRF token
        const csrfHeader = isReadOnly ? {} : { "X-XSRF-TOKEN": getCsrfToken() };

        res = await fetch(url, {
            method,
            credentials: "include",
            headers: {
                ...(hasBody ? { "Content-Type": "application/json" } : {}),
                ...csrfHeader,
            },
            body: hasBody ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new Error("Nu pot contacta serverul. Verifică backend-ul / proxy-ul Vite.");
    }

    // Retry automat la 403 — CSRF token expirat
    // Facem un GET la /api/auth/me pentru a reîmprospăta cookie-ul XSRF-TOKEN
    // apoi retrimitbem request-ul original o singură dată
    if (res.status === 403 && method !== "GET") {
        try {
            await fetch(buildUrl("/api/auth/me"), {
                method: "GET",
                credentials: "include",
            });
            // Retry cu noul CSRF token
            const csrfHeader = { "X-XSRF-TOKEN": getCsrfToken() };
            const hasBody = body !== undefined && body !== null;
            res = await fetch(url, {
                method,
                credentials: "include",
                headers: {
                    ...(hasBody ? { "Content-Type": "application/json" } : {}),
                    ...csrfHeader,
                },
                body: hasBody ? JSON.stringify(body) : undefined,
            });
        } catch { /* ignorăm eroarea de refresh */ }
    }

    // Retry automat la 403 — CSRF token expirat
    // Facem un GET la /api/auth/me pentru a reîmprospăta cookie-ul XSRF-TOKEN
    // apoi retrimitbem request-ul original o singură dată
    if (res.status === 403 && method !== "GET") {
        try {
            await fetch(buildUrl("/api/auth/me"), {
                method: "GET",
                credentials: "include",
            });
            // Retry cu noul CSRF token
            const csrfHeader = { "X-XSRF-TOKEN": getCsrfToken() };
            const hasBody = body !== undefined && body !== null;
            res = await fetch(url, {
                method,
                credentials: "include",
                headers: {
                    ...(hasBody ? { "Content-Type": "application/json" } : {}),
                    ...csrfHeader,
                },
                body: hasBody ? JSON.stringify(body) : undefined,
            });
        } catch { /* ignorăm eroarea de refresh */ }
    }

    // Retry automat la 403 — CSRF token expirat
    // Facem un GET la /api/auth/me pentru a reîmprospăta cookie-ul XSRF-TOKEN
    // apoi retrimitbem request-ul original o singură dată
    if (res.status === 403 && method !== "GET") {
        try {
            await fetch(buildUrl("/api/auth/me"), {
                method: "GET",
                credentials: "include",
            });
            // Retry cu noul CSRF token
            const csrfHeader = { "X-XSRF-TOKEN": getCsrfToken() };
            const hasBody = body !== undefined && body !== null;
            res = await fetch(url, {
                method,
                credentials: "include",
                headers: {
                    ...(hasBody ? { "Content-Type": "application/json" } : {}),
                    ...csrfHeader,
                },
                body: hasBody ? JSON.stringify(body) : undefined,
            });
        } catch { /* ignorăm eroarea de refresh */ }
    }

    if (!res.ok) {
        const { details, rawText } = await parseErrorResponse(res);
        throw new HttpError(res.status, res.statusText, details, rawText);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return await res.json();
    return await res.text();
}

export const http = {
    get:    (path, query)        => request("GET",    path, { query }),
    post:   (path, body, query)  => request("POST",   path, { body, query }),
    put:    (path, body, query)  => request("PUT",    path, { body, query }),
    patch:  (path, body, query)  => request("PATCH",  path, { body, query }),  // ← NOU (Modul 3 + 4)
    delete: (path, query)        => request("DELETE", path, { query }),
};
