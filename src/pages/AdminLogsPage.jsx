import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    Card, Select, InputNumber, Input, Button, Table, Tag, Space,
    Typography, Alert, Spin, Row, Col, Tooltip, Badge,
} from "antd";
import {
    ReloadOutlined, SearchOutlined, ClearOutlined,
    FileTextOutlined, WarningOutlined, CloseCircleOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";
import { adminApi } from "../adminapi.js";

const { Text, Title } = Typography;
const { Search } = Input;

// ── Configurare colori per nivel de log ───────────────────────────────────────
// Aceste culori corespund convențiilor standard de logging
const LEVEL_CONFIG = {
    ERROR: { color: "red",    icon: <CloseCircleOutlined />, tagColor: "error"   },
    WARN:  { color: "orange", icon: <WarningOutlined />,     tagColor: "warning" },
    INFO:  { color: "blue",   icon: <InfoCircleOutlined />,  tagColor: "processing" },
    DEBUG: { color: "default",icon: <InfoCircleOutlined />,  tagColor: "default" },
};

// ── Helper: detectare nivel din linia de log ──────────────────────────────────
// Funcționează cu formatul nostru: "2026-03-15 14:32:07.418 ERROR [req:...] ..."
function detectLevel(line) {
    if (line.includes(" ERROR ")) return "ERROR";
    if (line.includes(" WARN  ") || line.includes(" WARN ")) return "WARN";
    if (line.includes(" INFO  ") || line.includes(" INFO ")) return "INFO";
    return null;  // null = linie fără nivel detectabil (continuare stack trace etc.)
}

// ── Helper: parsare MDC din linia de log ──────────────────────────────────────
// Extrage [req:...] [user:...] [METHOD /path] pentru afișare separată
function parseMdc(line) {
    const reqMatch  = line.match(/\[req:([^\]]+)\]/);
    const userMatch = line.match(/\[user:([^\]]+)\]/);
    const httpMatch = line.match(/\[([A-Z]+)\s+(\/[^\]]*)\]/);
    return {
        requestId: reqMatch  ? reqMatch[1]              : null,
        user:      userMatch ? userMatch[1]              : null,
        method:    httpMatch ? httpMatch[1]              : null,
        path:      httpMatch ? httpMatch[2]              : null,
    };
}

/**
 * Pagina de vizualizare loguri din panoul de admin.
 *
 * Funcționalități:
 *   - Selectare fișier: app.log (toate) sau error.log (WARN+)
 *   - Selectare număr linii: 50 / 100 / 200 / 500 / 1000
 *   - Filtrare text: case-insensitive, trimisă la backend (nu filtrare client-side)
 *   - Auto-refresh opțional la 30 de secunde
 *   - Color coding per nivel: ERROR=roșu, WARN=portocaliu, INFO=albastru
 *   - Afișare MDC: requestId, user, method+path ca coloane separate
 *   - Scroll la ultima linie după încărcare
 *
 * Endpoint folosit: GET /api/admin/logs?file=error&lines=200&filter=...
 *
 * Toate request-urile sunt autentificate (sesiunea admin din cookie JSESSIONID).
 */
