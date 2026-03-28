import React, { useEffect, useState } from "react";
import {
    Button, Card, Col, Descriptions, Divider, Row,
    Space, Statistic, Table, Tag, Typography, message,
} from "antd";
import {
    DownloadOutlined, EyeOutlined,
    FilePdfOutlined, FileExcelOutlined,
    PrinterOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { http, HttpError } from "../http.jsx";
import { usePrintAndExport } from "../usePrintAndExport.js";

const { Title, Text } = Typography;

// ── Render functions extrase pentru a reduce Cognitive Complexity ─────────────
function renderEnrolled(v)  { return <Tag color="blue">{v}</Tag>; }
function renderTaught(v)    { return <Tag color="green">{v}</Tag>; }
function renderCanceled(v)  { return v > 0 ? <Tag color="red">{v}</Tag> : <Tag>{v}</Tag>; }
function renderPlanned(v)   { return <Tag color="orange">{v}</Tag>; }

const RENDER_MAP = {
    enrolledChildren: renderEnrolled,
    taughtSessions:   renderTaught,
    canceledSessions: renderCanceled,
    plannedSessions:  renderPlanned,
};

const EXPORT_COLUMNS = [
    { title: "Grupă",         dataIndex: "groupName" },
    { title: "Curs",          dataIndex: "courseName" },
    { title: "Școală",        dataIndex: "schoolName" },
    { title: "Înscriși",      dataIndex: "enrolledChildren" },
    { title: "Total sesiuni", dataIndex: "totalSessions" },
    { title: "Ținute",        dataIndex: "taughtSessions" },
    { title: "Anulate",       dataIndex: "canceledSessions" },
    { title: "Planificate",   dataIndex: "plannedSessions" },
];

// ── Helper descărcare fișier binar de la server ───────────────────────────────
async function downloadFromServer(url, filename) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
}

export default function AdminReportsEnhanced() {
    const [rows,           setRows]           = useState([]);
    const [loading,        setLoading]        = useState(false);
    const [selected,       setSelected]       = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Loading states pentru rapoartele server-side
    const [loadingExcel,   setLoadingExcel]   = useState(false);
    const [loadingPdfSum,  setLoadingPdfSum]  = useState(false);
    const [loadingPdfLun,  setLoadingPdfLun]  = useState(false);

    const { printRef, handlePrint, exportExcel } = usePrintAndExport("Raport Grupe");

    const columns = [
        ...EXPORT_COLUMNS.map(c => ({
            ...c,
            key:    c.dataIndex,
            render: RENDER_MAP[c.dataIndex],
        })),
        {
            title: "Acțiuni", key: "actions",
            render: (_, row) => (
                <Space size="small">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => loadDetails(row.groupId)}>
                        Detalii
                    </Button>
                    <Button size="small" icon={<FilePdfOutlined />} type="link"
                        onClick={() => downloadFisaGrupa(row.groupId, row.groupName)}>
                        PDF Fișă
                    </Button>
                </Space>
            ),
        },
    ];

    const load = async () => {
        setLoading(true);
        try {
            const data = await http.get("/api/admin/reports/groups");
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            message.error(e?.message || "Eroare la încărcarea rapoartelor.");
        } finally {
            setLoading(false);
        }
    };

    const loadDetails = async (groupId) => {
        setDetailsLoading(true);
        setSelected(null);
        try {
            const data = await http.get(`/api/admin/reports/groups/${groupId}`);
            setSelected(data);
        } catch (e) {
            if (e instanceof HttpError) message.error(`${e.status}: ${e.message}`);
            else message.error(e?.message || "Eroare la detalii.");
        } finally {
            setDetailsLoading(false);
        }
    };

    // ── Descărcări server-side ────────────────────────────────────────────────

    const downloadExcel = async () => {
        setLoadingExcel(true);
        try {
            await downloadFromServer(
                "/api/admin/reports/groups/excel",
                `raport_grupe_${new Date().toISOString().slice(0,10)}.xlsx`
            );
            message.success("Excel descărcat cu succes.");
        } catch (e) {
            message.error("Eroare la generarea Excel: " + e.message);
        } finally {
            setLoadingExcel(false);
        }
    };

    const downloadPdfSumar = async () => {
        setLoadingPdfSum(true);
        try {
            await downloadFromServer(
                "/api/admin/reports/groups/pdf/sumar",
                `sumar_grupe_${new Date().toISOString().slice(0,10)}.pdf`
            );
            message.success("PDF Sumar descărcat.");
        } catch (e) {
            message.error("Eroare la generarea PDF: " + e.message);
        } finally {
            setLoadingPdfSum(false);
        }
    };

    const downloadPdfLunare = async () => {
        setLoadingPdfLun(true);
        try {
            await downloadFromServer(
                "/api/admin/reports/groups/pdf/lunare",
                `prezente_lunare_${new Date().toISOString().slice(0,10)}.pdf`
            );
            message.success("PDF Prezențe Lunare descărcat.");
        } catch (e) {
            message.error("Eroare la generarea PDF: " + e.message);
        } finally {
            setLoadingPdfLun(false);
        }
    };

    const downloadFisaGrupa = async (groupId, groupName) => {
        try {
            await downloadFromServer(
                `/api/admin/reports/groups/${groupId}/pdf/fisa`,
                `fisa_${groupName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`
            );
            message.success(`Fișă grupă descărcată.`);
        } catch (e) {
            message.error("Eroare la generarea PDF: " + e.message);
        }
    };

    const exportCsv = async () => {
        try {
            const res = await fetch("/api/admin/reports/groups/csv");
            if (!res.ok) throw new Error(`Export CSV eșuat (${res.status})`);
            const csv  = await res.text();
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href = url; a.download = "group_stats.csv";
            document.body.appendChild(a); a.click();
            a.remove(); URL.revokeObjectURL(url);
            message.success("CSV exportat.");
        } catch (e) {
            message.error(e?.message || "Eroare la export CSV.");
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Rapoarte Grupe</Title>
                <Text type="secondary">Statistici sesiuni și prezențe per grupă.</Text>
            </div>

            {/* ── Rapoarte server-side (Excel + PDF) ────────────────────────── */}
            <Card title="Rapoarte Complete (Server-side)">
                <Row gutter={[12, 12]}>
                    <Col>
                        <Button
                            icon={<FileExcelOutlined />}
                            loading={loadingExcel}
                            onClick={downloadExcel}
                            style={{ color: "#217346", borderColor: "#217346" }}
                        >
                            Excel Complet (4 sheet-uri)
                        </Button>
                    </Col>
                    <Col>
                        <Button
                            icon={<FilePdfOutlined />}
                            loading={loadingPdfSum}
                            onClick={downloadPdfSumar}
                            danger
                        >
                            PDF Sumar Grupe
                        </Button>
                    </Col>
                    <Col>
                        <Button
                            icon={<FilePdfOutlined />}
                            loading={loadingPdfLun}
                            onClick={downloadPdfLunare}
                            danger
                        >
                            PDF Prezențe Lunare
                        </Button>
                    </Col>
                </Row>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
                    Rapoartele Excel și PDF sunt generate de server — includ date complete, stiluri profesionale și sunt optimizate pentru imprimare.
                    Fișa PDF per grupă este disponibilă în coloana "Acțiuni" din tabelul de mai jos.
                </Text>
            </Card>

            {/* ── Tabel cu export simplu ─────────────────────────────────────── */}
            <Card title="Statistici Grupe">
                <Space style={{ marginBottom: 16 }} wrap>
                    <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Reîncarcă</Button>
                    <Button icon={<PrinterOutlined />} onClick={handlePrint} disabled={rows.length === 0}>Print</Button>
                    <Button icon={<DownloadOutlined />}
                        onClick={() => exportExcel(rows, EXPORT_COLUMNS, "raport_grupe", "Grupe")}
                        disabled={rows.length === 0}>
                        Export Excel (Browser)
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={exportCsv} disabled={rows.length === 0}>
                        Export CSV
                    </Button>
                </Space>

                <div ref={printRef}>
                    <Table
                        rowKey="groupId"
                        loading={loading}
                        dataSource={rows}
                        columns={columns}
                        size="small"
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: true }}
                    />
                </div>
            </Card>

            {(selected || detailsLoading) && (
                <GroupDetails
                    data={selected}
                    loading={detailsLoading}
                    exportExcel={exportExcel}
                    onDownloadPdf={downloadFisaGrupa}
                    onClose={() => setSelected(null)}
                />
            )}
        </Space>
    );
}

