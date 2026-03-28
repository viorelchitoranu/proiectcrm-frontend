import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Button, Card, Drawer, Form, Input,
    Space, Table, Tag, Typography, message,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { http } from "../http.jsx";

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * Pagina admin pentru editarea template-urilor de email.
 *
 * Funcționalități:
 *   - Listează toate template-urile cu nume, cod și variabilele disponibile
 *   - Permite editarea subject-ului și body-ului fiecărui template
 *   - Afișează variabilele disponibile ca hint în formularul de editare
 *   - Previzualizare simplă a template-ului editat
 *
 * Variabilele {{variabila}} sunt înlocuite automat de backend la trimitere.
 */
export default function AdminEmailTemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);

    // Drawer editare
    const [drawerOpen,    setDrawerOpen]    = useState(false);
    const [editTemplate,  setEditTemplate]  = useState(null);
    const [saving,        setSaving]        = useState(false);
    const [form]                            = Form.useForm();

    // ── Fetch template-uri ────────────────────────────────────────────────────

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await http.get("/api/admin/email-templates");
            setTemplates(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e?.message || "Nu am putut încărca template-urile.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);

    // ── Deschide drawer editare ────────────────────────────────────────────────

    const openEdit = (template) => {
        setEditTemplate(template);
        form.setFieldsValue({
            subject: template.subject,
            body:    template.body,
        });
        setDrawerOpen(true);
    };

    const closeEdit = () => {
        setDrawerOpen(false);
        setEditTemplate(null);
        form.resetFields();
    };

    // ── Salvare template ──────────────────────────────────────────────────────

    const onSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await http.put(`/api/admin/email-templates/${editTemplate.id}`, {
                subject: values.subject,
                body:    values.body,
            });
            message.success("Template-ul a fost salvat.");
            closeEdit();
            loadTemplates();
        } catch (e) {
            message.error(e?.message || "Nu am putut salva template-ul.");
        } finally {
            setSaving(false);
        }
    };

    // ── Coloane tabel ─────────────────────────────────────────────────────────

    const columns = [
        {
            title:     "Nume template",
            dataIndex: "name",
            key:       "name",
            render:    (v) => <Text strong>{v}</Text>,
        },
        {
            title:     "Cod intern",
            dataIndex: "code",
            key:       "code",
            render:    (v) => <Tag color="blue" style={{ fontFamily: "monospace" }}>{v}</Tag>,
        },
        {
            title:     "Subiect curent",
            dataIndex: "subject",
            key:       "subject",
            ellipsis:  true,
        },
        {
            title:  "Variabile disponibile",
            dataIndex: "availableVars",
            key:    "vars",
            render: (v) => (
                <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
                    {v}
                </Text>
            ),
        },
        {
            title:  "Acțiuni",
            key:    "actions",
            render: (_, record) => (
                <Button
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => openEdit(record)}
                >
                    Editează
                </Button>
            ),
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Template-uri Email</Title>
                <Text type="secondary">
                    Editează conținutul emailurilor trimise automat de platformă.
                    Variabilele <Text code>{"{{variabila}}"}</Text> sunt înlocuite automat la trimitere.
                </Text>
            </div>

            {error && <Alert type="error" showIcon message={error} />}

            <Card>
                <Table
                    rowKey="id"
                    loading={loading}
                    dataSource={templates}
                    columns={columns}
                    pagination={false}
                />
            </Card>

            {/* ── Drawer editare template ── */}
            <Drawer
                title={editTemplate ? `Editează: ${editTemplate.name}` : "Editează template"}
                open={drawerOpen}
                onClose={closeEdit}
                width={680}
                destroyOnClose
                footer={
                    <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                        <Button onClick={closeEdit}>Renunță</Button>
                        <Button type="primary" loading={saving} onClick={onSave}>
                            Salvează
                        </Button>
                    </Space>
                }
            >
                {editTemplate && (
                    <Space direction="vertical" size="middle" style={{ width: "100%" }}>

                        {/* Variabile disponibile */}
                        <Alert
                            type="info"
                            showIcon
                            message="Variabile disponibile pentru acest template"
                            description={
                                <Text style={{ fontFamily: "monospace", fontSize: 13 }}>
                                    {editTemplate.availableVars}
                                </Text>
                            }
                        />

                        <Form form={form} layout="vertical">
                            <Form.Item
                                name="subject"
                                label="Subiect email"
                                rules={[{ required: true, message: "Subiectul nu poate fi gol." }]}
                                extra="Poate conține variabile {{variabila}}"
                            >
                                <Input placeholder="Subiectul emailului..." />
                            </Form.Item>

                            <Form.Item
                                name="body"
                                label="Conținut email"
                                rules={[{ required: true, message: "Conținutul nu poate fi gol." }]}
                                extra="Poate conține variabile {{variabila}}. Formatare: text simplu, rândurile noi sunt păstrate."
                            >
                                <TextArea
                                    rows={16}
                                    placeholder="Conținutul emailului..."
                                    style={{ fontFamily: "monospace", fontSize: 13 }}
                                />
                            </Form.Item>
                        </Form>

                        {/* Previzualizare */}
                        <Card
                            size="small"
                            title="Previzualizare (variabilele rămân neschimbate)"
                            style={{ background: "#fafafa" }}
                        >
                            <Text strong style={{ display: "block", marginBottom: 8 }}>
                                Subiect: {form.getFieldValue("subject") || editTemplate.subject}
                            </Text>
                            <pre style={{
                                whiteSpace: "pre-wrap",
                                fontFamily: "inherit",
                                fontSize:   13,
                                margin:     0,
                                color:      "#333",
                            }}>
                                {form.getFieldValue("body") || editTemplate.body}
                            </pre>
                        </Card>
                    </Space>
                )}
            </Drawer>
        </Space>
    );
}
