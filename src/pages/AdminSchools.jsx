import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Drawer, Form, Input, Space, Table, Typography, message, Popconfirm } from "antd";
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { http } from "../http.jsx";
import { loadSession } from "../auth/session.jsx";

const { Title, Text } = Typography;

export default function AdminSchools() {
    const session = loadSession();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [schools, setSchools] = useState([]);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);

    const [form] = Form.useForm();

    const fetchSchools = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await http.get("/api/admin/schools");
            setSchools(Array.isArray(res) ? res : []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchools();
    }, []);

    const openCreateDrawer = () => {
        setEditing(null);
        setDrawerOpen(true);
        form.setFieldsValue({ name: "", address: "" });
    };

    const openEditDrawer = (record) => {
        setEditing(record);
        setDrawerOpen(true);
        form.setFieldsValue({
            name: record.name || "",
            address: record.address || "",
        });
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        setEditing(null);
        form.resetFields();
    };

    const onSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            if (editing) {
                await http.put(`/api/admin/schools/${editing.id}`, values);
                message.success("Școala a fost actualizată.");
            } else {
                await http.post("/api/admin/schools", values);
                message.success("Școala a fost adăugată.");
            }

            closeDrawer();
            fetchSchools();
        } catch (e) {
            message.error(`Nu am putut salva: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (record) => {
        try { // Încercăm delete.
            await http.delete(`/api/admin/schools/${record.id}`);
            message.success("Școala a fost ștearsă.");
            fetchSchools();
        } catch (e) {
            message.error(`Nu am putut șterge: ${e.message}`);
        }
    };

    const columns = [
        { title: "Nume", dataIndex: "name", key: "name" },
        { title: "Adresă", dataIndex: "address", key: "address" },
        {
            title: "Acțiuni",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEditDrawer(record)}>Edit</Button>
                    <Popconfirm
                        title="Ștergi școala?"
                        okText="Da"
                        cancelText="Nu"
                        onConfirm={() => onDelete(record)} //
                    >
                        <Button danger icon={<DeleteOutlined />} size="small">Șterge</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (session?.role !== "ADMIN") {
        return (
            <div style={{ maxWidth: 700, margin: "40px auto", padding: 16 }}>
                <Alert type="error" showIcon message="Acces interzis" description="Această pagină este doar pentru ADMIN." />
            </div>
        );
    }

    return (
        <>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <div>
                        <Title level={2} style={{ marginBottom: 0 }}>Școli</Title>
                        <Text type="secondary">CRUD pentru școli (GET/POST/PUT/DELETE).</Text>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchSchools}>Refresh</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>Adaugă</Button>
                    </Space>
                </Space>

                {error ? <Alert type="error" showIcon message="Eroare" description={error} /> : null}

                <Card title={`Listă școli (${schools.length})`}>
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={schools}
                        loading={loading}
                        pagination={{ pageSize: 8 }}
                    />
                </Card>

                <Drawer
                    title={editing ? "Editează școala" : "Adaugă școală"}
                    open={drawerOpen}
                    onClose={closeDrawer}
                    width={420}
                    destroyOnClose
                    footer={
                        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                            <Button onClick={closeDrawer}>Renunță</Button>
                            <Button type="primary" loading={saving} onClick={onSave}>Salvează</Button>
                        </Space>
                    }
                >
                    <Form form={form} layout="vertical">
                        <Form.Item
                            name="name"
                            label="Nume"
                            rules={[{ required: true, message: "Te rog introdu numele școlii." }]}
                        >
                            <Space style={{ width: "100%", justifyContent: "space-between" }}> {}
                                <Input />
                            </Space>

                        </Form.Item>

                        <Form.Item
                            name="address"
                            label="Adresă"
                            rules={[{ required: true, message: "Te rog introdu adresa." }]}
                        >
                            <Space style={{ width: "100%", justifyContent: "space-between" }}> {}
                                <Input />
                            </Space>

                        </Form.Item>
                    </Form>
                </Drawer>
            </Space>
        </>
    );
}