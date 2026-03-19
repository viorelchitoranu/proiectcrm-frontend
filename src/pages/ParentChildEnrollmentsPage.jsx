import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Space, Table, Typography, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { parentApi } from "../parentApi.js";

const { Title, Text } = Typography;

function safe(v) {
    return v === null || v === undefined || v === "" ? "—" : v;
}

export default function ParentChildEnrollmentsPage() {
    const navigate = useNavigate();
    const { childId } = useParams();

    const [loading, setLoading] = useState(false);
    const [enrollments, setEnrollments] = useState([]);

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                setLoading(true);
                const res = await parentApi.getChildEnrollments(childId);
                if (!active) return;
                setEnrollments(Array.isArray(res) ? res : []);
            } catch (e) {
                message.error(e?.message || "Nu pot încărca înscrierile copilului.");
                if (active) setEnrollments([]);
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [childId]);

    const columns = [
        {
            title: "Grupă",
            key: "group",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{safe(r.groupName)}</Text>
                    <Text type="secondary">
                        {safe(r.courseName)} · {safe(r.schoolName)}
                    </Text>
                </Space>
            ),
        },
        {
            title: "Program",
            key: "program",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text>{safe(r.startDate)} → {safe(r.endDate)}</Text>
                    <Text type="secondary">
                        Ora: {safe(r.sessionStartTime)}
                    </Text>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (v) => <Text>{safe(v)}</Text>,
        },
        {
            title: "Acțiuni",
            key: "actions",
            width: 160,
            render: (_, r) => (
                <Button
                    type="link"
                    onClick={() => navigate(`/parent/schedule/${childId}/${r.groupId}`)}
                >
                    Vezi programul
                </Button>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Space>
                <Button onClick={() => navigate("/parent/children")}>
                    Înapoi
                </Button>
                <Title level={3} style={{ margin: 0 }}>
                    Înscrierile copilului
                </Title>
            </Space>

            <Card>
                {enrollments.length === 0 && !loading ? (
                    <Alert
                        type="info"
                        showIcon
                        title="Acest copil nu are înscrieri active."
                    />
                ) : (
                    <Table
                        rowKey={(r) => `${r.groupId}-${r.startDate || ""}`}
                        loading={loading}
                        columns={columns}
                        dataSource={enrollments}
                        pagination={false}
                    />
                )}
            </Card>
        </Space>
    );
}
