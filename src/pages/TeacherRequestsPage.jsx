import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Table, Typography, Space, Tag, Select, Button, message, Modal } from "antd";
import { teacherApi } from "../teacherApi.js";

const { Title, Text } = Typography;

function typeTag(v) {
    if (v === "RECOVERY_REQUESTED") return <Tag color="purple">RECOVERY</Tag>;
    if (v === "CANCELLED_BY_PARENT") return <Tag color="red">CANCEL</Tag>;
    return <Tag>{v || "—"}</Tag>;
}

function statusTag(v) {
    if (v === "PENDING") return <Tag color="gold">PENDING</Tag>;
    if (v === "RECOVERY_BOOKED") return <Tag color="blue">RECOVERY_BOOKED</Tag>;
    if (v === "EXCUSED") return <Tag color="green">EXCUSED</Tag>;
    if (v === "CANCELLED_BY_PARENT") return <Tag color="red">CANCELLED_BY_PARENT</Tag>;
    if (v === "RECOVERY_REQUESTED") return <Tag color="purple">RECOVERY_REQUESTED</Tag>;
    return <Tag>{v || "—"}</Tag>;
}

function cleanRequestNote(note) {
    const n = String(note || "").trim();

    return (
        n
            .replace(/^CANCEL_REQUEST\s*\|\s*/i, "")
            .replace(/^CANCEL_REQUEST\s*/i, "")
            .replace(/^RECOVERY_REQUEST\s*\|\s*/i, "")
            .replace(/^RECOVERY_REQUEST\s*/i, "")
            .trim() || "—"
    );
}

