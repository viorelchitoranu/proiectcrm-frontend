import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Space, Table, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { parentApi } from "../parentApi.js";

const { Title, Text } = Typography;

function safe(v) {
    return v === null || v === undefined || v === "" ? "—" : v;
}

export default function ParentChildrenPage() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [children, setChildren] = useState([]);

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                setLoading(true);
                const res = await parentApi.getChildren();
                if (!active) return;
                setChildren(Array.isArray(res) ? res : []);
            } catch (e) {
                message.error(e?.message || "Nu pot încărca lista copiilor.");
                if (active) setChildren([]);
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    const columns = [
        {
            title: "Copil",
            key: "child",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>
                        {safe(r.lastName)} {safe(r.firstName)}
                    </Text>
                    <Text type="secondary">
                        {r.age ?? "—"} ani
                    </Text>
                </Space>
            ),
        },
        {
            title: "Școală",
            key: "school",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text>{safe(r.school)}</Text>
                    <Text type="secondary">{safe(r.schoolClass)}</Text>
                </Space>
            ),
        },
        {
            title: "Acțiuni",
            key: "actions",
            width: 220,
            render: (_, r) => (
                <Space wrap>
                    <Button
                        type="link"
                        onClick={() => navigate(`/parent/children/${r.childId}/enrollments`)}
                    >
                        Înscrieri
                    </Button>

                    <Button
                        type="link"
                        onClick={() => navigate("/parent/schedule", { state: { childId: r.childId } })}
                    >
                        Program
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Title level={3} style={{ margin: 0 }}>
                Copiii mei
            </Title>

            <Card>
                {children.length === 0 && !loading ? (
                    <Alert
                        type="info"
                        showIcon
                        title="Nu există copii asociați acestui cont."
                    />
                ) : (
                    <Table
                        rowKey="childId"
                        loading={loading}
                        columns={columns}
                        dataSource={children}
                        pagination={false}
                    />
                )}
            </Card>
        </Space>
    );
}