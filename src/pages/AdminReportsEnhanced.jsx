import React, { useEffect, useState } from "react";
import {
    Button, Card, Col, Descriptions, Row,
    Space, Statistic, Table, Tag, Typography, message,
} from "antd";
import { DownloadOutlined, EyeOutlined, PrinterOutlined, ReloadOutlined } from "@ant-design/icons";
import { http, HttpError } from "../http.jsx";
import { usePrintAndExport } from "../usePrintAndExport.js";

const { Title, Text } = Typography;

// ── Render functions extrase pentru a reduce Cognitive Complexity ─────────────
function renderEnrolled(v)  { return <Tag color="blue">{v}</Tag>; }
function renderTaught(v)    { return <Tag color="green">{v}</Tag>; }
function renderCanceled(v)  { return v > 0 ? <Tag color="red">{v}</Tag> : <Tag>{v}</Tag>; }
function renderPlanned(v)   { return <Tag color="orange">{v}</Tag>; }

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

const RENDER_MAP = {
    enrolledChildren: renderEnrolled,
    taughtSessions:   renderTaught,
    canceledSessions: renderCanceled,
    plannedSessions:  renderPlanned,
};

export default function AdminReportsEnhanced() {
    const [rows,           setRows]           = useState([]);
    const [loading,        setLoading]        = useState(false);
    const [selected,       setSelected]       = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

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
                <Button size="small" icon={<EyeOutlined />} onClick={() => loadDetails(row.groupId)}>
                    Detalii
                </Button>
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

            <Card>
                <Space style={{ marginBottom: 16 }} wrap>
                    <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Reîncarcă</Button>
                    <Button icon={<PrinterOutlined />} onClick={handlePrint} disabled={rows.length === 0}>Print</Button>
                    <Button icon={<DownloadOutlined />}
                        onClick={() => exportExcel(rows, EXPORT_COLUMNS, "raport_grupe", "Grupe")}
                        disabled={rows.length === 0}>
                        Export Excel
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
                    onClose={() => setSelected(null)}
                />
            )}
        </Space>
    );
}

function GroupDetails({ data, loading, exportExcel, onClose }) {
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
