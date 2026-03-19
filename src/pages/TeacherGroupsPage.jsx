import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Table, Typography, Space, Button, Tag, message } from "antd";
const { Text } = Typography;
import { useNavigate } from "react-router-dom";
import { teacherApi } from "../teacherApi.js";

const { Title } = Typography;

function statusTag(status) {
    if (status === "NOT_STARTED") return <Tag>Not started</Tag>;
    if (status === "ONGOING") return <Tag color="green">Ongoing</Tag>;
    if (status === "FINISHED") return <Tag>Finished</Tag>;
    return <Tag>{status || "—"}</Tag>;
}

export default function TeacherGroupsPage() {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await teacherApi.getTeacherGroups();
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            message.error(e?.message || "Nu pot încărca grupele.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns = useMemo(
        () => [
            {
                title: "Grupă",
                dataIndex: "groupName",
                key: "groupName",
                render: (v, r) => (
                    <Space direction="vertical" size={0}>
                        <Text strong>{v}</Text>
                        <Text type="secondary">
                            {r.courseName || "—"} · {r.schoolName || "—"}
                        </Text>
                    </Space>
                ),
            },
            {
                title: "Perioadă",
                key: "period",
                render: (_, r) => (
                    <Space direction="vertical" size={0}>
                        <Text>
                            {r.startDate || "—"} → {r.endDate || "—"}
                        </Text>
                        <Text type="secondary">
                            Ora: {String(r.sessionStartTime || "").slice(0, 5) || "—"}
                        </Text>
                    </Space>
                ),
            },
            {
                title: "Progres",
                key: "progress",
                render: (_, r) => (
                    <Space direction="vertical" size={0}>
                        <Text>{r.progressPercent ?? 0}%</Text>
                        <Text type="secondary">
                            TAUGHT: {r.heldSessions ?? 0} / {r.totalSessions ?? 0} · Cancel: {r.cancelledSessions ?? 0}
                        </Text>
                    </Space>
                ),
            },
            {
                title: "Copii activi",
                key: "activeChildren",
                render: (_, r) => <Text>{r.activeChildren ?? r.enrolledChildrenCount ?? 0}</Text>,
            },
            {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: (v) => statusTag(v),
            },
            {
                title: "Acțiuni",
                key: "actions",
                render: (_, r) => (
                    <Space>
                        <Button onClick={() => navigate(`/teacher/groups/${r.groupId}/sessions`)}>
                            Vezi sesiuni
                        </Button>

                        <Button
                            type="primary"
                            disabled={!!r.startConfirmedAt || r.status === "FINISHED"}
                            onClick={async () => {
                                try {
                                    await teacherApi.startGroup(r.groupId);
                                    message.success("Grupa a fost pornită.");
                                    fetchData();
                                } catch (e) {
                                    message.error(e?.message || "Nu pot porni grupa.");
                                }
                            }}
                        >
                            Start
                        </Button>
                    </Space>
                ),
            },
        ],
        [navigate, fetchData]
    );

    return (
        <Card>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        Grupele mele
                    </Title>
                    <Text type="secondary">
                        Vizualizează progresul și intră pe sesiuni pentru prezență.
                    </Text>
                </div>

                <Table
                    rowKey="groupId"
                    loading={loading}
                    columns={columns}
                    dataSource={rows}
                    pagination={{ pageSize: 10 }}
                />
            </Space>
        </Card>
    );
}