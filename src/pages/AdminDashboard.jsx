import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  Popconfirm,
} from "antd";
import {
  ReloadOutlined,
  PlayCircleOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  StopOutlined,
} from "@ant-design/icons";

import { http, HttpError } from "../http.jsx";
import { loadSession } from "../auth/session.jsx";

const { Title, Text } = Typography;

// ── Helper funcție pură (înaintea componentei) ────────────────────────────────

/**
 * Aplică rezultatele unui Promise.allSettled pe state setters.
 * Extrasă din fetchAll pentru a reduce complexitatea ciclomatică
 * (SonarCloud: 20 → ~5).
 *
 * @param results  - array de rezultate allSettled
 * @param calls    - array de { key, label } corespunzătoare rezultatelor
 * @param setters  - map key → setter function (ex: { groups: setGroups })
 * @param onError  - callback pentru mesaje de eroare
 * @param formatErr - funcție de formatare eroare HTTP
 */
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

export default function AdminDashboard() {
  const session = loadSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [groups, setGroups] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);

  // edit drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // create drawer
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [createForm] = Form.useForm();

  // sessions drawer
  const [sessionsDrawerOpen, setSessionsDrawerOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsGroup, setSessionsGroup] = useState(null);

  // resolver unic
  const getGroupId = (r) => r?.id ?? r?.groupId ?? r?.groupClassId ?? r?.idGroup;

  // helper pt afisare erori backend (HttpError)
  const formatHttpError = (e) => {
    if (e instanceof HttpError) {
      const detailsMsg =
          e.details && typeof e.details === "object"
              ? e.details.message
                  ? String(e.details.message)
                  : JSON.stringify(e.details)
              : "";
      const raw = e.rawText ? String(e.rawText) : "";
      return `${e.status} ${e.statusText}${detailsMsg ? ` — ${detailsMsg}` : ""}${
          raw && !detailsMsg ? ` — ${raw}` : ""
      }`;
    }
    return e?.message || String(e);
  };

  // fetchAll robust
  const fetchAll = async () => {
    setLoading(true);
    setError(null);

    const calls = [
      { key: "groups",   label: "/api/admin/groups",   fn: () => http.get("/api/admin/groups") },
      { key: "schools",  label: "/api/admin/schools",  fn: () => http.get("/api/admin/schools") },
      { key: "teachers", label: "/api/admin/teachers", fn: () => http.get("/api/admin/teachers") },
      { key: "courses",  label: "/api/admin/courses",  fn: () => http.get("/api/admin/courses") },
    ];

    const results = await Promise.allSettled(calls.map((c) => c.fn()));

    // setters map — elimină cele 8 if-uri din forEach
    const setters = { groups: setGroups, schools: setSchools, teachers: setTeachers, courses: setCourses };
    applyAllSettledResults(results, calls, setters, setError, formatHttpError);

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // KPI-uri
  const kpis = useMemo(() => {
    const total = groups.length;
    const active = groups.filter((g) => g.active === true || g.isActive === true).length;
    const activeChildrenSum = groups.reduce(
        (sum, g) => sum + Number(g.activeChildren ?? g.activeChildrenCount ?? 0),
        0
    );
    const progressAvg =
        total === 0
            ? 0
            : Math.round(
                groups.reduce((sum, g) => sum + Number(g.progressPercent ?? g.progress ?? 0), 0) / total
            );

    return { total, active, activeChildrenSum, progressAvg };
  }, [groups]);

  // helpers
  const resolveIsActive = (r) => {
    if (typeof r?.isActive === "boolean") return r.isActive;
    if (typeof r?.active === "boolean") return r.active;
    return true;
  };

  const canDeleteSafe = (r) => {
    const isActive = resolveIsActive(r);
    if (isActive === false) return true;

    const end = r?.endDate || r?.groupEndDate;
    if (!end) return false;

    const endDate = new Date(`${end}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return today > endDate;
  };

  // actions
  const handleToggleActive = async (record, nextValue) => {
    try {
      const id = getGroupId(record);
      await http.put(`/api/admin/groups/${id}`, { active: nextValue });
      message.success(nextValue ? "Grupa a fost activată." : "Grupa a fost dezactivată.");
      fetchAll();
    } catch (e) {
      message.error(`Nu am putut actualiza statusul grupei: ${formatHttpError(e)}`);
    }
  };

  const handleStartGroup = async (record) => {
    try {
      const id = getGroupId(record);
      await http.post(`/api/admin/groups/${id}/start`, {});
      message.success("Grupa a fost pornită (sau era deja pornită).");
      fetchAll();
    } catch (e) {
      message.error(`Nu am putut porni grupa: ${formatHttpError(e)}`);
    }
  };

  const handleStopGroup = async (record) => {
    try {
      const id = getGroupId(record);
      await http.post(`/api/admin/groups/${id}/stop`, {
        reason: "STOP by admin",
        // effectiveDate: "2026-01-13" // optional
      });
      message.success("Grupa a fost oprită: viitoarele sesiuni PLANNED au devenit CANCELED_MANUAL.");
      fetchAll();
    } catch (e) {
      message.error(`Nu am putut opri grupa: ${formatHttpError(e)}`);
    }
  };

  const handleDeleteSafe = async (record) => {
    try {
      const id = getGroupId(record);
      await http.delete(`/api/admin/groups/${id}/delete-safe`);
      message.success("Grupa a fost ștearsă (Delete Safe) + attendance arhivat.");
      fetchAll();
    } catch (e) {
      message.error(`Nu am putut șterge grupa: ${formatHttpError(e)}`);
    }
  };

  // edit drawer MODIFICARE A: openEditDrawer — adaugă maxCapacity la setFieldsValue
  const openEditDrawer = (record) => {
    setEditingGroup(record);
    setDrawerOpen(true);
    form.setFieldsValue({
      teacherId:   record.teacherId  ?? undefined,
      schoolId:    record.schoolId   ?? undefined,
      endDate:     record.endDate    || "",
      active:      Boolean(record.active ?? record.isActive),
      maxCapacity: record.maxCapacity ?? record.groupMaxCapacity ?? undefined, // ← NOU Modul 1
    });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingGroup(null);
    form.resetFields();
  };

  const onSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const id = getGroupId(editingGroup);

      // MODIFICARE B: onSaveEdit — include maxCapacity în payload
      const payload = {};
      if (values.teacherId   !== undefined) payload.teacherId   = values.teacherId;
      if (values.schoolId    !== undefined) payload.schoolId    = values.schoolId;
      if (values.endDate)                   payload.endDate     = values.endDate;
      if (values.active      !== undefined) payload.active      = values.active;
      if (values.maxCapacity !== undefined) payload.maxCapacity = values.maxCapacity; // ← NOU Modul 1

      await http.put(`/api/admin/groups/${id}`, payload);
      message.success("Grupa a fost actualizată.");
      closeDrawer();
      fetchAll();
    } catch (e) {
      message.error(`Nu am putut salva: ${formatHttpError(e)}`);
    } finally {
      setSaving(false);
    }
  };

  // create drawer
  const openCreateDrawer = () => {
    setCreateDrawerOpen(true);
    createForm.setFieldsValue({
      name: "",
      courseId: undefined,
      schoolId: undefined,
      teacherId: undefined,
      startDate: "",
      endDate: "",
      sessionStartTime: "17:00",
      maxCapacity: 12,
      sessionPrice: 100,
      maxRecoverySlots: 0,
      active: true,
    });
  };

  const closeCreateDrawer = () => {
    setCreateDrawerOpen(false);
    createForm.resetFields();
  };

  const onCreateGroup = async () => {
    try {
      const v = await createForm.validateFields();
      setSavingCreate(true);

      const payload = {
        name: v.name,
        courseId: v.courseId,
        schoolId: v.schoolId,
        teacherId: v.teacherId,
        startDate: v.startDate,
        endDate: v.endDate,
        sessionStartTime: v.sessionStartTime,
        maxCapacity: v.maxCapacity,
        sessionPrice: v.sessionPrice,
        maxRecoverySlots: v.maxRecoverySlots,
        active: v.active,
      };

      await http.post("/api/admin/groups", payload);
      message.success("Grupa a fost creată (și sesiunile au fost generate).");
      closeCreateDrawer();
      fetchAll();
    } catch (e) {
      message.error(`Nu am putut crea grupa: ${formatHttpError(e)}`);
    } finally {
      setSavingCreate(false);
    }
  };

  // sessions drawer
  const openSessionsDrawer = async (record) => {
    const id = getGroupId(record);
    setSessionsGroup(record);
    setSessionsDrawerOpen(true);

    try {
      setSessionsLoading(true);
      const res = await http.get(`/api/admin/groups/${id}/sessions`);
      setSessions(Array.isArray(res) ? res : []);
    } catch (e) {
      message.error(`Nu am putut încărca sesiunile: ${formatHttpError(e)}`);
    } finally {
      setSessionsLoading(false);
    }
  };

  const closeSessionsDrawer = () => {
    setSessionsDrawerOpen(false);
    setSessions([]);
    setSessionsGroup(null);
  };

  // table columns
  const columns = [
    {
      title: "Grupă",
      dataIndex: "name",
      key: "name",
      render: (value, record) => value || record.groupName || record.name || "-",
    },
    {
      title: "Curs",
      key: "course",
      render: (_, record) => record.courseName || record.course?.name || "-",
    },
    {
      title: "Școală",
      key: "school",
      render: (_, record) => record.schoolName || record.school?.name || "-",
    },
    {
      title: "Perioadă",
      key: "period",
      render: (_, record) => {
        const start = record.startDate || record.groupStartDate || "-";
        const end = record.endDate || record.groupEndDate || "-";
        const time = record.sessionStartTime || record.time || "";
        return `${start} → ${end}${time ? ` (${time})` : ""}`;
      },

    },

    // Pornită = DA doar dacă are startConfirmedAt și NU are forceStopAt
    {
      title: "Pornită",
      key: "started",
      render: (_, r) => {
        const started = !!r.startConfirmedAt && !r.forceStopAt;
        return started ? <Tag color="green">DA</Tag> : <Tag>NU</Tag>;
      },

    },

    {
      title: "Capacitate",
      key: "capacity",
      render: (_, r) => Number(r.maxCapacity ?? r.groupMaxCapacity ?? 0),
    },
    {
      title: "Locuri ocupate",
      key: "seatsUsed",
      render: (_, r) => {
        const used = Number(r.activeChildren ?? 0);
        const cap = Number(r.maxCapacity ?? r.groupMaxCapacity ?? 0);
        if (!cap) return <Text>{used}</Text>;
        const full = used >= cap;
        return full ? <Tag color="red">{used}/{cap}</Tag> : <Tag color="blue">{used}/{cap}</Tag>;
      },
    },
    {
      title: "Recuperări (max)",
      key: "recoveryMax",
      render: (_, r) => Number(r.maxRecoverySlots ?? 0),
    },
    {
      title: "Recuperări ocupate",
      key: "recoveryUsed",
      render: (_, r) => {
        const used = Number(r.usedRecoverySlots ?? 0);
        const max = Number(r.maxRecoverySlots ?? 0);
        if (!max) return <Text>{used}</Text>;
        const full = used >= max;
        return full ? <Tag color="red">{used}/{max}</Tag> : <Tag color="purple">{used}/{max}</Tag>;
      },
    },


    // NEW columns
    {
      title: "Start confirmat",
      key: "startConfirmedAt",
      render: (_, r) =>
          r.startConfirmedAt ? <Text>{r.startConfirmedAt}</Text> : <Text type="secondary">-</Text>,
    },
      /* Am dezactivat Force stop sa nu mai afiseze data cand a fost oprita
    {
      title: "Force stop",
      key: "forceStopAt",
      render: (_, r) =>
          r.forceStopAt ? <Text>{r.forceStopAt}</Text> : <Text type="secondary">-</Text>,
    },
*/
    {
      title: "Progres",
      key: "progress",
      render: (_, record) => <Text>{Number(record.progressPercent ?? 0)}%</Text>,
    },
    {
      title: "Copii activi",
      key: "activeChildren",
      render: (_, record) => Number(record.activeChildren ?? 0),
    },
    {
      title: "Activ",
      key: "active",
      render: (_, record) => {
        const isOn = record.active === true || record.isActive === true;
        return (
            <Popconfirm
                title={isOn ? "Dezactivezi grupa?" : "Activezi grupa?"}
                okText="Da"
                cancelText="Nu"
                onConfirm={() => handleToggleActive(record, !isOn)}
            >
              <Switch checked={isOn} />
            </Popconfirm>
        );
      },
    },
    {
      title: "Acțiuni",
      key: "actions",
      render: (_, record) => (
          <Space>
            <Popconfirm
                title="Pornești grupa acum?"
                okText="Da"
                cancelText="Nu"
                onConfirm={() => handleStartGroup(record)}
            >
              <Button icon={<PlayCircleOutlined />} size="small">
                Start
              </Button>
            </Popconfirm>

            <Popconfirm
                title="Oprești grupa?"
                description="Grupa devine inactivă și toate sesiunile viitoare PLANNED devin CANCELED_MANUAL."
                okText="Da, oprește"
                cancelText="Nu"
                onConfirm={() => handleStopGroup(record)}
            >
              <Button icon={<StopOutlined />} size="small" danger>
                Stop
              </Button>
            </Popconfirm>

            <Button icon={<EditOutlined />} size="small" onClick={() => openEditDrawer(record)}>
              Edit
            </Button>

            <Button size="small" onClick={() => openSessionsDrawer(record)}>
              Sesiuni
            </Button>

            {canDeleteSafe(record) && (
                <Popconfirm
                    title="Delete Safe?"
                    description="Va arhiva toate prezențele (attendance) și va șterge grupa + sesiunile + legăturile."
                    okText="Da, șterge"
                    cancelText="Nu"
                    onConfirm={() => handleDeleteSafe(record)}
                >
                  <Button danger icon={<DeleteOutlined />} size="small">
                    Delete Safe
                  </Button>
                </Popconfirm>
            )}
          </Space>
      ),
    },
  ];

  if (session?.role !== "ADMIN") {
    return (
        <div style={{ maxWidth: 600, margin: "40px auto", padding: 16 }}>
          <Alert type="error" showIcon description="Această pagină este doar pentru ADMIN." />
        </div>
    );
  }

  return (
      <>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <div>
              <Title level={2} style={{ marginBottom: 0 }}>
                Dashboard Admin
              </Title>
              <Text type="secondary">KPI-uri și management grupe.</Text>
            </div>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchAll}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                Creează grupă
              </Button>
            </Space>
          </Space>

          {error ? (
              <Alert
                  type="error"
                  showIcon
                  description={<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{error}</pre>}
              />
          ) : null}

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card>{loading ? <Skeleton active /> : <Statistic title="Grupe active" value={kpis.active} />}</Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>{loading ? <Skeleton active /> : <Statistic title="Grupe totale" value={kpis.total} />}</Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                {loading ? <Skeleton active /> : <Statistic title="Copii activi" value={kpis.activeChildrenSum} />}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                {loading ? <Skeleton active /> : <Statistic title="Progres mediu" value={`${kpis.progressAvg}%`} />}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>{loading ? <Skeleton active /> : <Statistic title="Școli" value={schools.length} />}</Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>{loading ? <Skeleton active /> : <Statistic title="Profesori" value={teachers.length} />}</Card>
            </Col>
          </Row>

          <Card title="Grupe" extra={<Text type="secondary">Total: {groups.length}</Text>}>
            <Table
                rowKey={(record) => getGroupId(record)}
                columns={columns}
                dataSource={groups}
                loading={loading}
                pagination={{ pageSize: 8 }}
            />
          </Card>


          <Drawer
              title="Editează grupa"
              open={drawerOpen}
              onClose={closeDrawer}
              width={420}
              destroyOnClose
              footer={
                <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                  <Button onClick={closeDrawer}>Renunță</Button>
                  <Button type="primary" loading={saving} onClick={onSaveEdit}>
                    Salvează
                  </Button>
                </Space>
              }
          >
            <Form form={form} layout="vertical">
              <Form.Item name="teacherId" label={`Profesor (curent: ${editingGroup?.teacherName || "-"})`}>
                <Select
                    placeholder="Alege profesor"
                    allowClear
                    showSearch
                    options={teachers.map((t) => ({
                      value: t.id,
                      label: `${t.lastName} ${t.firstName}`,
                    }))}
                    filterOption={(input, option) =>
                        String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                    }
                />
              </Form.Item>

              <Form.Item name="schoolId" label={`Școală (curent: ${editingGroup?.schoolName || "-"})`}>
                <Select
                    placeholder="Alege școală"
                    allowClear
                    showSearch
                    options={schools.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    filterOption={(input, option) =>
                        String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                    }
                />
              </Form.Item>

              <Form.Item
                  name="endDate"
                  label="Data de final (endDate)"
                  rules={[{ required: true, message: "Te rog introdu endDate." }]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item name="active" label="Activ" valuePropName="checked">
                <Switch />
              </Form.Item>

              {/* Modul 1 — Editare capacitate grupă cu validare anti-suprascriere */}
              <Form.Item
                  name="maxCapacity"
                  label="Capacitate maximă"
                  extra={
                    editingGroup
                        ? `Locuri ocupate curent: ${editingGroup.activeChildren ?? 0}. ` +
                        `Capacitatea nu poate scădea sub această valoare.`
                        : undefined
                  }
                  rules={[
                    { required: false },
                    {
                      validator: (_, value) => {
                        if (value === undefined || value === null) return Promise.resolve();
                        const occupied = Number(editingGroup?.activeChildren ?? 0);
                        if (value > 0 && value < occupied) {
                          return Promise.reject(
                              `Capacitatea (${value}) nu poate fi mai mică decât locurile ocupate (${occupied}).`
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
              >
                <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="0 = nelimitat"
                />
              </Form.Item>

            </Form>
          </Drawer>


          <Drawer
              title="Creează grupă"
              open={createDrawerOpen}
              onClose={closeCreateDrawer}
              width={520}
              destroyOnClose
              footer={
                <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                  <Button onClick={closeCreateDrawer}>Renunță</Button>
                  <Button type="primary" loading={savingCreate} onClick={onCreateGroup}>
                    Creează
                  </Button>
                </Space>
              }
          >
            <Form form={createForm} layout="vertical">
              <Form.Item name="name" label="Nume grupă" rules={[{ required: true }]}>
                <Input />
              </Form.Item>

              <Form.Item name="courseId" label="Curs" rules={[{ required: true }]}>
                <Select showSearch options={courses.map((c) => ({ value: c.id, label: c.name }))} />
              </Form.Item>

              <Form.Item name="schoolId" label="Școală" rules={[{ required: true }]}>
                <Select showSearch options={schools.map((s) => ({ value: s.id, label: s.name }))} />
              </Form.Item>

              <Form.Item name="teacherId" label="Profesor" rules={[{ required: true }]}>
                <Select
                    showSearch
                    options={teachers.map((t) => ({
                      value: t.id,
                      label: `${t.lastName} ${t.firstName}`,
                    }))}
                />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="startDate" label="Start" rules={[{ required: true }]}>
                    <Input type="date" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="endDate" label="End" rules={[{ required: true }]}>
                    <Input type="date" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="sessionStartTime" label="Ora" rules={[{ required: true }]}>
                    <Input type="time" />
                  </Form.Item>
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

              <Form.Item name="active" label="Activ" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Form>
          </Drawer>

          <Drawer
              title={`Sesiuni – ${sessionsGroup?.name || sessionsGroup?.groupName || ""}`}
              open={sessionsDrawerOpen}
              onClose={closeSessionsDrawer}
              width={820}
              destroyOnClose
          >
            <Table
                rowKey={(r) => r.id ?? r.idSession ?? `${r.sessionDate}-${r.time}-${r.name}`}
                dataSource={sessions}
                loading={sessionsLoading}
                pagination={{ pageSize: 12 }}
                columns={[
                  { title: "Data", dataIndex: "sessionDate", key: "sessionDate" },
                  { title: "Ora", dataIndex: "time", key: "time" },
                  { title: "Status", dataIndex: "sessionStatus", key: "sessionStatus", render: (v) => <Tag>{v}</Tag> },
                  { title: "Tip", dataIndex: "sessionType", key: "sessionType" },
                  { title: "Nume", dataIndex: "name", key: "name" },
                  { title: "Școală", dataIndex: "schoolName", key: "schoolName" },
                  { title: "Profesor", dataIndex: "teacherName", key: "teacherName" },
                ]}
            />
          </Drawer>
        </Space>
      </>
  );
}