export default function AdminLogsPage() {
    // ── State ─────────────────────────────────────────────────────────────────
    const [file,      setFile]      = useState("error");   // "app" | "error"
    const [lines,     setLines]     = useState(200);        // număr linii de citit
    const [filter,    setFilter]    = useState("");         // text de filtrare
    const [logLines,  setLogLines]  = useState([]);         // liniile returnate
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState(null);
    const [meta,      setMeta]      = useState(null);       // { totalReturned, filtered }
    const [autoRefresh, setAutoRefresh] = useState(false);

    const bottomRef    = useRef(null);   // pentru scroll automat la ultima linie
    const intervalRef  = useRef(null);   // referință interval auto-refresh

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getLogs(file, lines, filter || undefined);
            setLogLines(data.lines || []);
            setMeta({ totalReturned: data.totalReturned, filtered: data.filtered });
        } catch (err) {
            setError(err.message || "Eroare la încărcarea logurilor.");
            setLogLines([]);
        } finally {
            setLoading(false);
        }
    }, [file, lines, filter]);

    // Fetch la mount și la schimbarea parametrilor cheie
    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // Scroll la ultima linie după ce logurile sunt încărcate
    useEffect(() => {
        if (logLines.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logLines]);

    // ── Auto-refresh ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(fetchLogs, 30_000);  // 30 secunde
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [autoRefresh, fetchLogs]);

    // ── Procesare linii pentru tabel ──────────────────────────────────────────
    // Adăugăm index și nivel detectat pentru fiecare linie
    const processedLines = logLines.map((line, idx) => ({
        key:   idx,
        line,
        level: detectLevel(line),
        mdc:   parseMdc(line),
    }));

    // ── Statistici rapide ─────────────────────────────────────────────────────
    const stats = processedLines.reduce((acc, { level }) => {
        if (level) acc[level] = (acc[level] || 0) + 1;
        return acc;
    }, {});

    // ── Coloane tabel ─────────────────────────────────────────────────────────
    const columns = [
        {
            title:     "Nivel",
            dataIndex: "level",
            key:       "level",
            width:     80,
            render: (level) => {
                if (!level) return null;
                const cfg = LEVEL_CONFIG[level] || {};
                return <Tag color={cfg.tagColor}>{level}</Tag>;
            },
            // Filtrare client-side pe nivel
            filters: [
                { text: "ERROR", value: "ERROR" },
                { text: "WARN",  value: "WARN"  },
                { text: "INFO",  value: "INFO"  },
            ],
            onFilter: (value, record) => record.level === value,
        },
        {
            title:  "Context",
            key:    "mdc",
            width:  200,
            render: (_, record) => {
                const { requestId, user, method, path } = record.mdc;
                return (
                    <Space direction="vertical" size={0} style={{ fontSize: 11 }}>
                        {requestId && requestId !== "?" && (
                            <Text type="secondary">req: {requestId}</Text>
                        )}
                        {user && user !== "anon" && (
                            <Text type="secondary">{user}</Text>
                        )}
                        {method && path && (
                            <Text code style={{ fontSize: 10 }}>{method} {path}</Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title:     "Mesaj",
            dataIndex: "line",
            key:       "line",
            render: (line, record) => {
                const cfg  = record.level ? LEVEL_CONFIG[record.level] : null;
                const color = cfg?.color;
                return (
                    <Text
                        style={{
                            fontFamily: "monospace",
                            fontSize:   12,
                            whiteSpace: "pre-wrap",
                            wordBreak:  "break-all",
                            color:      color ? undefined : "inherit",
                        }}
                        type={
                            record.level === "ERROR" ? "danger"
                                : record.level === "WARN" ? "warning"
                                    : undefined
                        }
                    >
                        {line}
                    </Text>
                );
            },
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: 16 }}>
            <Title level={4} style={{ marginBottom: 16 }}>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Loguri server
            </Title>

            {/* ── Controale ── */}
            <Card style={{ marginBottom: 16 }}>
                <Row gutter={[16, 12]} align="middle" wrap>
                    {/* Selectare fișier */}
                    <Col>
                        <Space>
                            <Text strong>Fișier:</Text>
                            <Select
                                value={file}
                                onChange={setFile}
                                style={{ width: 140 }}
                                options={[
                                    { value: "error", label: "error.log (WARN+)" },
                                    { value: "app",   label: "app.log (toate)" },
                                ]}
                            />
                        </Space>
                    </Col>

                    {/* Număr linii */}
                    <Col>
                        <Space>
                            <Text strong>Linii:</Text>
                            <Select
                                value={lines}
                                onChange={setLines}
                                style={{ width: 100 }}
                                options={[50, 100, 200, 500, 1000].map(n => ({ value: n, label: String(n) }))}
                            />
                        </Space>
                    </Col>

                    {/* Filtrare text */}
                    <Col flex="auto">
                        <Search
                            placeholder="Filtrează: ERROR, ion***@***.ro, DEACTIVATE..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            onSearch={fetchLogs}
                            enterButton={<><SearchOutlined /> Caută</>}
                            allowClear
                            onClear={() => setFilter("")}
                        />
                    </Col>

                    {/* Butoane acțiuni */}
                    <Col>
                        <Space>
                            <Tooltip title="Reîncarcă logurile">
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={fetchLogs}
                                    loading={loading}
                                >
                                    Reîncarcă
                                </Button>
                            </Tooltip>

                            <Tooltip title={autoRefresh ? "Oprește auto-refresh (30s)" : "Pornește auto-refresh (30s)"}>
                                <Button
                                    type={autoRefresh ? "primary" : "default"}
                                    icon={<ReloadOutlined spin={autoRefresh} />}
                                    onClick={() => setAutoRefresh(v => !v)}
                                >
                                    {autoRefresh ? "Auto ON" : "Auto OFF"}
                                </Button>
                            </Tooltip>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* ── Statistici rapide ── */}
            {meta && (
                <Row gutter={16} style={{ marginBottom: 12 }}>
                    <Col>
                        <Text type="secondary">
                            {meta.totalReturned} linii afișate
                            {meta.filtered ? " (filtrate)" : ""}
                        </Text>
                    </Col>
                    {stats.ERROR > 0 && (
                        <Col>
                            <Badge count={stats.ERROR} color="red" showZero={false}>
                                <Tag color="error">ERROR</Tag>
                            </Badge>
                        </Col>
                    )}
                    {stats.WARN > 0 && (
                        <Col>
                            <Badge count={stats.WARN} color="orange" showZero={false}>
                                <Tag color="warning">WARN</Tag>
                            </Badge>
                        </Col>
                    )}
                    {stats.INFO > 0 && (
                        <Col>
                            <Badge count={stats.INFO} color="blue" showZero={false}>
                                <Tag color="processing">INFO</Tag>
                            </Badge>
                        </Col>
                    )}
                </Row>
            )}

            {/* ── Eroare la fetch ── */}
            {error && (
                <Alert
                    type="error"
                    message={error}
                    description={
                        error.includes("nu exista")
                            ? "Fișierul de log nu a fost creat încă — nu s-a produs niciun eveniment de logat sau profilul 'prod' nu este activ."
                            : "Verifică că backend-ul rulează și că ai permisiuni de admin."
                    }
                    style={{ marginBottom: 16 }}
                    showIcon
                />
            )}

            {/* ── Tabel loguri ── */}
            {loading && logLines.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                    <Spin size="large" tip="Se încarcă logurile..." />
                </div>
            ) : (
                <Card
                    style={{ background: "#1a1a2e" }}
                    bodyStyle={{ padding: 0 }}
                >
                    <Table
                        dataSource={processedLines}
                        columns={columns}
                        size="small"
                        pagination={{
                            pageSize:       50,
                            showSizeChanger: true,
                            showTotal:       total => `${total} linii`,
                        }}
                        scroll={{ x: true }}
                        rowClassName={({ level }) =>
                            level === "ERROR" ? "log-row-error"
                                : level === "WARN" ? "log-row-warn"
                                    : ""
                        }
                        locale={{
                            emptyText: meta?.filtered
                                ? "Niciun rezultat pentru filtrul aplicat."
                                : "Nu există loguri în acest fișier.",
                        }}
                        style={{ fontFamily: "monospace" }}
                    />
                    {/* Referință pentru scroll la ultima linie */}
                    <div ref={bottomRef} />
                </Card>
            )}

            {/* ── CSS inline pentru row coloring ── */}
            <style>{`
                .log-row-error td { background: rgba(255, 77, 79, 0.08) !important; }
                .log-row-warn  td { background: rgba(250, 173, 20, 0.08) !important; }
                .ant-table-wrapper .ant-table { background: transparent; }
                .ant-table-wrapper .ant-table-thead > tr > th {
                    background: #16213e !important;
                    color: rgba(255,255,255,0.75) !important;
                    border-bottom: 1px solid #0f3460 !important;
                }
                .ant-table-wrapper .ant-table-tbody > tr > td {
                    border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                    color: rgba(255,255,255,0.85);
                }
                .ant-table-wrapper .ant-table-tbody > tr:hover > td {
                    background: rgba(255,255,255,0.04) !important;
                }
            `}</style>
        </div>
    );
}
