/**
 * AdminParentsPage — pagina de management părinți.
 *
 * Layout: două coloane
 *   Stânga  → tabel paginat cu toți părinții (filtrare, status activ/inactiv)
 *   Dreapta → panoul de detalii al părintelui selectat:
 *               • Card info părinte (email, telefon, copii, status)
 *               • Butoane: Schimbă email / Dezactivează-Reactivează CONT
 *               • Card copii cu tabelul copiilor + acțiuni per-copil (NOU)
 *
 * Module implementate:
 *   Modul 2 → Adăugare copil nou (Drawer)
 *   Modul 3 → Schimbare email (Modal)
 *   Modul 4 → Dezactivare / reactivare cont PARINTE
 *   NOU     → Dezactivare / reactivare COPIL individual, per rând în tabel
 *
 * Interacțiunea stare parinte ↔ stare copil:
 *   Dezactivarea PĂRINTELUI → toți copiii eliberează locurile (child.active nemodificat)
 *   Dezactivarea COPILULUI  → un copil dezactivat individual (frate rămâne activ)
 *   Un copil dezactivat individual rămâne dezactivat chiar dacă părintele e activ.
 */
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
    message,
    Modal,
    Popconfirm,
    Row,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import {
    EditOutlined,
    PlusOutlined,
    UserDeleteOutlined,
    UserAddOutlined,
    StopOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminApi } from "../adminApi.js";

const { Title, Text } = Typography;

/** Returnează "—" pentru null/undefined/string gol — evitam "null" sau "" în UI */
function safe(v) {
    return v === null || v === undefined || v === "" ? "—" : v;
}

