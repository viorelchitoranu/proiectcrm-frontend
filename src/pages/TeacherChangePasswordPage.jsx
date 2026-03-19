import React, { useState } from "react";
import { Card, Typography, Space, Form, Input, Button, message } from "antd";
import { teacherApi } from "../teacherApi.js";

const { Title } = Typography;

export default function TeacherChangePasswordPage() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await teacherApi.changeOwnPassword({
                oldPassword: values.oldPassword,
                newPassword: values.newPassword,
            });

            message.success("Parola a fost schimbată.");
            form.resetFields();
        } catch (e) {
            message.error(e?.message || "Nu pot schimba parola.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card style={{ maxWidth: 520 }}>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        Schimbă parola
                    </Title>
                </div>

                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Parola veche"
                        name="oldPassword"
                        rules={[{ required: true, message: "Introdu parola veche" }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item
                        label="Parola nouă"
                        name="newPassword"
                        rules={[
                            { required: true, message: "Introdu parola nouă" },
                            { min: 6, message: "Parola trebuie să aibă minim 6 caractere" },
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item
                        label="Confirmă parola nouă"
                        name="confirmNewPassword"
                        dependencies={["newPassword"]}
                        rules={[
                            { required: true, message: "Confirmă parola nouă" },
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
                        <Input.Password />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={loading}>
                        Salvează
                    </Button>
                </Form>
            </Space>
        </Card>
    );
}