import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Button, Card, Col, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Skeleton, Space, Statistic,
  Switch, Table, Tag, Typography, message,
} from "antd";
import {
  DeleteOutlined, EditOutlined, PlusOutlined,
  PlayCircleOutlined, ReloadOutlined, StopOutlined,
  DragOutlined,
} from "@ant-design/icons";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";

import { http, HttpError } from "../http.jsx";
import { loadSession }      from "../auth/session.jsx";

const { Title, Text } = Typography;

// ── Stiluri GridStack + design modern ────────────────────────────────────────
const GRID_STYLES = `
  .grid-stack {
    background: transparent;
  }
  .grid-stack-item-content {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    overflow: auto;
    padding: 0;
    border: 1px solid #f0f0f0;
    transition: box-shadow 0.2s;
  }
  .grid-stack-item:hover .grid-stack-item-content {
    box-shadow: 0 4px 20px rgba(0,0,0,0.13);
  }
  .grid-stack-item.ui-draggable-dragging .grid-stack-item-content {
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    opacity: 0.92;
  }
  .grid-stack-placeholder > .placeholder-content {
    background: #e6f4ff;
    border: 2px dashed #1677ff;
    border-radius: 12px;
  }
  .gs-drag-handle {
    cursor: grab;
    color: #bbb;
    padding: 4px 6px;
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
  }
  .gs-drag-handle:hover {
    color: #1677ff;
    background: #f0f5ff;
  }
  .gs-widget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px 10px 18px;
    border-bottom: 1px solid #f5f5f5;
    gap: 8px;
  }
  .gs-widget-header .ant-typography {
    margin: 0 !important;
  }
  .gs-widget-body {
    padding: 16px 18px;
  }
`;

// ── Layout implicit ────────────────────────────────────────────────────────────
const DEFAULT_LAYOUT = [
  { id: "kpis",     x: 0, y: 0,  w: 12, h: 4  },
  { id: "groups",   x: 0, y: 4,  w: 12, h: 8  },
  { id: "teachers", x: 0, y: 12, w: 6,  h: 6  },
  { id: "schools",  x: 6, y: 12, w: 6,  h: 6  },
];

const LS_KEY = "admin_dashboard_layout_v1";

function loadLayout() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT;
}

function saveLayout(items) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

// ── Helper allSettled ─────────────────────────────────────────────────────────
function applyAllSettledResults(results, calls, setters, onError, formatErr) {
  const errors = [];
  results.forEach((res, idx) => {
    const { key, label } = calls[idx];
    const setter = setters[key];
    if (res.status === "fulfilled") {
      setter?.(Array.isArray(res.value) ? res.value : []);
    } else {
      errors.push(`${label}: ${formatErr(res.reason)}`);
      setter?.([]);
    }
  });
  if (errors.length > 0) onError(errors.join("\n"));
}

// ── Widget wrapper component ──────────────────────────────────────────────────
function Widget({ title, extra, children, dragHandle }) {
  return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div className="gs-widget-header">
          <Space align="center">
          <span ref={dragHandle} className="gs-drag-handle">
            <DragOutlined />
          </span>
            <Title level={5} style={{ margin: 0 }}>{title}</Title>
          </Space>
          {extra && <div>{extra}</div>}
        </div>
        <div className="gs-widget-body" style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </div>
  );
}

// ── Componente widget individuale ─────────────────────────────────────────────
function KpisWidget({ kpis, schools, teachers, loading }) {
  const items = [
    { title: "Grupe active",   value: kpis.active },
    { title: "Grupe totale",   value: kpis.total },
    { title: "Copii activi",   value: kpis.activeChildrenSum },
    { title: "Progres mediu",  value: `${kpis.progressAvg}%` },
    { title: "Școli",          value: schools.length },
    { title: "Profesori",      value: teachers.length },
  ];

  return (
      <Row gutter={[12, 12]}>
        {items.map((item) => (
            <Col key={item.title} xs={12} sm={8} lg={4}>
              <div style={{
                background: "linear-gradient(135deg, #f8faff 0%, #eef3ff 100%)",
                borderRadius: 10,
                padding: "14px 16px",
                border: "1px solid #e8eeff",
              }}>
                {loading
                    ? <Skeleton active paragraph={false} />
                    : <Statistic title={item.title} value={item.value}
                                 valueStyle={{ fontSize: 22, fontWeight: 700, color: "#1677ff" }} />
                }
              </div>
            </Col>
        ))}
      </Row>
  );
}

