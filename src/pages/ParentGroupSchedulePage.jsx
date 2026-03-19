import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Space, Table, Typography, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { parentApi } from "../parentApi.js";

const { Title, Text } = Typography;

function safe(v) {
    return v === null || v === undefined || v === "" ? "—" : v;
}

function readAttendanceStatus(row) {
    return row?.childAttendanceStatus ?? "—";
}

function readRecoveryFlag(row) {
    return row?.isRecoveryAttendance ?? false;
}

export default function ParentGroupSchedulePage() {
    const navigate = useNavigate();
    const { childId, groupId } = useParams();

    const [loading, setLoading] = useState(false);
    const [actingSessionId, setActingSessionId] = useState(null);
    const [details, setDetails] = useState(null);

    const loadSchedule = async () => {
        try {
            setLoading(true);
            const res = await parentApi.getChildGroupSchedule(childId, groupId);
            setDetails(res || null);
        } catch (e) {
            message.error(e?.message || "Nu pot încărca programul grupei.");
            setDetails(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchedule();
    }, [childId, groupId]);

    const doCancel = async (sessionId) => {
        try {
            setActingSessionId(sessionId);
            await parentApi.cancelChildSession(childId, sessionId);
            message.success("Cererea de anulare a fost trimisă.");
            await loadSchedule();
        } catch (e) {
            message.error(e?.message || "Nu am putut trimite cererea de anulare.");
        } finally {
            setActingSessionId(null);
        }
    };

    const doRecovery = async (sessionId) => {
        try {
            setActingSessionId(sessionId);
            await parentApi.requestRecoveryForChildSession(childId, sessionId);
            message.success("Cererea de recuperare a fost trimisă.");
            await loadSchedule();
        } catch (e) {
            message.error(e?.message || "Nu am putut trimite cererea de recuperare.");
        } finally {
            setActingSessionId(null);
        }
    };

    const columns = [
        {
            title: "Data / Ora",
            key: "when",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{safe(r.sessionDate)}</Text>
                    <Text type="secondary">{safe(r.time)}</Text>
                </Space>
            ),
        },
        {
            title: "Locație",
            key: "where",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text>{safe(r.schoolName)}</Text>
                    <Text type="secondary">{safe(r.schoolAddress)}</Text>
                </Space>
            ),
        },
        {
            title: "Sesiune",
            key: "sessionStatus",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text>{safe(r.sessionStatus)}</Text>
                    <Text type="secondary">
                        Status copil: {safe(readAttendanceStatus(r))}
                    </Text>
                </Space>
            ),
        },
        {
            title: "Recuperare",
            key: "recovery",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text>{readRecoveryFlag(r) ? "Da" : "Nu"}</Text>
                    <Text type="secondary">
                        Alocată la sesiunea: {safe(r.assignedToSessionId)}
                    </Text>
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
                        size="small"
                        onClick={() => doCancel(r.sessionId)}
                        disabled={!r.cancellable}
                        loading={actingSessionId === r.sessionId}
                    >
                        Anulează
                    </Button>

                    <Button
                        size="small"
                        onClick={() => doRecovery(r.sessionId)}
                        disabled={!r.recoveryRequestAllowed}
                        loading={actingSessionId === r.sessionId}
                    >
                        Cere recuperare
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Space>
                <Button onClick={() => navigate("/parent/schedule")}>
                    Înapoi
                </Button>
                <Title level={3} style={{ margin: 0 }}>
                    Program grupă
                </Title>
            </Space>

            <Card loading={loading}>
                {details ? (
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Text>
                            <Text strong>Copil:</Text>{" "}
                            {safe(details.childLastName)} {safe(details.childFirstName)}
                        </Text>
                        <Text>
                            <Text strong>Grupă:</Text> {safe(details.groupName)}
                        </Text>
                        <Text>
                            <Text strong>Curs:</Text> {safe(details.courseName)}
                        </Text>
                        <Text>
                            <Text strong>Școală:</Text> {safe(details.schoolName)}
                        </Text>
                        <Text>
                            <Text strong>Perioadă:</Text> {safe(details.startDate)} → {safe(details.endDate)}
                        </Text>
                        <Text>
                            <Text strong>Ora grupei:</Text> {safe(details.sessionStartTime)}
                        </Text>
                        <Text>
                            <Text strong>Status:</Text> {safe(details.status)}
                        </Text>
                    </Space>
                ) : (
                    <Alert
                        type="warning"
                        showIcon
                        title="Nu s-au putut încărca detaliile programului."
                    />
                )}
            </Card>

            <Card title="Sesiuni">
                <Table
                    rowKey="sessionId"
                    columns={columns}
                    dataSource={Array.isArray(details?.sessions) ? details.sessions : []}
                    pagination={false}
                    loading={loading}
                />
            </Card>
        </Space>
    );
}