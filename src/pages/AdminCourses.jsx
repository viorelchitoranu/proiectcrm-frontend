import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Drawer, Form, Input, Space, Table, Typography, message, Popconfirm, Tag } from "antd";
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { http } from "../http.jsx";
import { loadSession } from "../auth/session.jsx";

const { Title, Text } = Typography;

export default function AdminCourses() {
  const session = loadSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form] = Form.useForm();

  const fetchCourses = async () => {
    try { // try.
      setLoading(true);
      setError(null);
      const res = await http.get("/api/admin/courses");
      setCourses(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openCreateDrawer = () => {
    setEditing(null);
    setDrawerOpen(true);
    form.setFieldsValue({ name: "" });
  };

  const openEditDrawer = (record) => {
    setEditing(record);
    setDrawerOpen(true);
    form.setFieldsValue({ name: record.name || "" });
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
        await http.put(`/api/admin/courses/${editing.id}`, values);
        message.success("Cursul a fost actualizat.");
      } else {
        await http.post("/api/admin/courses", values);
        message.success("Cursul a fost adăugat.");
      }

      closeDrawer();
      fetchCourses();
    } catch (e) { // catch.
      message.error(`Nu am putut salva: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (record) => {
    try { // try.
      await http.delete(`/api/admin/courses/${record.id}`);
      message.success("Cursul a fost șters.");
      fetchCourses();
    } catch (e) {
      message.error(`Nu am putut șterge: ${e.message}`);
    }
  };

  const columns = [
    { title: "Nume", dataIndex: "name", key: "name" },
    {
      title: "Creat la",
      key: "createdAt",
      render: (_, record) => record.createdAt ? <Tag>{record.createdAt}</Tag> : "-",
    },
    {
      title: "Acțiuni",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEditDrawer(record)}>Edit</Button>
          <Popconfirm title="Ștergi cursul?" okText="Da" cancelText="Nu" onConfirm={() => onDelete(record)}>
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
            <Title level={2} style={{ marginBottom: 0 }}>Cursuri</Title>
            <Text type="secondary">CRUD pentru cursuri (GET/POST/PUT/DELETE).</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchCourses}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>Adaugă</Button>
          </Space>
        </Space>

        {error ? <Alert type="error" showIcon message="Eroare" description={error} /> : null}

        <Card title={`Listă cursuri (${courses.length})`}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={courses}
            loading={loading}
            pagination={{ pageSize: 8 }}
          />
        </Card>

        <Drawer
          title={editing ? "Editează cursul" : "Adaugă curs"}
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
              label="Nume curs"
              rules={[{ required: true, message: "Te rog introdu numele cursului." }]}
            >
              <Input />
            </Form.Item>
          </Form>
        </Drawer>
      </Space>
    </>
  );
}