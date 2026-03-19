import React from "react";
import { Button, Result } from "antd";
import { logError } from "./logApi.js";

/**
 * ErrorBoundary — componentă React care interceptează crash-urile JavaScript
 * în arborele de componente și le loghează la backend.
 *
 * Cum funcționează React Error Boundaries:
 *   Când o componentă React aruncă o eroare în render() sau lifecycle methods,
 *   React "desfășoară" arborele de componente până găsește cel mai apropiat
 *   Error Boundary. Fără Error Boundary → întreaga aplicație se blochează pe
 *   un ecran alb fără niciun mesaj de eroare pentru utilizator.
 *
 * Ce face acest ErrorBoundary:
 *   1. Interceptează eroarea înainte ca React să blocheze UI-ul
 *   2. Trimite eroarea la backend (POST /api/public/client-log) — fire-and-forget
 *   3. Afișează un mesaj prietenos utilizatorului în locul ecranului alb
 *   4. Oferă buton "Reîncarcă pagina" pentru a permite recuperarea
 *
 * IMPORTANT: Error Boundaries sunt clase React (nu funcționale).
 * componentDidCatch() și getDerivedStateFromError() nu există ca hooks.
 * Acesta este singurul caz justificat pentru class component în codebase.
 *
 * Utilizare în App.jsx:
 *   <ErrorBoundary section="AdminLayout">
 *     <AdminLayout />
 *   </ErrorBoundary>
 *
 * Sau pe pagini individuale pentru granularitate mai mare:
 *   <ErrorBoundary section="AdminParentsPage">
 *     <AdminParentsPage />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        // hasError: controlează dacă afișăm UI-ul de fallback sau arborele normal
        this.state = { hasError: false };
    }

    /**
     * Apelat de React când o componentă descendentă aruncă o eroare.
     * Returnează noul state — React îl aplică înainte de re-render.
     * STATIC: nu are acces la `this` — nu poate trimite loguri de aici.
     */
    static getDerivedStateFromError() {
        // Comutăm pe UI-ul de fallback
        return { hasError: true };
    }

    /**
     * Apelat după ce getDerivedStateFromError() a actualizat state-ul.
     * Primește eroarea și informații despre componenta care a cauzat crash-ul.
     * Aici trimitem logul la backend.
     *
     * @param {Error}  error      - obiectul Error JavaScript
     * @param {Object} errorInfo  - { componentStack: "..." } — traseul componentelor
     */
    componentDidCatch(error, errorInfo) {
        // Combinăm stack trace-ul erorii cu component stack-ul React
        // pentru a putea identifica exact ce componentă a cauzat crash-ul
        const fullStack = [
            error?.stack || "",
            errorInfo?.componentStack ? "\n\nComponent stack:" + errorInfo.componentStack : "",
        ].join("");

        // Trimitem la backend — fire-and-forget, nu blocăm UI-ul
        // section vine din props (ex: "AdminParentsPage", "AdminLayout")
        logError(
            { message: error?.message || String(error), stack: fullStack },
            this.props.section || "unknown"
        );
    }

    render() {
        if (this.state.hasError) {
            // UI de fallback — mai bun decât un ecran alb complet
            return (
                <Result
                    status="error"
                    title="Ceva nu a funcționat"
                    subTitle={
                        "A apărut o eroare neașteptată" +
                        (this.props.section ? ` în secțiunea „${this.props.section}"` : "") +
                        ". Echipa a fost notificată automat."
                    }
                    extra={
                        <Button
                            type="primary"
                            onClick={() => {
                                // Reset state → permite re-render-ul arborelui normal
                                // Dacă eroarea era tranzitorie (ex: race condition) → UI se recuperează
                                this.setState({ hasError: false });
                                // Dacă eroarea persistă → getDerivedStateFromError va seta hasError=true din nou
                                window.location.reload();
                            }}
                        >
                            Reîncarcă pagina
                        </Button>
                    }
                />
            );
        }

        // Render normal — afișăm copiii dacă nu există eroare
        return this.props.children;
    }
}

export default ErrorBoundary;
