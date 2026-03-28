import React from "react";
import { Layout, Menu, Typography, Button, Space } from "antd";
import {
    TeamOutlined,
    InboxOutlined,
    LockOutlined,
    LogoutOutlined,
    MessageOutlined,
    CalendarOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { loadSession }     from "../auth/session.jsx";
import { logoutAndClear }  from "../auth/authApi.js";
import { useTenantConfig } from "../useTenantConfig.js";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// ── Extras din componentă pentru a reduce Cognitive Complexity ────────────────
const TEACHER_ROUTES = [
    ["/teacher/calendar", "calendar"],
    ["/teacher/board",    "board"],
    ["/teacher/groups",   "groups"],
    ["/teacher/requests", "requests"],
    ["/teacher/password", "password"],
];

function getTeacherSelectedKey(pathname) {
    const match = TEACHER_ROUTES.find(([path]) => pathname.startsWith(path));
    return match ? match[1] : "groups";
}

export default function TeacherLayout() {
    const navigate   = useNavigate();
    const location   = useLocation();
    const session    = loadSession();
    const { config } = useTenantConfig();

    const onLogout = async () => {
        await logoutAndClear();
        navigate("/login", { replace: true });
    };

    const selectedKey = getTeacherSelectedKey(location.pathname);

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider breakpoint="lg" collapsedWidth="0">
                <div style={{ padding: 16 }}>
                    {config.logoUrl ? (
                        <img
                            src={config.logoUrl}
                            alt={config.name}
                            style={{ maxHeight: 36, maxWidth: "100%", objectFit: "contain" }}
                        />
                    ) : (
                        <Text strong style={{ color: "white", fontSize: 15 }}>
                            {config.name}
                        </Text>
                    )}
                    <div style={{ marginTop: 8 }}>
                        <Text style={{ color: "rgba(255,255,255,0.75)" }}>
                            {session?.firstName} {session?.lastName}
                        </Text>
                    </div>
                </div>

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={[
                        { key: "groups",   icon: <TeamOutlined />,    label: <Link to="/teacher/groups">Grupele mele</Link> },
                        { key: "requests", icon: <InboxOutlined />,   label: <Link to="/teacher/requests">Cereri părinți</Link> },
                        { key: "calendar", icon: <CalendarOutlined />,label: <Link to="/teacher/calendar">Calendar</Link> },
                        { key: "board",    icon: <MessageOutlined />, label: <Link to="/teacher/board">Forum</Link> },
                        { key: "password", icon: <LockOutlined />,    label: <Link to="/teacher/password">Schimbă parola</Link> },
                    ]}
                />
            </Sider>

            <Layout>
                <Header style={{ background: "white", padding: "0 16px" }}>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Text>Profesor</Text>
                        <Button icon={<LogoutOutlined />} onClick={onLogout}>Logout</Button>
                    </Space>
                </Header>
                <Content style={{ margin: 16 }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
