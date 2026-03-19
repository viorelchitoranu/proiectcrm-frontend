import React, { useState } from "react";
import { Alert, Button, Card, Form, Input, Space, Typography, message } from "antd";
import { parentApi } from "../parentApi.js";

const { Title, Text } = Typography;

export default function ParentChangePasswordPage() {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState(null);

    const onFinish = async (values) => {
        try {
            setSaving(true);
            setSuccessMsg(null);

            await parentApi.updatePassword({
                newPassword: values.newPassword,
            });

            setSuccessMsg("Parola a fost actualizată cu succes.");
            message.success("Parola a fost actualizată.");
            form.resetFields();
        } catch (e) {
            message.error(e?.message || "Nu am putut actualiza parola.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Title level={3} style={{ margin: 0 }}>
                Schimbă parola
            </Title>

            <Card style={{ maxWidth: 720 }}>
                {successMsg ? (
                    <Alert
                        type="success"
                        showIcon
                        title={successMsg}
                        style={{ marginBottom: 16 }}
                    />
                ) : null}

                <Text type="secondary">
                    Introdu o parolă nouă pentru contul tău.
                </Text>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="newPassword"
                        label="Parolă nouă"
                        rules={[
                            { required: true, message: "Te rog introdu parola nouă." },
                            { min: 6, message: "Parola trebuie să aibă minim 6 caractere." },
                        ]}
                        hasFeedback
                    >
                        <Input.Password placeholder="Minim 6 caractere" />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Confirmă parola"
                        dependencies={["newPassword"]}
                        hasFeedback
                        rules={[
                            { required: true, message: "Te rog confirmă parola." },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue("newPassword") === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error("Parolele nu se potrivesc."));
                                },
                            }),
                        ]}
                    >
                        <Input.Password placeholder="Reintrodu parola" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" loading={saving}>
                            Salvează parola
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </Space>
    );
}