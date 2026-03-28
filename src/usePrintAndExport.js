import { useRef, useCallback } from "react";
import { message } from "antd";

/**
 * Hook reutilizabil pentru print și export Excel (ExcelJS).
 *
 * Dependențe: exceljs (npm install exceljs)
 * ExcelJS e activ menținut și fără vulnerabilități cunoscute,
 * spre deosebire de SheetJS/xlsx care are vulnerabilități nerezolvate.
 *
 * Utilizare:
 *   const { printRef, handlePrint, exportExcel } = usePrintAndExport("Titlu Document");
 *
 *   <div ref={printRef}>...</div>
 *   <Button onClick={handlePrint}>Print</Button>
 *   <Button onClick={() => exportExcel(rows, columns, "fisier")}>Export Excel</Button>
 *
 * @param {string} documentTitle - Titlul documentului la print
 */
export function usePrintAndExport(documentTitle = "Raport CRM") {
    const printRef = useRef(null);

    // ── Print ─────────────────────────────────────────────────────────────────
    const handlePrint = useCallback(() => {
        const content = printRef.current;
        if (!content) {
            message.warning("Nu există conținut de printat.");
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            message.error("Browser-ul a blocat fereastra de print. Permite pop-up-uri pentru acest site.");
            return;
        }

        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>${documentTitle}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; color: #333; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        h1, h2, h3, h4 { color: #1677ff; margin-bottom: 8px; }
        .no-print, button { display: none !important; }
        @page { margin: 15mm; size: A4; }
    </style>
</head>
<body>
    <h2>${documentTitle}</h2>
    <p style="color:#999;font-size:11px;margin-bottom:16px">
        Generat: ${new Date().toLocaleString("ro-RO")}
    </p>
    ${content.innerHTML}
</body>
</html>`);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 600);
    }, [documentTitle]);

    // ── Export Excel (ExcelJS — import dinamic) ───────────────────────────────
    /**
     * @param {Array<Object>}             data      - Array de obiecte (rândurile)
     * @param {Array<{title, dataIndex}>} columns   - Coloanele Ant Design Table
     * @param {string}                    filename  - Numele fișierului (fără extensie)
     * @param {string}                    sheetName - Numele sheet-ului Excel
     */
    const exportExcel = useCallback(async (data, columns, filename = "export", sheetName = "Date") => {
        if (!data || data.length === 0) {
            message.warning("Nu există date de exportat.");
            return;
        }

        try {
            const ExcelJS   = await import("exceljs");
            const workbook  = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(sheetName);

            const validCols = columns.filter(col => col.dataIndex && col.title);

            // ── Coloane cu lățimi auto-calculate ─────────────────────────────
            worksheet.columns = validCols.map(col => ({
                header: col.title,
                key:    col.dataIndex,
                width:  Math.min(
                    Math.max(
                        col.title.length + 2,
                        ...data.map(row => String(row[col.dataIndex] ?? "").length)
                    ) + 2,
                    40
                ),
            }));

            // ── Stil header — bold + fundal gri ──────────────────────────────
            worksheet.getRow(1).eachCell(cell => {
                cell.font      = { bold: true };
                cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
                cell.border    = {
                    top:    { style: "thin" },
                    bottom: { style: "thin" },
                    left:   { style: "thin" },
                    right:  { style: "thin" },
                };
                cell.alignment = { vertical: "middle" };
            });

            // ── Rânduri de date cu fundal alternant ───────────────────────────
            data.forEach((row, idx) => {
                const rowData = {};
                validCols.forEach(col => {
                    const val = row[col.dataIndex];
                    rowData[col.dataIndex] = (val === null || val === undefined)
                        ? ""
                        : typeof val === "object" ? String(val) : val;
                });

                const excelRow = worksheet.addRow(rowData);
                if (idx % 2 === 1) {
                    excelRow.eachCell(cell => {
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
                    });
                }
            });

            // ── Descarcă fișierul ─────────────────────────────────────────────
            const buffer = await workbook.xlsx.writeBuffer();
            const blob   = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const a   = document.createElement("a");
            a.href     = url;
            a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            message.success("Fișierul Excel a fost descărcat.");
        } catch (e) {
            message.error("Eroare la exportul Excel: " + e.message);
        }
    }, []);

    return { printRef, handlePrint, exportExcel };
}
