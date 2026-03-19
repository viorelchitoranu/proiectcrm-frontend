import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Typography, Button, Space, Drawer, Tag, message } from "antd";
import { EyeOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";

import { http, HttpError } from "../http.jsx";

const { Title, Text } = Typography;

function safe(v) {
    return v === null || v === undefined || v === "" ? "-" : v;
}

function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export default function AdminReports() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [selected, setSelected] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await http.get("/api/admin/reports/groups");
            setRows(Array.isArray(data) ? data : []);
        } catch (err) {
            message.error(err?.message || "Eroare la încărcarea rapoartelor");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openDetails = async (groupId) => {
        setDrawerOpen(true);
        setDrawerLoading(true);
        setSelected(null);

        try {
            const data = await http.get(`/api/admin/reports/groups/${groupId}`);
            setSelected(data);
        } catch (err) {
            if (err instanceof HttpError) {
                message.error(`${err.status}: ${err.message}`);
            } else {
                message.error(err?.message || "Eroare la încărcarea detaliilor");
            }
            setDrawerOpen(false);
        } finally {
            setDrawerLoading(false);
        }
    };

    const exportCsv = async () => {
        try {

            const res = await fetch("/api/admin/reports/groups/csv", { method: "GET" });
            if (!res.ok) throw new Error(`Export CSV eșuat (${res.status})`);
            const csv = await res.text();
            downloadBlob(csv, "group_stats.csv", "text/csv;charset=utf-8");
            message.success("CSV exportat.");
        } catch (err) {
            message.error(err?.message || "Eroare la export CSV");
        }
    };

    const columns = useMemo(
        () => [
            { title: "ID", dataIndex: "groupId", key: "groupId", width: 80 },
            { title: "Grupă", dataIndex: "groupName", key: "groupName" },
            { title: "Curs", dataIndex: "courseName", key: "courseName", render: safe },
            { title: "Școală", dataIndex: "schoolName", key: "schoolName", render: safe },
            {
                title: "Copii activi",
                dataIndex: "enrolledChildren",
                key: "enrolledChildren",
                width: 120,
            },
            {
                title: "Total sesiuni",
                dataIndex: "totalSessions",
                key: "totalSessions",
                width: 120,
                render: (v) => <Tag>{v}</Tag>,
            },
            {
                title: "TAUGHT",
                dataIndex: "taughtSessions",
                key: "taughtSessions",
                width: 110,
                render: (v) => <Tag color="green">{v}</Tag>,
            },
            {
                title: "CANCELED",
                dataIndex: "canceledSessions",
                key: "canceledSessions",
                width: 120,
                render: (v) => <Tag color="volcano">{v}</Tag>,
            },
            {
                title: "PLANNED",
                dataIndex: "plannedSessions",
                key: "plannedSessions",
                width: 120,
                render: (v) => <Tag color="blue">{v}</Tag>,
            },
            {
                title: "Acțiuni",
                key: "actions",
                width: 130,
                render: (_, r) => (
                    <Button icon={<EyeOutlined />} onClick={() => openDetails(r.groupId)}>
                        Detalii
                    </Button>
                ),
            },
        ],
        []
    );

    return (
        <>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Title level={3} style={{ margin: 0 }}>
                    Admin Reports – Grupe
                </Title>

                <Space>
                    <Button icon={<DownloadOutlined />} onClick={exportCsv}>
                        Export CSV
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
                        Refresh
                    </Button>
                </Space>
            </Space>

            <Card style={{ marginTop: 16 }} title="Statistici pe grupe">
                <Table
                    rowKey={(r) => `${r.groupId}`}
                    columns={columns}
                    dataSource={rows}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Drawer
                title={selected ? `Detalii grupă #${selected.groupId}` : "Detalii grupă"}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={520}
            >
                {drawerLoading && <Text>Se încarcă...</Text>}

                {!drawerLoading && selected && (
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <Text>
                            <Text strong>Grupă:</Text> {safe(selected.groupName)}
                        </Text>
                        <Text>
                            <Text strong>Curs:</Text> {safe(selected.courseName)}
                        </Text>
                        <Text>
                            <Text strong>Școală:</Text> {safe(selected.schoolName)}
                        </Text>

                        <Card size="small" title="Sesiuni">
                            <Space wrap>
                                <Tag>{`Total: ${selected.totalSessions}`}</Tag>
                                <Tag color="green">{`TAUGHT: ${selected.taughtSessions}`}</Tag>
                                <Tag color="volcano">{`CANCELED: ${selected.canceledSessions}`}</Tag>
                                <Tag color="blue">{`PLANNED: ${selected.plannedSessions}`}</Tag>
                            </Space>
                        </Card>

                        <Card size="small" title="Copii">
                            <Tag>{`Copii activi: ${selected.enrolledChildren}`}</Tag>
                        </Card>
                    </Space>
                )}
            </Drawer>
        </>
    );
}