function GroupDetails({ data, loading, exportExcel, onDownloadPdf, onClose }) {
    const { printRef, handlePrint } = usePrintAndExport(`Detalii ${data?.groupName || "Grupă"}`);

    if (loading) return <Card loading />;
    if (!data)   return null;

    const statsRows = [
        { label: "Copii înscriși",      value: data.enrolledChildren },
        { label: "Total sesiuni",        value: data.totalSessions },
        { label: "Sesiuni ținute",       value: data.taughtSessions },
        { label: "Sesiuni anulate",      value: data.canceledSessions },
        { label: "Sesiuni planificate",  value: data.plannedSessions },
    ];
    const statsCols = [
        { title: "Indicator", dataIndex: "label" },
        { title: "Valoare",   dataIndex: "value" },
    ];

    return (
        <Card
            title={`Detalii: ${data.groupName}`}
            extra={
                <Space>
                    <Button size="small" icon={<FilePdfOutlined />} danger
                        onClick={() => onDownloadPdf(data.groupId, data.groupName)}>
                        PDF Fișă
                    </Button>
                    <Button size="small" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                    <Button size="small" icon={<DownloadOutlined />}
                        onClick={() => exportExcel(statsRows, statsCols, `detalii_${data.groupName}`)}>
                        Excel
                    </Button>
                    <Button size="small" onClick={onClose}>Închide</Button>
                </Space>
            }
        >
            <div ref={printRef}>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}><Statistic title="Înscriși"      value={data.enrolledChildren} /></Col>
                    <Col span={6}><Statistic title="Total sesiuni" value={data.totalSessions} /></Col>
                    <Col span={6}><Statistic title="Ținute"        value={data.taughtSessions}  valueStyle={{ color: "#52c41a" }} /></Col>
                    <Col span={6}><Statistic title="Anulate"       value={data.canceledSessions} valueStyle={{ color: "#f5222d" }} /></Col>
                </Row>
                <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="Grupă">{data.groupName}</Descriptions.Item>
                    <Descriptions.Item label="Curs">{data.courseName || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Școală">{data.schoolName || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Planificate">{data.plannedSessions}</Descriptions.Item>
                </Descriptions>
            </div>
        </Card>
    );
}
