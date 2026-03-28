import React from "react";
import { Layout, Menu, Typography, Button, Space } from "antd";
import {
    DashboardOutlined,
    HomeOutlined,
    BookOutlined,
    UserOutlined,
    TeamOutlined,
    LogoutOutlined,
    CalendarOutlined,
    BarChartOutlined,
    DatabaseOutlined,
    SolutionOutlined,
    FileTextOutlined,
    ClockCircleOutlined,
    MessageOutlined,
} from "@ant-design/icons";
import { useNavigate, Link, useLocation, Outlet } from "react-router-dom";
import { loadSession }    from "../auth/session.jsx";
import { logoutAndClear } from "../auth/authApi.js";
import { useTenantConfig } from "../useTenantConfig.js";
import { MailOutlined } from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const ROUTE_KEYS = [
    ["/admin/schools",            "schools"],
    ["/admin/courses",            "courses"],
    ["/admin/teachers",           "teachers"],
    ["/admin/children",           "children"],
    ["/admin/parents",            "parents"],
    ["/admin/holidays",           "holidays"],
    ["/admin/reports",            "reports"],
    ["/admin/attendance-archive", "attendanceArchive"],
    ["/admin/waitlist",           "waitlist"],
    ["/admin/board",              "board"],
    ["/admin/logs",               "logs"],
    ["/admin/charts",             "charts"],
    ["/admin/calendar",           "calendar"],
];

export default function AdminLayout({ children }) {
    const navigate        = useNavigate();
    const location        = useLocation();
    const session         = loadSession();
    const { config }      = useTenantConfig();

    const onLogout = async () => {
        await logoutAndClear();
        navigate("/login", { replace: true });
    };

    const selectedKey =
        ROUTE_KEYS.find(([path]) => location.pathname.startsWith(path))?.[1] ?? "dashboard";

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider breakpoint="lg" collapsedWidth="0">
                <div style={{ padding: 16 }}>
                    {/* Logo sau nume organizație — din TenantConfig */}
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
                        { key: "dashboard",        icon: <DashboardOutlined />,    label: <Link to="/admin">Dashboard</Link> },
                        { key: "schools",          icon: <HomeOutlined />,         label: <Link to="/admin/schools">Școli</Link> },
                        { key: "courses",          icon: <BookOutlined />,         label: <Link to="/admin/courses">Cursuri</Link> },
                        { key: "teachers",         icon: <SolutionOutlined />,     label: <Link to="/admin/teachers">Profesori</Link> },
                        { key: "children",         icon: <TeamOutlined />,         label: <Link to="/admin/children">Copii</Link> },
                        { key: "parents",          icon: <UserOutlined />,         label: <Link to="/admin/parents">Părinți</Link> },
                        { key: "holidays",         icon: <CalendarOutlined />,     label: <Link to="/admin/holidays">Zile libere</Link> },
                        { key: "reports",          icon: <BarChartOutlined />,     label: <Link to="/admin/reports">Reports</Link> },
                        { key: "attendanceArchive",icon: <DatabaseOutlined />,     label: <Link to="/admin/attendance-archive">Attendance Archive</Link> },
                        { key: "waitlist",         icon: <ClockCircleOutlined />,  label: <Link to="/admin/waitlist">Listă așteptare</Link> },
                        { key: "board",            icon: <MessageOutlined />,      label: <Link to="/admin/board">Forum</Link> },
                        { key: "logs",             icon: <FileTextOutlined />,     label: <Link to="/admin/logs">Loguri server</Link> },
                        { key: "emailTemplates",   icon: <MailOutlined />,         label: <Link to="/admin/email-templates">Template-uri Email</Link> },
                        { key: "charts",           icon: <BarChartOutlined />,     label: <Link to="/admin/charts">Statistici</Link> },
                        { key: "calendar",         icon: <CalendarOutlined />,     label: <Link to="/admin/calendar">Calendar</Link> },

                    ]}
                />
            </Sider>

            <Layout>
                <Header style={{ background: "white", padding: "0 16px" }}>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Text>Admin</Text>
                        <Button icon={<LogoutOutlined />} onClick={onLogout}>
                            Logout
                        </Button>
                    </Space>
                </Header>

                <Content style={{ margin: 16 }}>
                    {children ?? <Outlet />}
                </Content>
            </Layout>
        </Layout>
    );
}
