import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Typography, Space, Tag, Button, message, Tooltip } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { http } from "../http.jsx";

const { Title, Text } = Typography;

function safe(v) {
    return v === null || v === undefined || v === "" ? "—" : v;
}

function statusTag(v) {
    if (!v) return <Tag>—</Tag>;
    if (v === "PRESENT") return <Tag color="green">PRESENT</Tag>;
    if (v === "ABSENT") return <Tag color="red">ABSENT</Tag>;
    if (v === "EXCUSED") return <Tag color="blue">EXCUSED</Tag>;
    if (v === "PENDING") return <Tag color="gold">PENDING</Tag>;
    if (String(v).includes("CANCEL")) return <Tag color="volcano">{v}</Tag>;
    if (String(v).includes("RECOVERY")) return <Tag color="purple">{v}</Tag>;
    return <Tag>{v}</Tag>;
}

function sessionStatusTag(v) {
    if (!v) return <Tag>—</Tag>;
    if (v === "PLANNED") return <Tag color="blue">PLANNED</Tag>;
    if (v === "TAUGHT") return <Tag color="green">TAUGHT</Tag>;
    if (String(v).startsWith("CANCELED")) return <Tag color="red">{v}</Tag>;
    return <Tag>{v}</Tag>;
}

export default function AdminAttendanceArchivePage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            // dacă vrei limit, poți da: http.get("/api/admin/attendance-archive", { limit: 500 })
            const data = await http.get("/api/admin/attendance-archive");
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            message.error(e?.message || "Nu pot încărca arhiva.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const columns = useMemo(() => [
        {
            title: "Archived at",
            dataIndex: "archivedAt",
            key: "archivedAt",
            width: 180,
            render: safe
        },
        {
            title: "Sesiune",
            key: "sess",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{safe(r.sessionDate)} · {String(r.sessionTime || "").slice(0, 5)}</Text>
                    <Text type="secondary">
                        {safe(r.groupName)} · {safe(r.courseName)} · {safe(r.schoolName)}
                    </Text>
                    <Space size="small">
                        {sessionStatusTag(r.sessionStatus)}
                        <Tag>{safe(r.sessionType)}</Tag>
                        {r.isRecovery ? <Tag color="purple">is_recovery</Tag> : <Tag>regular</Tag>}
                    </Space>
                </Space>
            )
        },
        {
            title: "Copil / Părinte",
            key: "cp",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{safe(r.childLastName)} {safe(r.childFirstName)}</Text>
                    <Text type="secondary">
                        {safe(r.parentName)} · {safe(r.parentPhone)} · {safe(r.parentEmail)}
                    </Text>
                </Space>
            )
        },
        {
            title: "Attendance",
            dataIndex: "attendanceStatus",
            key: "attendanceStatus",
            width: 160,
            render: statusTag
        },
        {
            title: "Teacher",
            dataIndex: "teacherName",
            key: "teacherName",
            width: 180,
            render: safe
        },
        {
            title: "Notă",
            dataIndex: "nota",
            key: "nota",
            render: (v) => {
                const txt = safe(v);
                return (
                    <Tooltip title={txt === "—" ? "" : txt}>
                        <span>{txt.length > 60 ? txt.slice(0, 60) + "…" : txt}</span>
                    </Tooltip>
                );
            }
        },
    ], []);

    return (
        <>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Attendance Archive</Title>
                    <Text type="secondary">Vizualizare read-only din tabela attendance_archive.</Text>
                </div>

                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
                    Refresh
                </Button>
            </Space>

            <Card style={{ marginTop: 16 }}>
                <Table
                    rowKey={(r) => String(r.idAttendanceArchive)}
                    loading={loading}
                    columns={columns}
                    dataSource={rows}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </>
    );
}