function TeachersWidget({ teachers, loading }) {
  return (
      <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={teachers}
          pagination={{ pageSize: 6, size: "small" }}
          columns={[
            { title: "Nume", render: (_, r) => `${r.lastName || ""} ${r.firstName || ""}` },
            { title: "Email", dataIndex: "email", key: "email" },
          ]}
      />
  );
}

function SchoolsWidget({ schools, loading }) {
  return (
      <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={schools}
          pagination={{ pageSize: 6, size: "small" }}
          columns={[
            { title: "Școală", dataIndex: "name", key: "name" },
            { title: "Adresă", dataIndex: "address", key: "address",
              render: (v) => v || <Text type="secondary">—</Text> },
          ]}
      />
  );
}

// ── Componenta principală ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const session = loadSession();

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [groups, setGroups]     = useState([]);
  const [schools, setSchools]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses]   = useState([]);

  // edit drawer
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [form]                          = Form.useForm();

  // create drawer
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [savingCreate, setSavingCreate]         = useState(false);
  const [createForm]                            = Form.useForm();

  // sessions drawer
  const [sessionsDrawerOpen, setSessionsDrawerOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading]       = useState(false);
  const [sessions, setSessions]                     = useState([]);
  const [sessionsGroup, setSessionsGroup]           = useState(null);

  // GridStack refs
  const gridRef      = useRef(null);
  const gridInstance = useRef(null);
  const dragHandles  = useRef({});

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getGroupId = (r) => r?.id ?? r?.groupId ?? r?.groupClassId ?? r?.idGroup;

  const formatHttpError = useCallback((e) => {
    if (e instanceof HttpError) {
      const detailsMsg = e.details?.message ? String(e.details.message) : "";
      const raw = e.rawText ? String(e.rawText) : "";
      return `${e.status} ${e.statusText}${detailsMsg ? ` — ${detailsMsg}` : ""}${
          raw && !detailsMsg ? ` — ${raw}` : ""
      }`;
    }
    return e?.message || String(e);
  }, []);

  const resolveIsActive = (r) => {
    if (typeof r?.isActive === "boolean") return r.isActive;
    if (typeof r?.active  === "boolean") return r.active;
    return true;
  };

  const canDeleteSafe = (r) => {
    if (resolveIsActive(r) === false) return true;
    const end = r?.endDate || r?.groupEndDate;
    if (!end) return false;
    const endDate = new Date(`${end}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return today > endDate;
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const calls = [
      { key: "groups",   label: "/api/admin/groups",   fn: () => http.get("/api/admin/groups")   },
      { key: "schools",  label: "/api/admin/schools",  fn: () => http.get("/api/admin/schools")  },
      { key: "teachers", label: "/api/admin/teachers", fn: () => http.get("/api/admin/teachers") },
      { key: "courses",  label: "/api/admin/courses",  fn: () => http.get("/api/admin/courses")  },
    ];
    const results = await Promise.allSettled(calls.map((c) => c.fn()));
    const setters = { groups: setGroups, schools: setSchools, teachers: setTeachers, courses: setCourses };
    applyAllSettledResults(results, calls, setters, setError, formatHttpError);
    setLoading(false);
  }, [formatHttpError]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total = groups.length;
    const active = groups.filter((g) => g.active === true || g.isActive === true).length;
    const activeChildrenSum = groups.reduce(
        (sum, g) => sum + Number(g.activeChildren ?? g.activeChildrenCount ?? 0), 0
    );
    const progressAvg = total === 0 ? 0
        : Math.round(groups.reduce((sum, g) => sum + Number(g.progressPercent ?? 0), 0) / total);
    return { total, active, activeChildrenSum, progressAvg };
  }, [groups]);

  // ── Actions grupe ─────────────────────────────────────────────────────────

  const handleToggleActive = async (record, nextValue) => {
    try {
      await http.put(`/api/admin/groups/${getGroupId(record)}`, { active: nextValue });
      message.success(nextValue ? "Grupa a fost activată." : "Grupa a fost dezactivată.");
      fetchAll();
    } catch (e) { message.error(`Nu am putut actualiza statusul: ${formatHttpError(e)}`); }
  };

  const handleStartGroup = async (record) => {
    try {
      await http.post(`/api/admin/groups/${getGroupId(record)}/start`, {});
      message.success("Grupa a fost pornită.");
      fetchAll();
    } catch (e) { message.error(`Nu am putut porni grupa: ${formatHttpError(e)}`); }
  };

  const handleStopGroup = async (record) => {
    try {
      await http.post(`/api/admin/groups/${getGroupId(record)}/stop`, {});
      message.success("Grupa a fost oprită.");
      fetchAll();
    } catch (e) { message.error(`Nu am putut opri grupa: ${formatHttpError(e)}`); }
  };

  const handleDeleteSafe = async (record) => {
    try {
      await http.delete(`/api/admin/groups/${getGroupId(record)}/delete-safe`);
      message.success("Grupa a fost ștearsă + attendance arhivat.");
      fetchAll();
    } catch (e) { message.error(`Nu am putut șterge: ${formatHttpError(e)}`); }
  };

  // ── Edit drawer ───────────────────────────────────────────────────────────

  const openEditDrawer = (record) => {
    setEditingGroup(record);
    setDrawerOpen(true);
    form.setFieldsValue({
      teacherId:   record.teacherId  ?? undefined,
      schoolId:    record.schoolId   ?? undefined,
      endDate:     record.endDate    || "",
      active:      Boolean(record.active ?? record.isActive),
      maxCapacity: record.maxCapacity ?? record.groupMaxCapacity ?? undefined,
    });
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditingGroup(null); form.resetFields(); };

  const onSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {};
      if (values.teacherId   !== undefined) payload.teacherId   = values.teacherId;
      if (values.schoolId    !== undefined) payload.schoolId    = values.schoolId;
      if (values.endDate)                   payload.endDate     = values.endDate;
      if (values.active      !== undefined) payload.active      = values.active;
      if (values.maxCapacity !== undefined) payload.maxCapacity = values.maxCapacity;
      await http.put(`/api/admin/groups/${getGroupId(editingGroup)}`, payload);
      message.success("Grupa a fost actualizată.");
      closeDrawer();
      fetchAll();
    } catch (e) { message.error(`Nu am putut salva: ${formatHttpError(e)}`); }
    finally { setSaving(false); }
  };

  // ── Create drawer ─────────────────────────────────────────────────────────

  const openCreateDrawer = () => {
    setCreateDrawerOpen(true);
    createForm.setFieldsValue({
      name: "", courseId: undefined, schoolId: undefined, teacherId: undefined,
      startDate: "", endDate: "", sessionStartTime: "17:00",
      maxCapacity: 12, sessionPrice: 100, maxRecoverySlots: 0, active: true,
    });
  };

  const closeCreateDrawer = () => { setCreateDrawerOpen(false); createForm.resetFields(); };

  const onCreateGroup = async () => {
    try {
      const v = await createForm.validateFields();
      setSavingCreate(true);
      await http.post("/api/admin/groups", v);
      message.success("Grupa a fost creată.");
      closeCreateDrawer();
      fetchAll();
    } catch (e) { message.error(`Nu am putut crea: ${formatHttpError(e)}`); }
    finally { setSavingCreate(false); }
  };

  // ── Sessions drawer ───────────────────────────────────────────────────────

  const openSessionsDrawer = async (record) => {
    const id = getGroupId(record);
    setSessionsGroup(record);
    setSessionsDrawerOpen(true);
    try {
      setSessionsLoading(true);
      const res = await http.get(`/api/admin/groups/${id}/sessions`);
      setSessions(Array.isArray(res) ? res : []);
    } catch (e) { message.error(`Nu am putut încărca sesiunile: ${formatHttpError(e)}`); }
    finally { setSessionsLoading(false); }
  };

  const closeSessionsDrawer = () => { setSessionsDrawerOpen(false); setSessions([]); setSessionsGroup(null); };

  // ── Columns grupe ─────────────────────────────────────────────────────────

  const groupColumns = useMemo(() => [
    { title: "Grupă", render: (_, r) => r.name || r.groupName || "—" },
    { title: "Curs",  render: (_, r) => r.courseName || r.course?.name || "—" },
    { title: "Școală", render: (_, r) => r.schoolName || r.school?.name || "—" },
    { title: "Perioadă", render: (_, r) => {
        const start = r.startDate || r.groupStartDate || "—";
        const end   = r.endDate   || r.groupEndDate   || "—";
        const time  = r.sessionStartTime || "";
        return `${start} → ${end}${time ? ` (${time})` : ""}`;
      }},
    { title: "Pornită", render: (_, r) => {
        const started = !!r.startConfirmedAt && !r.forceStopAt;
        return started ? <Tag color="green">DA</Tag> : <Tag>NU</Tag>;
      }},
    { title: "Locuri", render: (_, r) => {
        const used = Number(r.activeChildren ?? 0);
        const cap  = Number(r.maxCapacity ?? r.groupMaxCapacity ?? 0);
        if (!cap) return <Text>{used}</Text>;
        return used >= cap
            ? <Tag color="red">{used}/{cap}</Tag>
            : <Tag color="blue">{used}/{cap}</Tag>;
      }},
    { title: "Progres", render: (_, r) => `${Number(r.progressPercent ?? 0)}%` },
    { title: "Activ", render: (_, r) => {
        const isOn = r.active === true || r.isActive === true;
        return (
            <Popconfirm title={isOn ? "Dezactivezi?" : "Activezi?"} okText="Da" cancelText="Nu"
                        onConfirm={() => handleToggleActive(r, !isOn)}>
              <Switch checked={isOn} size="small" />
            </Popconfirm>
        );
      }},
    { title: "Acțiuni", render: (_, r) => (
          <Space size={4} wrap>
            <Popconfirm title="Pornești grupa?" okText="Da" cancelText="Nu"
                        onConfirm={() => handleStartGroup(r)}>
              <Button icon={<PlayCircleOutlined />} size="small">Start</Button>
            </Popconfirm>
            <Popconfirm title="Oprești grupa?" okText="Da" cancelText="Nu"
                        onConfirm={() => handleStopGroup(r)}>
              <Button icon={<StopOutlined />} size="small" danger>Stop</Button>
            </Popconfirm>
            <Button icon={<EditOutlined />} size="small" onClick={() => openEditDrawer(r)}>Edit</Button>
            <Button size="small" onClick={() => openSessionsDrawer(r)}>Sesiuni</Button>
            {canDeleteSafe(r) && (
                <Popconfirm title="Delete Safe?" description="Va arhiva prezențele și va șterge grupa."
                            okText="Da, șterge" cancelText="Nu" onConfirm={() => handleDeleteSafe(r)}>
                  <Button danger icon={<DeleteOutlined />} size="small">Delete Safe</Button>
                </Popconfirm>
            )}
          </Space>
      )},
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [teachers, schools, editingGroup]);

  // ── GridStack init ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!gridRef.current) return;

    const layout = loadLayout();

    // Inițializăm GridStack cu handleuri de drag custom
    gridInstance.current = GridStack.init(
        {
          column: 12,
          cellHeight: 60,
          margin: 10,
          animate: true,
          resizable: { handles: "se" },
          // Drag doar prin handle — nu pe tot widget-ul
          handle: ".gs-drag-handle",
        },
        gridRef.current
    );

    // Salvăm layout-ul în localStorage la fiecare schimbare
    gridInstance.current.on("change", () => {
      const items = gridInstance.current.save(false);
      saveLayout(items);
    });

    return () => {
      gridInstance.current?.destroy(false);
      gridInstance.current = null;
    };
  }, []);

  // ── Guard role ────────────────────────────────────────────────────────────

  if (session?.role !== "ADMIN") {
    return (
        <div style={{ maxWidth: 600, margin: "40px auto", padding: 16 }}>
          <Alert type="error" showIcon description="Această pagină este doar pentru ADMIN." />
        </div>
    );
  }

  const layout = loadLayout();
  const getPos = (id) => layout.find((l) => l.id === id) || {};

  // ── Render ────────────────────────────────────────────────────────────────

  return (
      <>
        <style>{GRID_STYLES}</style>

        {/* Header */}
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }} wrap>
          <div>
            <Title level={2} style={{ marginBottom: 0 }}>Dashboard Admin</Title>
            <Text type="secondary">Trage widget-urile pentru a personaliza layout-ul.</Text>
          </div>
          <Space>
            <Button onClick={() => { saveLayout(DEFAULT_LAYOUT); window.location.reload(); }}>
              Reset layout
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchAll}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
              Creează grupă
            </Button>
          </Space>
        </Space>

        {error && (
            <Alert type="error" showIcon style={{ marginBottom: 16 }}
                   description={<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{error}</pre>}
            />
        )}

        {/* GridStack container */}
        <div ref={gridRef} className="grid-stack">

          {/* Widget KPI-uri */}
          <div className="grid-stack-item"
               gs-id="kpis"
               gs-x={String(getPos("kpis").x ?? 0)}
               gs-y={String(getPos("kpis").y ?? 0)}
               gs-w={String(getPos("kpis").w ?? 12)}
               gs-h={String(getPos("kpis").h ?? 4)}
          >
            <div className="grid-stack-item-content">
              <Widget title="KPI-uri"
                      extra={<Text type="secondary" style={{ fontSize: 12 }}>Live</Text>}>
                <KpisWidget kpis={kpis} schools={schools} teachers={teachers} loading={loading} />
              </Widget>
            </div>
          </div>

          {/* Widget Grupe */}
          <div className="grid-stack-item"
               gs-id="groups"
               gs-x={String(getPos("groups").x ?? 0)}
               gs-y={String(getPos("groups").y ?? 4)}
               gs-w={String(getPos("groups").w ?? 12)}
               gs-h={String(getPos("groups").h ?? 8)}
          >
            <div className="grid-stack-item-content">
              <Widget title="Grupe"
                      extra={<Text type="secondary">Total: {groups.length}</Text>}>
                <Table
                    rowKey={(r) => getGroupId(r)}
                    columns={groupColumns}
                    dataSource={groups}
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 8, size: "small" }}
                    scroll={{ x: "max-content" }}
                />
              </Widget>
            </div>
          </div>

          {/* Widget Profesori */}
          <div className="grid-stack-item"
               gs-id="teachers"
               gs-x={String(getPos("teachers").x ?? 0)}
               gs-y={String(getPos("teachers").y ?? 12)}
               gs-w={String(getPos("teachers").w ?? 6)}
               gs-h={String(getPos("teachers").h ?? 6)}
          >
            <div className="grid-stack-item-content">
              <Widget title="Profesori"
                      extra={<Tag color="blue">{teachers.length}</Tag>}>
                <TeachersWidget teachers={teachers} loading={loading} />
              </Widget>
            </div>
          </div>

          {/* Widget Școli */}
          <div className="grid-stack-item"
               gs-id="schools"
               gs-x={String(getPos("schools").x ?? 6)}
               gs-y={String(getPos("schools").y ?? 12)}
               gs-w={String(getPos("schools").w ?? 6)}
               gs-h={String(getPos("schools").h ?? 6)}
          >
            <div className="grid-stack-item-content">
              <Widget title="Școli"
                      extra={<Tag color="green">{schools.length}</Tag>}>
                <SchoolsWidget schools={schools} loading={loading} />
              </Widget>
            </div>
          </div>

        </div>

        {/* ── Drawere (neschimbate) ── */}
        <Drawer title="Editează grupa" open={drawerOpen} onClose={closeDrawer}
                width={420} destroyOnClose
                footer={
                  <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                    <Button onClick={closeDrawer}>Renunță</Button>
                    <Button type="primary" loading={saving} onClick={onSaveEdit}>Salvează</Button>
                  </Space>
                }
        >
          <Form form={form} layout="vertical">
            <Form.Item name="teacherId" label={`Profesor (curent: ${editingGroup?.teacherName || "—"})`}>
              <Select placeholder="Alege profesor" allowClear showSearch
                      options={teachers.map((t) => ({ value: t.id, label: `${t.lastName} ${t.firstName}` }))}
                      filterOption={(i, o) => String(o?.label || "").toLowerCase().includes(i.toLowerCase())}
              />
            </Form.Item>
            <Form.Item name="schoolId" label={`Școală (curent: ${editingGroup?.schoolName || "—"})`}>
              <Select placeholder="Alege școală" allowClear showSearch
                      options={schools.map((s) => ({ value: s.id, label: s.name }))}
                      filterOption={(i, o) => String(o?.label || "").toLowerCase().includes(i.toLowerCase())}
              />
            </Form.Item>
            <Form.Item name="endDate" label="Data de final" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="active" label="Activ" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="maxCapacity" label="Capacitate maximă"
                       extra={editingGroup
                           ? `Locuri ocupate: ${editingGroup.activeChildren ?? 0}. Capacitatea nu poate scădea sub această valoare.`
                           : undefined}
                       rules={[{ validator: (_, value) => {
                           if (value == null) return Promise.resolve();
                           const occupied = Number(editingGroup?.activeChildren ?? 0);
                           if (value > 0 && value < occupied)
                             return Promise.reject(`Capacitatea (${value}) < locuri ocupate (${occupied}).`);
                           return Promise.resolve();
                         }}]}
            >
              <InputNumber min={0} style={{ width: "100%" }} placeholder="0 = nelimitat" />
            </Form.Item>
          </Form>
        </Drawer>

        <Drawer title="Creează grupă" open={createDrawerOpen} onClose={closeCreateDrawer}
                width={520} destroyOnClose
                footer={
                  <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                    <Button onClick={closeCreateDrawer}>Renunță</Button>
                    <Button type="primary" loading={savingCreate} onClick={onCreateGroup}>Creează</Button>
                  </Space>
                }
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="name" label="Nume grupă" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="courseId" label="Curs" rules={[{ required: true }]}>
              <Select showSearch options={courses.map((c) => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="schoolId" label="Școală" rules={[{ required: true }]}>
              <Select showSearch options={schools.map((s) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
            <Form.Item name="teacherId" label="Profesor" rules={[{ required: true }]}>
              <Select showSearch
                      options={teachers.map((t) => ({ value: t.id, label: `${t.lastName} ${t.firstName}` }))} />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="startDate" label="Start" rules={[{ required: true }]}><Input type="date" /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="endDate" label="End" rules={[{ required: true }]}><Input type="date" /></Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="sessionStartTime" label="Ora" rules={[{ required: true }]}><Input type="time" /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="maxCapacity" label="Capacitate" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="sessionPrice" label="Preț / sesiune" rules={[{ required: true }]}>
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="maxRecoverySlots" label="Max recuperări" rules={[{ required: true }]}>
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="active" label="Activ" valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Drawer>

        <Drawer title={`Sesiuni – ${sessionsGroup?.name || sessionsGroup?.groupName || ""}`}
                open={sessionsDrawerOpen} onClose={closeSessionsDrawer} width={820} destroyOnClose>
          <Table
              rowKey={(r) => r.id ?? r.idSession ?? `${r.sessionDate}-${r.time}`}
              dataSource={sessions}
              loading={sessionsLoading}
              pagination={{ pageSize: 12 }}
              columns={[
                { title: "Data",    dataIndex: "sessionDate",   key: "sessionDate" },
                { title: "Ora",     dataIndex: "time",          key: "time" },
                { title: "Status",  dataIndex: "sessionStatus", key: "sessionStatus", render: (v) => <Tag>{v}</Tag> },
                { title: "Tip",     dataIndex: "sessionType",   key: "sessionType" },
                { title: "Nume",    dataIndex: "name",          key: "name" },
                { title: "Școală",  dataIndex: "schoolName",    key: "schoolName" },
                { title: "Profesor",dataIndex: "teacherName",   key: "teacherName" },
              ]}
          />
        </Drawer>
      </>
  );
}
