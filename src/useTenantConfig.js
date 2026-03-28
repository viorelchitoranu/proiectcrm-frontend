import { useEffect, useState } from "react";

/**
 * Hook React pentru configurarea tenant-ului (white-label).
 *
 * Apelează GET /api/public/tenant-config la prima randare și returnează
 * configurarea clientului curent (nume, culori, logo etc.).
 *
 * Aplică automat CSS variables pe :root pentru tema vizuală:
 *   --tenant-primary     → culoarea primară (butoane, accente)
 *   --tenant-primary-hover → varianta mai închisă pentru hover
 *
 * Actualizează automat:
 *   - document.title  → numele organizației
 *   - CSS variables   → culorile temei
 *
 * Valori default (dacă fetch-ul eșuează sau e în curs):
 *   name:         "CRM Platform"
 *   primaryColor: "#1677ff"  (albastru Ant Design default)
 *   logoUrl:      ""         (frontend afișează text în loc de logo)
 *
 * @returns {{ config: TenantConfig, loading: boolean }}
 *
 * @typedef {Object} TenantConfig
 * @property {string} name          - Numele organizației
 * @property {string} logoUrl       - URL logo (gol = placeholder text)
 * @property {string} primaryColor  - Culoare primară hex
 * @property {string} secondaryColor - Culoare secundară hex (poate fi gol)
 * @property {string} website       - Site-ul organizației
 * @property {string} phone         - Telefon de contact
 * @property {string} supportEmail  - Email de suport
 */

const DEFAULT_CONFIG = {
    name:            "CRM Platform",
    logoUrl:         "",
    primaryColor:    "#1677ff",
    secondaryColor:  "",
    website:         "",
    phone:           "",
    supportEmail:    "",
};

/**
 * Derivă o culoare de hover mai închisă din culoarea primară.
 * Simplu: reduce luminozitatea cu ~15%.
 * Pentru producție se poate înlocui cu o librărie color (tinycolor2 etc.)
 */
function darkenColor(hex, amount = 20) {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function useTenantConfig() {
    const [config, setConfig]   = useState(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchConfig() {
            try {
                const res = await fetch("/api/public/tenant-config");
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                if (cancelled) return;

                // Merge cu default-urile pentru câmpurile lipsă
                const merged = { ...DEFAULT_CONFIG, ...data };
                setConfig(merged);

                // ── Aplică CSS variables pe :root ──────────────────────────────
                const root = document.documentElement;
                root.style.setProperty("--tenant-primary",       merged.primaryColor);
                root.style.setProperty("--tenant-primary-hover", darkenColor(merged.primaryColor));

                if (merged.secondaryColor) {
                    root.style.setProperty("--tenant-secondary", merged.secondaryColor);
                }

                // ── Actualizează titlul tab-ului ───────────────────────────────
                if (merged.name) {
                    document.title = merged.name;
                }

            } catch (e) {
                // Eșec silențios — se folosesc valorile default
                // Aplicația funcționează chiar dacă tenant-config nu e disponibil
                console.warn("useTenantConfig: nu am putut încărca configurarea tenant-ului:", e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchConfig();
        return () => { cancelled = true; };
    }, []);

    return { config, loading };
}
