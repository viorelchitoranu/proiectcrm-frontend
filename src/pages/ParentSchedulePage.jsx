import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Row, Space, Table, Typography, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { parentApi } from "../parentApi.js";

const { Title, Text } = Typography;

function safe(v) {
    return v === null || v === undefined || v === "" ? "—" : v;
}

export default function ParentSchedulePage() {
    const navigate = useNavigate();
    const location = useLocation();

    const initialChildId = location.state?.childId ?? null;

    const [loadingChildren, setLoadingChildren] = useState(false);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);

    const [children, setChildren] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState(initialChildId);
    const [enrollments, setEnrollments] = useState([]);

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                setLoadingChildren(true);
                const res = await parentApi.getChildren();
                if (!active) return;

                const list = Array.isArray(res) ? res : [];
                setChildren(list);

                if (!initialChildId && list.length > 0) {
                    setSelectedChildId(list[0].childId);
                }
            } catch (e) {
                message.error(e?.message || "Nu pot încărca lista copiilor.");
                if (active) setChildren([]);
            } finally {
                if (active) setLoadingChildren(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [initialChildId]);

    useEffect(() => {
        if (!selectedChildId) {
            setEnrollments([]);
            return;
        }

        let active = true;

        (async () => {
            try {
                setLoadingEnrollments(true);
                const res = await parentApi.getChildEnrollments(selectedChildId);
                if (!active) return;
                setEnrollments(Array.isArray(res) ? res : []);
            } catch (e) {
                message.error(e?.message || "Nu pot încărca grupele copilului.");
                if (active) setEnrollments([]);
            } finally {
                if (active) setLoadingEnrollments(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [selectedChildId]);

    const childColumns = [
        {
            title: "Copil",
            key: "child",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>
                        {safe(r.lastName)} {safe(r.firstName)}
                    </Text>
                    <Text type="secondary">
                        {safe(r.school)} · {safe(r.schoolClass)}
                    </Text>
                </Space>
            ),
        },
    ];

    const enrollmentColumns = [
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
                    <Text type="secondary">Ora: {safe(r.sessionStartTime)}</Text>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
        },
        {
            title: "Acțiuni",
            key: "actions",
            width: 160,
            render: (_, r) => (
                <Button
                    type="link"
                    onClick={() => navigate(`/parent/schedule/${selectedChildId}/${r.groupId}`)}
                >
                    Vezi programul
                </Button>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Title level={3} style={{ margin: 0 }}>
                Program
            </Title>

            <Row gutter={16}>
                <Col span={9}>
                    <Card title="Alege copilul">
                        <Table
                            rowKey="childId"
                            loading={loadingChildren}
                            columns={childColumns}
                            dataSource={children}
                            pagination={false}
                            onRow={(r) => ({
                                onClick: () => setSelectedChildId(r.childId),
                            })}
                            rowClassName={(r) =>
                                r.childId === selectedChildId ? "ant-table-row-selected" : ""
                            }
                        />
                    </Card>
                </Col>

                <Col span={15}>
                    <Card title="Grupe / programe">
                        {!selectedChildId ? (
                            <Alert
                                type="info"
                                showIcon
                                title="Selectează un copil din stânga."
                            />
                        ) : (
                            <Table
                                rowKey={(r) => `${r.groupId}-${selectedChildId}`}
                                loading={loadingEnrollments}
                                columns={enrollmentColumns}
                                dataSource={enrollments}
                                pagination={false}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </Space>
    );
}