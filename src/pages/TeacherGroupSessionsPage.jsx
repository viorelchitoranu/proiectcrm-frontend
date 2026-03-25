import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Table, Typography, Space, Button, Tag, message, Modal, Radio, Tooltip } from "antd";
import { useParams } from "react-router-dom";
import { teacherApi } from "../teacherApi.js";

const { Title, Text } = Typography;

function sessionStatusTag(status) {
    if (status === "PLANNED") return <Tag color="blue">PLANNED</Tag>;
    if (status === "TAUGHT") return <Tag color="green">TAUGHT</Tag>;
    if (String(status || "").startsWith("CANCELED")) return <Tag color="red">{status}</Tag>;
    return <Tag>{status || "—"}</Tag>;
}

export default function TeacherGroupSessionsPage() {
    const { groupId } = useParams();

    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);

    const [attOpen, setAttOpen] = useState(false);
    const [attLoading, setAttLoading] = useState(false);
    const [attSession, setAttSession] = useState(null);
    const [attRows, setAttRows] = useState([]);

    const attRowKey = (r) => r.attendanceId ?? `${r.childId}-${r.recovery ? "R" : "N"}`;

    const fetchSessions = useCallback(async () => {
        if (!groupId) return;

        setLoading(true);
        try {
            const data = await teacherApi.getGroupSessions(groupId);
            setSessions(Array.isArray(data) ? data : []);
        } catch (e) {
            message.error(e?.message || "Nu pot încărca sesiunile.");
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    const todayRO = useMemo(
        () =>
            new Intl.DateTimeFormat("en-CA", {
                timeZone: "Europe/Bucharest",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(new Date()),
        []
    );

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const openAttendance = async (s) => {
        setAttSession(s);
        setAttOpen(true);
        setAttLoading(true);

        try {
            const data = await teacherApi.getSessionAttendance(groupId, s.sessionId);
            setAttRows(Array.isArray(data) ? data : []);
        } catch (e) {
            message.error(e?.message || "Nu pot încărca prezența.");
            setAttOpen(false);
        } finally {
            setAttLoading(false);
        }
    };

    const saveAttendance = async () => {
        if (!attSession) return;

        setAttLoading(true);
        try {
            const payload = {
                rows: attRows.map((r) => ({
                    childId: r.childId,
                    status: ["PRESENT", "ABSENT", "EXCUSED"].includes(r.status) ? r.status : "PRESENT",
                })),
            };

            const data = await teacherApi.updateSessionAttendance(
                groupId,
                attSession.sessionId,
                payload
            );

            setAttRows(Array.isArray(data) ? data : []);
            message.success("Prezența a fost salvată.");
            setAttOpen(false);
            fetchSessions();
        } catch (e) {
            message.error(e?.message || "Nu pot salva prezența.");
        } finally {
            setAttLoading(false);
        }
    };

    /**
     * Handler schimbare status prezență (PRESENT/ABSENT/EXCUSED) pentru un rând.
     *
     * Extrasă din coloana "Status" a tabelului de prezență pentru a reduce
     * adâncimea de nesting (SonarCloud: max 4 niveluri).
     * Originalul era la nivelul 5: columns → render → onChange → setAttRows → map.
     *
     * @param {string} key   - cheia unică a rândului (attendanceId sau childId-recovery)
     * @param {string} value - noul status selectat (PRESENT / ABSENT / EXCUSED)
     */
    const handleAttStatusChange = useCallback((key, value) => {
        setAttRows((prev) =>
            prev.map((x) => attRowKey(x) === key ? { ...x, status: value } : x)
        );
    }, []);

    const columns = useMemo(
        () => [
            {
                title: "Dată / Oră",
                key: "dt",
                render: (_, r) => (
                    <Space direction="vertical" size={0}>
                        <Text strong>
                            {r.sessionDate} · {String(r.time || "").slice(0, 5)}
                        </Text>
                        <Text type="secondary">
                            {r.schoolName || "—"} · {r.schoolAddress || "—"}
                        </Text>
                    </Space>
                ),
            },
            {
                title: "Status",
                dataIndex: "sessionStatus",
                key: "sessionStatus",
                render: (v) => sessionStatusTag(v),
            },
            {
                title: "Attendance",
                key: "att",
                render: (_, r) =>
                    r.attendanceTaken ? <Tag color="green">Taken</Tag> : <Tag>Not taken</Tag>,
            },
            {
                title: "Recovery slots",
                key: "slots",
                render: (_, r) => {
                    if (r.recoverySlotsMax == null || r.recoverySlotsMax <= 0) {
                        return <Text>—</Text>;
                    }

                    const used = r.recoverySlotsUsed ?? 0;
                    const max = r.recoverySlotsMax;
                    const full = used >= max;

                    return <Tag color={full ? "red" : "blue"}>{used}/{max}</Tag>;
                },
            },
            {
                title: "Acțiuni",
                key: "actions",
                render: (_, r) => {
                    const isTodayOrPast = (r.sessionDate || "") <= todayRO;
                    const statusOk = ["PLANNED", "TAUGHT"].includes(r.sessionStatus);
                    const canTakeAttendanceUI = isTodayOrPast && statusOk;

                    const isToday = r.sessionDate === todayRO;
                    const highlight = isToday && r.sessionStatus === "PLANNED";

                    const tooltip = !canTakeAttendanceUI
                        ? "Poți lua prezența începând din ziua sesiunii (doar pentru PLANNED/TAUGHT)."
                        : "";

                    return (
                        <Tooltip title={tooltip}>
                            <span>
                                <Button
                                    type={highlight ? "primary" : "default"}
                                    disabled={!canTakeAttendanceUI}
                                    onClick={() => openAttendance(r)}
                                >
                                    Ia prezența
                                </Button>
                            </span>
                        </Tooltip>
                    );
                },
            },
        ],
        [todayRO]
    );

    return (
        <Card>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        Sesiuni – grupa #{groupId}
                    </Title>
                    <Text type="secondary">
                        Calendarul sesiunilor + prezență + recovery slots.
                    </Text>
                </div>

                <Table
                    rowKey="sessionId"
                    loading={loading}
                    columns={columns}
                    dataSource={sessions}
                    pagination={{ pageSize: 12 }}
                />

                <Modal
                    open={attOpen}
                    title={
                        attSession
                            ? `Prezență – ${attSession.sessionDate} ${String(attSession.time || "").slice(0, 5)}`
                            : "Prezență"
                    }
                    onCancel={() => setAttOpen(false)}
                    onOk={saveAttendance}
                    okText="Salvează"
                    confirmLoading={attLoading}
                    width={900}
                >
                    <Table
                        rowKey={attRowKey}
                        loading={attLoading}
                        dataSource={attRows}
                        pagination={false}
                        columns={[
                            {
                                title: "Copil",
                                key: "child",
                                render: (_, r) => (
                                    <Space direction="vertical" size={0}>
                                        <Text strong>
                                            {r.childLastName} {r.childFirstName}
                                        </Text>
                                        {r.recovery ? <Tag color="purple">Recovery</Tag> : null}
                                    </Space>
                                ),
                            },
                            {
                                title: "Părinte",
                                key: "parent",
                                render: (_, r) => (
                                    <Space direction="vertical" size={0}>
                                        <Text>{r.parentName || "—"}</Text>
                                        <Text type="secondary">
                                            {r.parentPhone || "—"} · {r.parentEmail || "—"}
                                        </Text>
                                    </Space>
                                ),
                            },
                            {
                                title: "Status",
                                key: "status",
                                render: (_, r) => {
                                    const normalizedValue = ["PRESENT", "ABSENT", "EXCUSED"].includes(r.status)
                                        ? r.status
                                        : "PRESENT";

                                    return (
                                        <Radio.Group
                                            value={normalizedValue}
                                            onChange={(e) =>
                                                handleAttStatusChange(attRowKey(r), e.target.value)
                                            }
                                        >
                                            <Radio.Button value="PRESENT">PRESENT</Radio.Button>
                                            <Radio.Button value="ABSENT">ABSENT</Radio.Button>
                                            <Radio.Button value="EXCUSED">EXCUSED</Radio.Button>
                                        </Radio.Group>
                                    );
                                },
                            },
                        ]}
                    />
                </Modal>
            </Space>
        </Card>
    );
}