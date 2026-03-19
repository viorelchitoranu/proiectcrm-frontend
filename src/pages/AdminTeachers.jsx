import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Drawer, Form, Input, Space, Table, Typography, message, Popconfirm, Tag, Switch } from "antd";
import { PlusOutlined, ReloadOutlined, EditOutlined, KeyOutlined } from "@ant-design/icons";
import { http } from "../http.jsx";
import { loadSession } from "../auth/session.jsx";


const { Title, Text } = Typography;

export default function AdminTeachers() {
    const session = loadSession();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [teachers, setTeachers] = useState([]);

    const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
    const [savingCreate, setSavingCreate] = useState(false);

    const [passwordDrawerOpen, setPasswordDrawerOpen] = useState(false);
    const [passwordTarget, setPasswordTarget] = useState(null);
    const [savingPassword, setSavingPassword] = useState(false);

    const [createForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await http.get("/api/admin/teachers");
            setTeachers(Array.isArray(res) ? res : []);
        } catch (e) {
            message.error(`Nu am putut încărca profesorii: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const openCreateDrawer = () => {
        setCreateDrawerOpen(true);
        createForm.setFieldsValue({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            address: "",
            password: "",
        });
    };

    const closeCreateDrawer = () => {
        setCreateDrawerOpen(false);
        createForm.resetFields();
    };

    const onCreateTeacher = async () => {
        try { // Try.
            const values = await createForm.validateFields();
            setSavingCreate(true);
            await http.post("/api/admin/teachers", values);
            message.success("Profesor creat. (Backend-ul trimite email cu credențiale, dacă ai implementat asta.)");
            closeCreateDrawer();
            fetchTeachers();
        } catch (e) {
            message.error(`Nu am putut crea profesorul: ${e.message}`);
        } finally {
            setSavingCreate(false);
        }
    };

    const openPasswordDrawer = (record) => {
        setPasswordTarget(record);
        setPasswordDrawerOpen(true);
        passwordForm.setFieldsValue({ newPassword: "" });
    };

    const closePasswordDrawer = () => {
        setPasswordDrawerOpen(false);
        setPasswordTarget(null);
        passwordForm.resetFields();
    };

    const onResetPassword = async () => {
        try {
            const values = await passwordForm.validateFields();
            setSavingPassword(true);
            const teacherId = passwordTarget?.id;
            await http.put(`/api/admin/teachers/${teacherId}/password`, values);
            message.success("Parola profesorului a fost resetată.");
            closePasswordDrawer();
            fetchTeachers();
        } catch (e) {
            message.error(`Nu am putut reseta parola: ${e.message}`);
        } finally {
            setSavingPassword(false);
        }
    };

    const toggleTeacherActive = async (record, nextActive) => {
        try {
            const teacherId = record?.id;
            await http.put(`/api/admin/teachers/${teacherId}/active`, { active: nextActive });

            setTeachers((prev) =>
                prev.map((t) => (t.id === teacherId ? { ...t, active: nextActive } : t))
            );

            message.success(nextActive ? "Profesor activat." : "Profesor dezactivat.");
        } catch (e) {
            if (e?.status === 409) {
                message.error("Nu poți dezactiva profesorul: are sesiuni viitoare (PLANNED). Reasignează grupele și încearcă din nou.");
                return;
            }
            message.error(`Nu am putut actualiza statusul profesorului: ${e.message}`);
        }
    };

    const columns = [
        { title: "Nume", key: "name", render: (_, r) => `${r.lastName || ""} ${r.firstName || ""}`.trim() || "-" },
        { title: "Email", dataIndex: "email", key: "email" },
        { title: "Telefon", dataIndex: "phone", key: "phone" },
        { title: "Creat la", key: "createdAt", render: (_, r) => r.createdAt ? <Tag>{r.createdAt}</Tag> : "-" },
        {
            title: "Activ",
            key: "active",
            render: (_, record) => {
                const isOn = record?.active === true;
                return (
                    <Popconfirm
                        title={isOn ? "Dezactivezi profesorul?" : "Activezi profesorul?"}
                        okText="Da"
                        cancelText="Nu"
                        onConfirm={() => toggleTeacherActive(record, !isOn)}
                    >
                        <Switch checked={isOn} />
                    </Popconfirm>
                );
            },
        },
        { // Actions.
            title: "Acțiuni",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button icon={<KeyOutlined />} size="small" onClick={() => openPasswordDrawer(record)}>Reset parolă</Button>
                </Space>
            ),
        },
    ];

    if (session?.role !== "ADMIN") { // Guard.
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
                        <Title level={2} style={{ marginBottom: 0 }}>Profesori</Title>
                        <Text type="secondary">Creare profesor + reset parolă.</Text>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchTeachers}>Refresh</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>Adaugă</Button>
                    </Space>
                </Space>

                {error ? <Alert type="error" showIcon message="Eroare" description={error} /> : null}

                <Card title={`Listă profesori (${teachers.length})`}>
                    <Table
                        rowKey={(r) => r.id} // Cheie unică robustă.
                        columns={columns}
                        dataSource={teachers}
                        loading={loading}
                        pagination={{ pageSize: 8 }}
                    />
                </Card>

                <Drawer
                    title="Adaugă profesor"
                    open={createDrawerOpen}
                    onClose={closeCreateDrawer}
                    width={460}
                    destroyOnClose
                    footer={
                        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                            <Button onClick={closeCreateDrawer}>Renunță</Button>
                            <Button type="primary" loading={savingCreate} onClick={onCreateTeacher}>Creează</Button>
                        </Space>
                    }
                >
                    <Form form={createForm} layout="vertical">
                        <Form.Item name="firstName" label="Prenume" rules={[{ required: true, message: "Te rog introdu prenumele." }]}>
                            <Input />
                        </Form.Item>

                        <Form.Item name="lastName" label="Nume" rules={[{ required: true, message: "Te rog introdu numele." }]}>
                            <Input />
                        </Form.Item>

                        <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Te rog introdu un email valid." }]}>
                            <Input />
                        </Form.Item>

                        <Form.Item name="phone" label="Telefon" rules={[{ required: true, message: "Te rog introdu telefonul." }]}>
                            <Input />
                        </Form.Item>

                        <Form.Item name="address" label="Adresă" rules={[{ required: true, message: "Te rog introdu adresa." }]}>
                            <Input />
                        </Form.Item>

                        <Form.Item name="password" label="Parolă inițială" rules={[{ required: true, message: "Te rog introdu parola." }]}>
                            <Input.Password />
                        </Form.Item>
                    </Form>
                </Drawer>

                <Drawer
                    title={`Reset parolă (${passwordTarget ? `${passwordTarget.lastName} ${passwordTarget.firstName}` : ""})`}
                    open={passwordDrawerOpen}
                    onClose={closePasswordDrawer}
                    width={420}
                    destroyOnClose
                    footer={
                        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                            <Button onClick={closePasswordDrawer}>Renunță</Button>
                            <Button type="primary" loading={savingPassword} onClick={onResetPassword}>Salvează</Button>
                        </Space>
                    }
                >
                    <Form form={passwordForm} layout="vertical">
                        <Form.Item
                            name="newPassword"
                            label="Parolă nouă"
                            rules={[{ required: true, message: "Te rog introdu parola nouă." }]}
                        >
                            <Input.Password />
                        </Form.Item>
                    </Form>
                </Drawer>
            </Space>
        </>
    );
}