export default function AdminParentsPage() {

    // ── URL param: parentId selectat ─────────────────────────────────────────
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const urlParentId = useMemo(() => {
        const raw = searchParams.get("parentId");
        const n   = raw ? Number(raw) : NaN;
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [searchParams]);

    // ── State: lista părinți ─────────────────────────────────────────────────
    const [q,            setQ]            = useState("");
    const [loadingList,  setLoadingList]  = useState(false);
    const [page,         setPage]         = useState(0);
    const [size,         setSize]         = useState(10);
    const [parents,      setParents]      = useState([]);
    const [total,        setTotal]        = useState(0);

    // ── State: detalii părinte selectat ──────────────────────────────────────
    const [selectedParentId,   setSelectedParentId]  = useState(null);
    const [loadingDetails,     setLoadingDetails]    = useState(false);
    const [details,            setDetails]           = useState(null);

    // ── State: Modul 2 — Adăugare copil ──────────────────────────────────────
    const [addChildOpen,  setAddChildOpen]  = useState(false);
    const [savingChild,   setSavingChild]   = useState(false);
    const [addChildForm]                    = Form.useForm();

    // ── State: Modul 3 — Schimbare email ─────────────────────────────────────
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [savingEmail,    setSavingEmail]    = useState(false);
    const [emailForm]                         = Form.useForm();

    // ── State: Modul 4 — Dezactivare/reactivare PARINTE ──────────────────────
    const [togglingParent, setTogglingParent] = useState(false);

    // ── State: NOU — Dezactivare/reactivare COPIL individual ─────────────────
    // Cheia este childId: true înseamnă că acel copil are operația în curs
    // Folosim un Map în loc de un singur boolean pentru a suporta click rapid
    // pe butoane diferite (improbabil dar corect)
    const [togglingChildId, setTogglingChildId] = useState(null);

    // ── Sincronizare URL ↔ selectedParentId ──────────────────────────────────
    useEffect(() => {
        setSelectedParentId(urlParentId);
    }, [urlParentId]);

    const selectParent = (parentId) => {
        const valid = parentId ? Number(parentId) : null;
        setSelectedParentId(valid);
        setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            if (valid) p.set("parentId", String(valid));
            else       p.delete("parentId");
            return p;
        });
    };

    // ── Load lista părinți ────────────────────────────────────────────────────
    const loadParents = async () => {
        setLoadingList(true);
        try {
            const res = await adminApi.getParents(q, page, size);
            setParents(Array.isArray(res?.items) ? res.items : []);
            setTotal(Number(res?.totalItems || 0));
        } catch (e) {
            message.error(e?.message || "Nu pot încărca lista părinților.");
        } finally {
            setLoadingList(false);
        }
    };

    // ── Load detalii un părinte ───────────────────────────────────────────────
    const loadDetails = async (parentId) => {
        if (!parentId) return;
        setLoadingDetails(true);
        try {
            const res = await adminApi.getParentDetails(parentId);
            setDetails(res || null);
        } catch (e) {
            message.error(e?.message || "Nu pot încărca detaliile părintelui.");
            setDetails(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => { loadParents(); }, [q, page, size]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (selectedParentId) loadDetails(selectedParentId);
        else                  setDetails(null);
    }, [selectedParentId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ══════════════════════════════════════════════════════════════════════════
    // Modul 2: Handlers adăugare copil
    // ══════════════════════════════════════════════════════════════════════════

    const openAddChild = () => {
        addChildForm.resetFields();
        setAddChildOpen(true);
    };

    const handleAddChild = async () => {
        let values;
        try   { values = await addChildForm.validateFields(); }
        catch { return; } // Ant Design afișează erorile de validare în form

        setSavingChild(true);
        try {
            await adminApi.addChildToParent(selectedParentId, {
                firstName:   values.firstName,
                lastName:    values.lastName,
                age:         values.age         ?? null,
                school:      values.school       || null,
                schoolClass: values.schoolClass  || null,
            });
            message.success("Copil adăugat cu succes.");
            setAddChildOpen(false);
            // Reîmprospătăm ambele — detalii (lista copii actualizată) și lista (childrenCount)
            loadDetails(selectedParentId);
            loadParents();
        } catch (e) {
            message.error(e?.message || "Eroare la adăugarea copilului.");
        } finally {
            setSavingChild(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════════════
    // Modul 3: Handlers schimbare email
    // ══════════════════════════════════════════════════════════════════════════

    const openChangeEmail = () => {
        emailForm.resetFields();
        setEmailModalOpen(true);
    };

    const handleChangeEmail = async () => {
        let values;
        try   { values = await emailForm.validateFields(); }
        catch { return; }

        setSavingEmail(true);
        try {
            const updated = await adminApi.changeParentEmail(selectedParentId, values.newEmail);
            message.success("Email actualizat. Notificări trimise pe ambele adrese.");
            setEmailModalOpen(false);

            // Update optimistic local — evitam un re-fetch complet pentru o schimbare simplă
            setDetails((prev) =>
                prev ? { ...prev, parent: { ...prev.parent, email: updated.email } } : prev
            );
            setParents((prev) =>
                prev.map((p) =>
                    p.parentId === selectedParentId ? { ...p, email: updated.email } : p
                )
            );
        } catch (e) {
            message.error(e?.message || "Eroare la schimbarea email-ului.");
        } finally {
            setSavingEmail(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════════════
    // Modul 4: Handlers dezactivare / reactivare PARINTE
    // ══════════════════════════════════════════════════════════════════════════

    const handleToggleParent = async () => {
        // null/undefined = activ (compatibilitate cu datele vechi)
        const isActive = details?.parent?.active !== false;
        setTogglingParent(true);
        try {
            const res = isActive
                ? await adminApi.deactivateParent(selectedParentId)
                : await adminApi.activateParent(selectedParentId);
            message.success(res?.message || (isActive ? "Cont dezactivat." : "Cont reactivat."));
            // Refresh complet — starea s-a schimbat pe server
            await loadDetails(selectedParentId);
            await loadParents();
        } catch (e) {
            message.error(e?.message || "Eroare la modificarea stării contului.");
        } finally {
            setTogglingParent(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════════════
    // NOU: Handlers dezactivare / reactivare COPIL individual
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Dezactivează sau reactivează un copil individual.
     *
     * @param childId  ID-ul copilului
     * @param isActive starea CURENTĂ a copilului (true=activ → dezactivăm; false=inactiv → reactivăm)
     */
    const handleToggleChild = async (childId, isActive) => {
        // Marcăm EXACT acel copil ca "loading" — ceilalți rămân interactivi
        setTogglingChildId(childId);
        try {
            const res = isActive
                ? await adminApi.deactivateChild(childId)
                : await adminApi.activateChild(childId);

            message.success(res?.message || (isActive ? "Copil dezactivat." : "Copil reactivat."));

            // Reload detalii — actualizăm tabelul de copii cu noua stare
            // Nu reîncărcăm lista părinților — childrenCount nu se schimbă la dezactivare copil
            await loadDetails(selectedParentId);
        } catch (e) {
            message.error(e?.message || "Eroare la modificarea stării copilului.");
        } finally {
            setTogglingChildId(null);
        }
    };

    // ══════════════════════════════════════════════════════════════════════════
    // Coloane tabel părinți (coloana din stânga)
    // ══════════════════════════════════════════════════════════════════════════

    const parentColumns = useMemo(() => [
        {
            title: "Părinte",
            key: "p",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{safe(r.lastName)} {safe(r.firstName)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {safe(r.email)} · {safe(r.phone)}
                    </Text>
                </Space>
            ),
        },
        {
            title: "Copii",
            dataIndex: "childrenCount",
            key: "childrenCount",
            width: 70,
            render: (v) => <Tag>{v ?? 0}</Tag>,
        },
        {
            title: "Status",
            dataIndex: "active",
            key: "active",
            width: 90,
            render: (v) =>
                v === false
                    ? <Tag color="red">Inactiv</Tag>
                    : <Tag color="green">Activ</Tag>,
        },
    ], []);

    // ══════════════════════════════════════════════════════════════════════════
    // Coloane tabel copii (în panoul de detalii — dreapta)
    // ══════════════════════════════════════════════════════════════════════════

    const childColumns = useMemo(() => [
        {
            title: "Copil",
            key: "c",
            render: (_, r) => {
                // Un copil poate fi inactiv din două motive independente:
                //   1. child.active=false → dezactivat individual de admin
                //   2. Părintele dezactivat → ChildGroup-urile inactive, dar child.active=null/true
                // Afișăm tag-ul "Inactiv" numai dacă child.active este explicit false
                const childInactive = r.active === false;

                return (
                    <Space direction="vertical" size={0}>
                        <Space size={4}>
                            <Text strong>
                                {safe(r.childLastName)} {safe(r.childFirstName)}
                            </Text>
                            {/* Tag status copil — vizibil numai dacă dezactivat individual */}
                            {childInactive && <Tag color="red">Inactiv</Tag>}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {safe(r.school)} · {safe(r.schoolClass)}
                            {r.age ? ` · ${r.age} ani` : ""}
                        </Text>
                        <Button
                            type="link"
                            size="small"
                            style={{ padding: 0 }}
                            onClick={() => navigate(`/admin/children?childId=${r.childId}`)}
                        >
                            Vezi profil →
                        </Button>
                    </Space>
                );
            },
        },
        {
            title: "Grupă activă",
            key: "g",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text>{safe(r.groupName)}</Text>
                    {r.enrollmentDate && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Înscris: {r.enrollmentDate}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            // Coloana de acțiuni per-copil — NOU
            title: "Acțiuni",
            key: "actions",
            width: 140,
            render: (_, r) => {
                // null/undefined tratat ca activ (compatibilitate cu datele vechi)
                const childIsActive = r.active !== false;
                const isLoading     = togglingChildId === r.childId;

                if (childIsActive) {
                    // Copil ACTIV → buton "Dezactivează" cu Popconfirm de confirmare
                    return (
                        <Popconfirm
                            title="Dezactivează copil"
                            description={
                                <>
                                    <p style={{ margin: "4px 0" }}>
                                        Locul din grupă va fi eliberat.
                                    </p>
                                    <p style={{ margin: "4px 0", color: "#888", fontSize: 12 }}>
                                        Frații/surorile nu sunt afectați.
                                    </p>
                                </>
                            }
                            okText="Dezactivează"
                            okButtonProps={{ danger: true }}
                            cancelText="Anulează"
                            onConfirm={() => handleToggleChild(r.childId, true)}
                        >
                            <Button
                                size="small"
                                danger
                                icon={<StopOutlined />}
                                loading={isLoading}
                            >
                                Dezactivează
                            </Button>
                        </Popconfirm>
                    );
                } else {
                    // Copil INACTIV → buton "Reactivează" simplu
                    return (
                        <Popconfirm
                            title="Reactivează copil"
                            description="Copilul va fi reactivat. Înscrierea în grupe trebuie refăcută manual."
                            okText="Reactivează"
                            cancelText="Anulează"
                            onConfirm={() => handleToggleChild(r.childId, false)}
                        >
                            <Button
                                size="small"
                                icon={<CheckCircleOutlined />}
                                loading={isLoading}
                            >
                                Reactivează
                            </Button>
                        </Popconfirm>
                    );
                }
            },
        },
    ], [navigate, togglingChildId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ══════════════════════════════════════════════════════════════════════════
    // Render
    // ══════════════════════════════════════════════════════════════════════════

    const parent   = details?.parent;
    // null/undefined pe parent.active = activ (conturile vechi fără câmpul active)
    const isActive = parent ? parent.active !== false : true;

    // Numărul de copii dezactivați individual — afișat ca avertisment în panoul de detalii
    const deactivatedChildCount = (details?.children ?? []).filter(c => c.active === false).length;

    const deactivateParentWarning =
        "Dezactivarea va elibera locurile copiilor din toate grupele active. " +
        "Această acțiune nu poate fi anulată automat.";

    return (
        <>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
                <Title level={3} style={{ margin: 0 }}>Admin Părinți</Title>

                <Row gutter={16}>

                    {/* ── Coloana stânga: Tabel părinți ─────────────────────── */}
                    <Col xs={24} lg={9}>
                        <Card
                            title="Părinți"
                            extra={
                                <Input.Search
                                    placeholder="Caută (nume / email / telefon)"
                                    allowClear
                                    value={q}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setPage(0);
                                        setQ(val);
                                        if (!val) selectParent(null);
                                    }}
                                    onSearch={() => setPage(0)}
                                    style={{ width: 240 }}
                                />
                            }
                        >
                            <Table
                                rowKey="parentId"
                                loading={loadingList}
                                columns={parentColumns}
                                dataSource={parents}
                                size="middle"
                                pagination={{
                                    current:         page + 1,
                                    pageSize:        size,
                                    total,
                                    showSizeChanger: true,
                                    onChange:        (p, ps) => { setPage(p - 1); setSize(ps); },
                                }}
                                onRow={(r) => ({
                                    onClick:    () => selectParent(r.parentId),
                                    style:      { cursor: "pointer" },
                                })}
                                rowClassName={(r) =>
                                    r.parentId === selectedParentId ? "ant-table-row-selected" : ""
                                }
                            />
                        </Card>
                    </Col>

                    {/* ── Coloana dreapta: Detalii ───────────────────────────── */}
                    <Col xs={24} lg={15}>
                        <Card title="Detalii">
                            {!selectedParentId && (
                                <Text type="secondary">Selectează un părinte din stânga.</Text>
                            )}

                            {selectedParentId && (
                                <Space direction="vertical" style={{ width: "100%" }} size="large">

                                    {/* ── Card info părinte ── */}
                                    <Card
                                        size="small"
                                        loading={loadingDetails}
                                        title={
                                            <Space>
                                                <span>Părinte</span>
                                                {parent && (
                                                    isActive
                                                        ? <Tag color="green">Activ</Tag>
                                                        : <Tag color="red">Inactiv</Tag>
                                                )}
                                            </Space>
                                        }
                                        extra={
                                            !loadingDetails && parent && (
                                                <Space>
                                                    {/* Modul 3: Schimbare email */}
                                                    <Tooltip title="Schimbă email-ul de login">
                                                        <Button
                                                            size="small"
                                                            icon={<EditOutlined />}
                                                            onClick={openChangeEmail}
                                                        >
                                                            Email
                                                        </Button>
                                                    </Tooltip>

                                                    {/* Modul 4: Dezactivare / reactivare CONT */}
                                                    {isActive ? (
                                                        <Popconfirm
                                                            title="Dezactivează cont"
                                                            description={deactivateParentWarning}
                                                            okText="Dezactivează"
                                                            okButtonProps={{ danger: true }}
                                                            cancelText="Anulează"
                                                            onConfirm={handleToggleParent}
                                                        >
                                                            <Button
                                                                size="small"
                                                                danger
                                                                icon={<UserDeleteOutlined />}
                                                                loading={togglingParent}
                                                            >
                                                                Dezactivează cont
                                                            </Button>
                                                        </Popconfirm>
                                                    ) : (
                                                        <Popconfirm
                                                            title="Reactivează cont"
                                                            description="Contul va fi reactivat. Copiii trebuie re-înscriși manual în grupe."
                                                            okText="Reactivează"
                                                            cancelText="Anulează"
                                                            onConfirm={handleToggleParent}
                                                        >
                                                            <Button
                                                                size="small"
                                                                icon={<UserAddOutlined />}
                                                                loading={togglingParent}
                                                            >
                                                                Reactivează cont
                                                            </Button>
                                                        </Popconfirm>
                                                    )}
                                                </Space>
                                            )
                                        }
                                    >
                                        <Space direction="vertical" size={4}>
                                            <Text>
                                                <Text strong>Nume: </Text>
                                                {safe(parent?.lastName)} {safe(parent?.firstName)}
                                            </Text>
                                            <Text>
                                                <Text strong>Email: </Text>
                                                {safe(parent?.email)}
                                            </Text>
                                            <Text>
                                                <Text strong>Telefon: </Text>
                                                {safe(parent?.phone)}
                                            </Text>
                                            <Text>
                                                <Text strong>Copii: </Text>
                                                {parent?.childrenCount ?? 0}
                                            </Text>
                                        </Space>
                                    </Card>

                                    {/* ── Avertisment copii dezactivați individual ── */}
                                    {deactivatedChildCount > 0 && (
                                        <Alert
                                            type="warning"
                                            showIcon
                                            message={`${deactivatedChildCount} copil(i) dezactivat(i) individual`}
                                            description="Acești copii sunt dezactivați individual, independent de starea contului părintelui. Reactivează-i din tabelul de mai jos."
                                        />
                                    )}

                                    {/* ── Card copii + buton Adaugă (Modul 2) ── */}
                                    <Card
                                        size="small"
                                        loading={loadingDetails}
                                        title="Copii"
                                        extra={
                                            !loadingDetails && (
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    icon={<PlusOutlined />}
                                                    onClick={openAddChild}
                                                >
                                                    Adaugă copil
                                                </Button>
                                            )
                                        }
                                    >
                                        <Table
                                            rowKey="childId"
                                            columns={childColumns}
                                            dataSource={
                                                Array.isArray(details?.children)
                                                    ? details.children
                                                    : []
                                            }
                                            pagination={false}
                                            size="small"
                                            // Row-urile copiilor inactivi individual au fundal ușor colorat
                                            rowClassName={(r) =>
                                                r.active === false ? "ant-table-row-inactive" : ""
                                            }
                                        />
                                    </Card>

                                </Space>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Space>

            {/* ── Modul 2: Drawer adăugare copil ─────────────────────────────── */}
            <Drawer
                title={`Adaugă copil — ${safe(parent?.lastName)} ${safe(parent?.firstName)}`}
                open={addChildOpen}
                onClose={() => setAddChildOpen(false)}
                width={400}
                footer={
                    <Space style={{ justifyContent: "flex-end", width: "100%", display: "flex" }}>
                        <Button onClick={() => setAddChildOpen(false)}>Anulează</Button>
                        <Button type="primary" loading={savingChild} onClick={handleAddChild}>
                            Salvează
                        </Button>
                    </Space>
                }
            >
                <Form form={addChildForm} layout="vertical" requiredMark="optional">
                    <Form.Item
                        name="lastName"
                        label="Nume de familie"
                        rules={[{ required: true, message: "Obligatoriu." }]}
                    >
                        <Input placeholder="ex: Ionescu" maxLength={80} />
                    </Form.Item>
                    <Form.Item
                        name="firstName"
                        label="Prenume"
                        rules={[{ required: true, message: "Obligatoriu." }]}
                    >
                        <Input placeholder="ex: Maria" maxLength={80} />
                    </Form.Item>
                    <Form.Item name="age" label="Vârstă (ani)">
                        <InputNumber min={1} max={18} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="school" label="Școala">
                        <Input placeholder="ex: Școala nr. 5" maxLength={120} />
                    </Form.Item>
                    <Form.Item name="schoolClass" label="Clasa">
                        <Input placeholder="ex: 3B" maxLength={20} />
                    </Form.Item>
                </Form>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Notă: copilul adăugat nu este înscris automat în nicio grupă. Înscrierea
                    se face separat din secțiunea <strong>Copii → Mută în grupă</strong>.
                </Text>
            </Drawer>

            {/* ── Modul 3: Modal schimbare email ─────────────────────────────── */}
            <Modal
                title="Schimbă email-ul de login"
                open={emailModalOpen}
                onCancel={() => setEmailModalOpen(false)}
                onOk={handleChangeEmail}
                okText="Salvează"
                cancelText="Anulează"
                confirmLoading={savingEmail}
            >
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <Text type="secondary">
                        Email curent: <Text strong>{safe(parent?.email)}</Text>
                    </Text>
                    <Text type="warning" style={{ fontSize: 12, display: "block" }}>
                        ⚠ Email-ul este folosit la autentificare. Părintele va trebui să
                        folosească noul email la viitorul login. Sesiunea curentă rămâne
                        activă până la logout. Notificări automate se trimit pe ambele adrese.
                    </Text>
                    <Form form={emailForm} layout="vertical">
                        <Form.Item
                            name="newEmail"
                            label="Noul email"
                            rules={[
                                { required: true, message: "Email-ul este obligatoriu." },
                                { type: "email",  message: "Format email invalid." },
                            ]}
                        >
                            <Input placeholder="nou@email.com" />
                        </Form.Item>
                    </Form>
                </Space>
            </Modal>
        </>
    );
}
