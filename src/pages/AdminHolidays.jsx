import React, { useEffect, useMemo, useState } from "react";
import {
    Card,
    Tabs,
    Form,
    DatePicker,
    Input,
    Button,
    Space,
    Table,
    Tag,
    Typography,
    message,
    Drawer,
    Divider,
} from "antd";
import { EyeOutlined, CheckCircleOutlined, ReloadOutlined } from "@ant-design/icons";


import { http, HttpError } from "../http.jsx";

const { Title, Text } = Typography;
const { TextArea } = Input;

function statusTag(status) {
    const s = String(status || "");
    if (s === "PLANNED") return <Tag color="blue">PLANNED</Tag>;
    if (s === "TAUGHT") return <Tag color="green">TAUGHT</Tag>;
    if (s === "CANCELED_HOLIDAY") return <Tag color="red">CANCELED_HOLIDAY</Tag>;
    if (s.startsWith("CANCELED")) return <Tag color="volcano">{s}</Tag>;
    return <Tag>{s}</Tag>;
}

function reasonTag(reason) {
    const r = String(reason || "");
    if (r === "NOT_PLANNED") return <Tag color="gold">NOT_PLANNED</Tag>;
    if (r === "HAS_ATTENDANCE") return <Tag color="magenta">HAS_ATTENDANCE</Tag>;
    return <Tag>{r}</Tag>;
}

