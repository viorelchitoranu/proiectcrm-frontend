import React, { useCallback, useEffect, useState } from "react";
import { Alert, Card, Col, Row, Spin, Statistic, Typography } from "antd";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { http } from "../http.jsx";

const { Title, Text } = Typography;

const COLORS          = ["#1677ff", "#52c41a", "#fa8c16", "#f5222d", "#722ed1", "#13c2c2"];
const PIE_CHILDREN    = ["#52c41a", "#f5222d"];
const PIE_WAITLIST    = ["#1677ff", "#52c41a", "#d9d9d9"];

/**
 * Pagina de grafice statistici admin (recharts).
 * Rută: /admin/charts
 *
 * NOTĂ: Dashboard-ul existent cu GridStack rămâne la /admin (index).
 * Această pagină adaugă grafice statistice separate.
 */
export default function AdminDashboardPage() {
    const [stats,   setStats]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await http.get("/api/admin/dashboard/stats");
            setStats(data);
        } catch (e) {
            setError(e?.message || "Nu am putut încărca statisticile.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return <Spin size="large" style={{ display: "block", margin: "80px auto" }} />;
    if (error)   return <Alert type="error" showIcon message={error} style={{ margin: 24 }} />;
    if (!stats)  return null;

    const childrenPie = [
        { name: "Activi",   value: stats.childrenStats.active },
        { name: "Inactivi", value: stats.childrenStats.inactive },
    ];

    const waitlistPie = [
        { name: "În așteptare", value: stats.waitlistStats.waiting },
        { name: "Alocați",      value: stats.waitlistStats.allocated },
        { name: "Anulați",      value: stats.waitlistStats.cancelled },
    ].filter(d => d.value > 0);

    return (
        <div style={{ padding: 8 }}>
            <Title level={3} style={{ marginBottom: 24 }}>Statistici Platformă</Title>

            {/* ── Carduri sumar ─────────────────────────────────────────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic title="Copii total"    value={stats.childrenStats.total}         valueStyle={{ color: "#1677ff" }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic title="Copii activi"   value={stats.childrenStats.active}        valueStyle={{ color: "#52c41a" }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic title="Grupe active"   value={stats.enrollmentsByGroup.length}   valueStyle={{ color: "#fa8c16" }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic title="Waitlist activ" value={stats.waitlistStats.waiting}       valueStyle={{ color: "#f5222d" }} />
                    </Card>
                </Col>
            </Row>

            {/* ── Grafic 1: Prezențe pe luni + Grafic 3: Copii pie ──────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={16}>
                    <Card title="Prezențe pe ultimele 6 luni">
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={stats.attendanceByMonth}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="present"  name="Prezențe"        stroke="#1677ff" strokeWidth={2} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="sessions" name="Sesiuni ținute"  stroke="#52c41a" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Copii activi vs inactivi">
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={childrenPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}>
                                    {childrenPie.map((_, i) => <Cell key={i} fill={PIE_CHILDREN[i]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* ── Grafic 2: Înscrieri per grupă + Grafic 5: Waitlist ────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={16}>
                    <Card title="Înscrieri active per grupă (top 10)">
                        {stats.enrollmentsByGroup.length === 0
                            ? <Text type="secondary">Nu există grupe cu înscrieri active.</Text>
                            : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={stats.enrollmentsByGroup} layout="vertical" margin={{ left: 16 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis type="category" dataKey="groupName" width={120} tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(val, _, { payload }) => [`${val} copii`, payload.courseName]} />
                                        <Bar dataKey="enrolled" name="Copii înscriși" radius={[0, 4, 4, 0]}>
                                            {stats.enrollmentsByGroup.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )
                        }
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Statistici Waitlist">
                        {stats.waitlistStats.total === 0
                            ? <Text type="secondary" style={{ display: "block", textAlign: "center", paddingTop: 80 }}>Nicio cerere.</Text>
                            : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={waitlistPie} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                                            label={({ name, value }) => `${name}: ${value}`}>
                                            {waitlistPie.map((_, i) => <Cell key={i} fill={PIE_WAITLIST[i]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )
                        }
                    </Card>
                </Col>
            </Row>

            {/* ── Grafic 4: Profesori și grupe ──────────────────────────────── */}
            {stats.teacherGroups.length > 0 && (
                <Row gutter={[16, 16]}>
                    <Col xs={24}>
                        <Card title="Profesori și numărul de grupe">
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={stats.teacherGroups}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="teacherName" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="groupCount" name="Grupe" radius={[4, 4, 0, 0]}>
                                        {stats.teacherGroups.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
}
