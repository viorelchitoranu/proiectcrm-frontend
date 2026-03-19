import React, { useState } from "react";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Flex, Form, Input, Typography } from "antd";
import { useNavigate, Link } from "react-router-dom";

import { HttpError } from "../http.jsx";
import { saveSession } from "../auth/session.jsx";
import { authApi } from "../auth/authApi.js";

const { Title, Text } = Typography;

export default function LoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState(null);

    const getFriendlyLoginMessage = (e) => {
        if (e instanceof HttpError) {
            if (e.status === 401 || e.status === 404) {
                return "Email sau parolă incorecte. Te rog încearcă din nou.";
            }

            if (e.details && typeof e.details === "object" && e.details.message) {
                return String(e.details.message);
            }

            return "A apărut o eroare la autentificare. Te rog încearcă din nou.";
        }

        return "Nu pot contacta serverul sau a apărut o eroare neașteptată. Verifică backend-ul și încearcă din nou.";
    };

    const onFinish = async (values) => {
        try {
            setLoading(true);
            setLoginError(null);

            const payload = {
                email: values.email,
                password: values.password,
            };

            const res = await authApi.login(payload);

            saveSession(
                {
                    userId: res.userId,
                    role: res.role,
                    firstName: res.firstName,
                    lastName: res.lastName,
                },
                values.remember
            );

            const role = String(res.role || "").toUpperCase();

            if (role === "ADMIN") {
                navigate("/admin", { replace: true });
            } else if (role === "TEACHER") {
                navigate("/teacher", { replace: true });
            } else if (role === "PARENT") {
                navigate("/parent", { replace: true });
            } else {
                setLoginError(`Rol necunoscut: ${res.role}`);
            }
        } catch (e) {
            setLoginError(getFriendlyLoginMessage(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
            <Title level={2} style={{ marginBottom: 0 }}>
                Login
            </Title>
            <Text type="secondary">
                Autentifică-te pentru a accesa dashboard-ul.
            </Text>

            {loginError ? (
                <Alert
                    type="error"
                    showIcon
                    message={loginError}
                    style={{ marginTop: 16 }}
                />
            ) : null}

            <Form
                name="login"
                initialValues={{ remember: false }}
                style={{ marginTop: 16 }}
                onFinish={onFinish}
                onValuesChange={() => setLoginError(null)}
            >
                <Form.Item
                    name="email"
                    rules={[
                        { required: true, message: "Te rog introdu emailul!" },
                        { type: "email", message: "Te rog introdu un email valid!" },
                    ]}
                >
                    <Input
                        prefix={<UserOutlined />}
                        placeholder="Email"
                        autoComplete="email"
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{ required: true, message: "Te rog introdu parola!" }]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Parolă"
                        autoComplete="current-password"
                    />
                </Form.Item>

                <Form.Item>
                    <Flex justify="space-between" align="center">
                        <Form.Item name="remember" valuePropName="checked" noStyle>
                            <Checkbox>Ține-mă minte</Checkbox>
                        </Form.Item>

                        <a href="#" onClick={(e) => e.preventDefault()}>
                            Ai uitat parola?
                        </a>
                    </Flex>
                </Form.Item>

                <Form.Item>
                    <Button block type="primary" htmlType="submit" loading={loading}>
                        Log in
                    </Button>

                    <div style={{ marginTop: 12 }}>
                        Nu ai cont? <Link to="/enroll">Înscrie un copil</Link>
                    </div>
                </Form.Item>
            </Form>
        </div>
    );
}