export default function AdminHolidays() {
    const [holidays, setHolidays] = useState([]);
    const [loadingHolidays, setLoadingHolidays] = useState(false);

    const [singleForm] = Form.useForm();
    const [rangeForm] = Form.useForm();

    const [previewSingle, setPreviewSingle] = useState(null);
    const [previewRange, setPreviewRange] = useState(null);

    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingApply, setLoadingApply] = useState(false);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [drawerTitle, setDrawerTitle] = useState("");
    const [drawerSessions, setDrawerSessions] = useState([]);

    const loadHolidays = async () => {
        setLoadingHolidays(true);
        try {
            const data = await http.get("/api/admin/holidays");
            setHolidays(Array.isArray(data) ? data : []);
        } catch (err) {
            message.error(err?.message || "Eroare la încărcarea holidays");
        } finally {
            setLoadingHolidays(false);
        }
    };

    useEffect(() => {
        loadHolidays();
    }, []);

    const handleError = (err, fallback) => {
        if (err instanceof HttpError) {
            // Pentru STRICT backend-ul întoarce 409 Conflict când există blocked sessions
            message.error(`${err.status}: ${err.message}`);
            return;
        }
        message.error(err?.message || fallback);
    };


    // SINGLE DAY (preview/apply)
    const onPreviewSingle = async () => {
        const v = await singleForm.validateFields();
        const date = v.date?.format("YYYY-MM-DD");

        setLoadingPreview(true);
        try {
            const resp = await http.post("/api/admin/holidays/preview", {
                date,
                description: v.description || null,
            });
            setPreviewSingle(resp);
        } catch (err) {
            handleError(err, "Eroare la preview");
        } finally {
            setLoadingPreview(false);
        }
    };

    const onApplySingle = async () => {
        const v = await singleForm.validateFields();
        const date = v.date?.format("YYYY-MM-DD");

        setLoadingApply(true);
        try {
            await http.post("/api/admin/holidays", {
                date,
                description: v.description || null,
            });
            message.success("Holiday creat și sesiuni marcate CANCELED_HOLIDAY (STRICT).");
            setPreviewSingle(null);
            await loadHolidays();
        } catch (err) {
            handleError(err, "Eroare la aplicare");
        } finally {
            setLoadingApply(false);
        }
    };


    // RANGE (preview/apply)
    const onPreviewRange = async () => {
        const v = await rangeForm.validateFields();
        const startDate = v.range?.[0]?.format("YYYY-MM-DD");
        const endDate = v.range?.[1]?.format("YYYY-MM-DD");

        setLoadingPreview(true);
        try {
            const resp = await http.post("/api/admin/holidays/preview-range", {
                startDate,
                endDate,
                description: v.description || null,
            });
            setPreviewRange(resp);
        } catch (err) {
            handleError(err, "Eroare la preview-range");
        } finally {
            setLoadingPreview(false);
        }
    };

    const onApplyRange = async () => {
        const v = await rangeForm.validateFields();
        const startDate = v.range?.[0]?.format("YYYY-MM-DD");
        const endDate = v.range?.[1]?.format("YYYY-MM-DD");

        setLoadingApply(true);
        try {
            await http.post("/api/admin/holidays/range", {
                startDate,
                endDate,
                description: v.description || null,
            });
            message.success("Holiday range creat și sesiuni marcate CANCELED_HOLIDAY (STRICT).");
            setPreviewRange(null);
            await loadHolidays();
        } catch (err) {
            handleError(err, "Eroare la aplicare range");
        } finally {
            setLoadingApply(false);
        }
    };


    // Drawer: affected sessions for holiday id
    const openAffectedSessions = async (holiday) => {
        setDrawerOpen(true);
        setDrawerLoading(true);
        setDrawerTitle(`Sesiuni afectate – ${holiday.holidayDate}`);
        setDrawerSessions([]);

        try {
            const data = await http.get(`/api/admin/holidays/${holiday.id}/sessions`);
            setDrawerSessions(Array.isArray(data) ? data : []);
        } catch (err) {
            handleError(err, "Eroare la încărcarea sesiunilor afectate");
        } finally {
            setDrawerLoading(false);
        }
    };

    const holidayColumns = [
        { title: "Data", dataIndex: "holidayDate", key: "holidayDate" },
        { title: "Descriere", dataIndex: "description", key: "description", render: (v) => v || "-" },
        {
            title: "Acțiuni",
            key: "actions",
            render: (_, row) => (
                <Button icon={<EyeOutlined />} onClick={() => openAffectedSessions(row)}>
                    Vezi sesiuni
                </Button>
            ),
        },
    ];

    const affectedColumns = [
        { title: "ID", dataIndex: "sessionId", key: "sessionId", width: 90 },
        { title: "Data", dataIndex: "sessionDate", key: "sessionDate", width: 130 },
        { title: "Ora", dataIndex: "time", key: "time", width: 110 },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 170,
            render: (v) => statusTag(v),
        },
        { title: "Grupă", dataIndex: "groupName", key: "groupName" },
        { title: "Curs", dataIndex: "courseName", key: "courseName" },
        { title: "Școală", dataIndex: "schoolName", key: "schoolName" },
        { title: "Profesor", dataIndex: "teacherName", key: "teacherName" },
    ];

    const blockedColumns = [
        ...affectedColumns,
        {
            title: "Motiv blocare",
            dataIndex: "reason",
            key: "reason",
            width: 170,
            render: (v) => reasonTag(v),
        },
    ];

    const canApplySingle = useMemo(() => {
        if (!previewSingle) return false;
        return (previewSingle.blockedCount || 0) === 0 && (previewSingle.willCancelCount || 0) >= 0;
    }, [previewSingle]);

    const canApplyRange = useMemo(() => {
        if (!previewRange) return false;
        return (previewRange.blockedCount || 0) === 0 && (previewRange.willCancelCount || 0) >= 0;
    }, [previewRange]);

    const PreviewBlock = ({ preview }) => {
        if (!preview) return null;

        return (
            <Card style={{ marginTop: 16 }} size="small">
                <Space direction="vertical" style={{ width: "100%" }}>
                    <div>
                        <Text strong>Rezumat:</Text>{" "}
                        <Tag>{`willCancel: ${preview.willCancelCount}`}</Tag>
                        <Tag color={preview.blockedCount > 0 ? "red" : "green"}>{`blocked: ${preview.blockedCount}`}</Tag>
                    </div>

                    <Divider style={{ margin: "12px 0" }} />

                    <Title level={5} style={{ margin: 0 }}>
                        Sesiuni care vor fi marcate CANCELED_HOLIDAY
                    </Title>
                    <Table
                        size="small"
                        rowKey={(r) => `${r.sessionId}`}
                        columns={affectedColumns}
                        dataSource={preview.willCancel || []}
                        pagination={{ pageSize: 8 }}
                    />

                    <Title level={5} style={{ marginTop: 12 }}>
                        Sesiuni blocate (STRICT)
                    </Title>
                    <Table
                        size="small"
                        rowKey={(r) => `${r.sessionId}-b`}
                        columns={blockedColumns}
                        dataSource={preview.blocked || []}
                        pagination={{ pageSize: 8 }}
                    />
                </Space>
            </Card>
        );
    };

    return (
        <>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Title level={3} style={{ margin: 0 }}>
                    Zile libere (Holidays)
                </Title>
                <Button icon={<ReloadOutlined />} onClick={loadHolidays} loading={loadingHolidays}>
                    Refresh
                </Button>
            </Space>

            <Card style={{ marginTop: 16 }} title="Creează holiday (STRICT: preview → apply)">
                <Tabs
                    items={[
                        {
                            key: "single",
                            label: "O zi",
                            children: (
                                <>
                                    <Form layout="vertical" form={singleForm}>
                                        <Form.Item
                                            label="Data"
                                            name="date"
                                            rules={[{ required: true, message: "Selectează data" }]}
                                        >
                                            <DatePicker format="YYYY-MM-DD" style={{ width: 220 }} />
                                        </Form.Item>

                                        <Form.Item label="Descriere (opțional)" name="description">
                                            <TextArea rows={2} placeholder="Ex: Vacanță / Sărbătoare legală" />
                                        </Form.Item>

                                        <Space>
                                            <Button onClick={onPreviewSingle} loading={loadingPreview} icon={<EyeOutlined />}>
                                                Preview
                                            </Button>
                                            <Button
                                                type="primary"
                                                onClick={onApplySingle}
                                                loading={loadingApply}
                                                icon={<CheckCircleOutlined />}
                                                disabled={!canApplySingle}
                                            >
                                                Apply (creează + anulează sesiuni)
                                            </Button>
                                        </Space>

                                        <PreviewBlock preview={previewSingle} />
                                        {previewSingle && !canApplySingle && (
                                            <Text type="danger">
                                                STRICT: există sesiuni blocate. Rezolvă blocajele (sau schimbă regula) înainte de Apply.
                                            </Text>
                                        )}
                                    </Form>
                                </>
                            ),
                        },
                        {
                            key: "range",
                            label: "Interval",
                            children: (
                                <>
                                    <Form layout="vertical" form={rangeForm}>
                                        <Form.Item
                                            label="Interval (start – end)"
                                            name="range"
                                            rules={[{ required: true, message: "Selectează intervalul" }]}
                                        >
                                            <DatePicker.RangePicker format="YYYY-MM-DD" style={{ width: 320 }} />
                                        </Form.Item>

                                        <Form.Item label="Descriere (opțional)" name="description">
                                            <TextArea rows={2} placeholder="Ex: Vacanță de iarnă" />
                                        </Form.Item>

                                        <Space>
                                            <Button onClick={onPreviewRange} loading={loadingPreview} icon={<EyeOutlined />}>
                                                Preview
                                            </Button>
                                            <Button
                                                type="primary"
                                                onClick={onApplyRange}
                                                loading={loadingApply}
                                                icon={<CheckCircleOutlined />}
                                                disabled={!canApplyRange}
                                            >
                                                Apply interval (creează + anulează sesiuni)
                                            </Button>
                                        </Space>

                                        <PreviewBlock preview={previewRange} />
                                        {previewRange && !canApplyRange && (
                                            <Text type="danger">
                                                STRICT: există sesiuni blocate. Rezolvă blocajele înainte de Apply.
                                            </Text>
                                        )}
                                    </Form>
                                </>
                            ),
                        },
                    ]}
                />
            </Card>

            <Card style={{ marginTop: 16 }} title="Lista holidays">
                <Table
                    rowKey={(r) => `${r.id}`}
                    columns={holidayColumns}
                    dataSource={holidays}
                    loading={loadingHolidays}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Drawer
                title={drawerTitle}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={980}
            >
                <Table
                    size="small"
                    rowKey={(r) => `${r.sessionId}`}
                    columns={affectedColumns}
                    dataSource={drawerSessions}
                    loading={drawerLoading}
                    pagination={{ pageSize: 10 }}
                />
            </Drawer>
        </>
    );
}