export default function TeacherRequestsPage() {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState("");
    const [rows, setRows] = useState([]);

    const [allocOpen, setAllocOpen] = useState(false);
    const [allocLoading, setAllocLoading] = useState(false);
    const [allocReq, setAllocReq] = useState(null);
    const [targetSessions, setTargetSessions] = useState([]);
    const [targetSessionId, setTargetSessionId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await teacherApi.getParentRequests(type || undefined);
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            message.error(e?.message || "Nu pot încărca cererile.");
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openAllocate = useCallback(async (r) => {
        if (!r?.attendanceId) {
            message.error("Nu pot aloca: lipsește attendanceId.");
            return;
        }

        setAllocReq(r);
        setTargetSessionId(null);
        setAllocOpen(true);
        setAllocLoading(true);

        try {
            const data = await teacherApi.getRecoveryTargetSessions(r.attendanceId);
            setTargetSessions(Array.isArray(data) ? data : []);
        } catch (e) {
            message.error(e?.message || "Nu pot încărca sesiunile pentru alocare.");
            setAllocOpen(false);
        } finally {
            setAllocLoading(false);
        }
    }, []);

    const confirmCancel = useCallback(
        async (r) => {
            if (!r?.attendanceId) return;

            try {
                await teacherApi.confirmCancel(r.attendanceId);
                message.success("Anularea a fost confirmată (EXCUSED).");
                fetchData();
            } catch (e) {
                message.error(e?.message || "Nu pot confirma anularea.");
            }
        },
        [fetchData]
    );

    const allocate = useCallback(async () => {
        if (!allocReq || !targetSessionId) {
            message.warning("Selectează o sesiune țintă.");
            return;
        }

        setAllocLoading(true);
        try {
            await teacherApi.allocateRecovery(allocReq.attendanceId, {
                targetSessionId: Number(targetSessionId),
            });

            message.success("Recuperarea a fost alocată.");
            setAllocOpen(false);
            fetchData();
        } catch (e) {
            message.error(e?.message || "Nu pot aloca recuperarea.");
        } finally {
            setAllocLoading(false);
        }
    }, [allocReq, targetSessionId, fetchData]);

    const columns = useMemo(
        () => [
            {
                title: "Tip",
                dataIndex: "type",
                key: "type",
                render: (v) => typeTag(v),
            },
            {
                title: "Copil / Părinte",
                key: "cp",
                render: (_, r) => (
                    <Space direction="vertical" size={0}>
                        <Text strong>{r.childName || "—"}</Text>
                        <Text type="secondary">
                            {r.parentName || "—"} · {r.parentPhone || "—"} · {r.parentEmail || "—"}
                        </Text>
                    </Space>
                ),
            },
            {
                title: "Sesiune",
                key: "sess",
                render: (_, r) => (
                    <Space direction="vertical" size={0}>
                        <Text>
                            {r.sessionDate || "—"} {String(r.sessionTime || "").slice(0, 5)}
                        </Text>
                        <Text type="secondary">
                            {r.groupName || "—"} · {r.courseName || "—"} · {r.schoolName || "—"}
                        </Text>
                    </Space>
                ),
            },
            {
                title: "Notă",
                key: "note",
                render: (_, r) => (
                    <Space direction="vertical" size={0}>
                        <Space wrap>
                            {statusTag(r.status)}
                            {r.assignedToSessionId ? (
                                <Tag color="blue">Assigned #{r.assignedToSessionId}</Tag>
                            ) : null}
                        </Space>
                        <Text type="secondary">{cleanRequestNote(r.note)}</Text>
                    </Space>
                ),
            },
            {
                title: "Acțiuni",
                key: "actions",
                render: (_, r) => {
                    const alreadyAllocated =
                        r.status === "RECOVERY_BOOKED" || !!r.assignedToSessionId;

                    const cancelResolved = r.status === "EXCUSED";

                    return (
                        <Space>
                            {r.type === "RECOVERY_REQUESTED" ? (
                                <Button
                                    type="primary"
                                    disabled={alreadyAllocated}
                                    onClick={() => openAllocate(r)}
                                >
                                    {alreadyAllocated ? "Already allocated" : "Allocate recovery"}
                                </Button>
                            ) : null}

                            {r.type === "CANCELLED_BY_PARENT" ? (
                                <Button
                                    disabled={cancelResolved}
                                    onClick={() => confirmCancel(r)}
                                >
                                    {cancelResolved ? "Confirmed" : "Confirm cancel"}
                                </Button>
                            ) : null}
                        </Space>
                    );
                },
            },
        ],
        [openAllocate, confirmCancel]
    );

    return (
        <Card>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        Cereri de la părinți
                    </Title>
                    <Text type="secondary">CANCELLED_BY_PARENT / RECOVERY_REQUESTED</Text>
                </div>

                <Space>
                    <Select
                        style={{ width: 280 }}
                        value={type}
                        onChange={setType}
                        options={[
                            { value: "", label: "Toate" },
                            { value: "CANCELLED_BY_PARENT", label: "CANCELLED_BY_PARENT" },
                            { value: "RECOVERY_REQUESTED", label: "RECOVERY_REQUESTED" },
                        ]}
                    />
                    <Button onClick={fetchData}>Refresh</Button>
                </Space>

                <Table
                    rowKey="attendanceId"
                    loading={loading}
                    columns={columns}
                    dataSource={rows}
                    pagination={{ pageSize: 10 }}
                />

                <Modal
                    open={allocOpen}
                    title={allocReq ? `Alocare recuperare – ${allocReq.childName}` : "Alocare recuperare"}
                    onCancel={() => setAllocOpen(false)}
                    onOk={allocate}
                    okText="Alocă"
                    confirmLoading={allocLoading}
                >
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <Text type="secondary">
                            Selectează o sesiune țintă disponibilă pentru recuperare.
                        </Text>

                        <Select
                            showSearch
                            placeholder="Alege sesiunea"
                            value={targetSessionId}
                            onChange={(v) => setTargetSessionId(Number(v))}
                            style={{ width: "100%" }}
                            optionFilterProp="label"
                            options={targetSessions.map((s) => ({
                                value: s.sessionId,
                                label: `${s.sessionDate} ${String(s.time || "").slice(0, 5)} · ${s.groupName} · ${s.courseName || ""} · slots ${s.recoverySlotsUsed}/${s.recoverySlotsMax}`,
                            }))}
                        />
                    </Space>
                </Modal>
            </Space>
        </Card>
    );
}