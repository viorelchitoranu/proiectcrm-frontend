import React, { useEffect, useState } from "react";
import {
    Alert, Badge, Button, Card, Descriptions, Modal, Select,
    Space, Table, Tag, Typography, message,
} from "antd";
import { UserAddOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { adminApi } from "../adminapi.js";

const { Title, Text } = Typography;

// Culori pentru statusuri — consecvente cu convențiile Ant Design
const STATUS_TAG = {
    WAITING:   { color: "orange", label: "În așteptare" },
    ALLOCATED: { color: "green",  label: "Alocat" },
    CANCELLED: { color: "red",    label: "Anulat" },
};

function safe(v) {
    return v == null || v === "" ? "—" : v;
}

/**
 * Pagina admin pentru gestionarea listei de așteptare.
 *
 * Funcționalități:
 *   - Tabel cu toate cererile (WAITING, ALLOCATED, CANCELLED)
 *   - Filtrare client-side după status
 *   - Modal de alocare: adminul selectează o grupă din lista tuturor grupelor active
 *   - Buton anulare cerere cu confirmare
 *   - Refresh manual
 *
 * Endpoints folosite:
 *   GET  /api/admin/waitlist              → lista completă
 *   GET  /api/admin/groups                → toate grupele (pentru selectorul din modal)
 *   POST /api/admin/waitlist/{id}/allocate → alocare
 *   POST /api/admin/waitlist/{id}/cancel   → anulare
 */
export default function AdminWaitlistPage() {
    const [entries,      setEntries]      = useState([]);
    const [groups,       setGroups]       = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [statusFilter, setStatusFilter] = useState("WAITING");  // implicit vedem doar așteptare

    // State modal alocare
    const [allocateModal, setAllocateModal]   = useState(false);
    const [selectedEntry, setSelectedEntry]   = useState(null);
    const [selectedGroup, setSelectedGroup]   = useState(null);
    const [allocating,    setAllocating]      = useState(false);

    // State modal anulare
    const [cancelModal,  setCancelModal]  = useState(false);
    const [cancelling,   setCancelling]   = useState(false);
    const [entryToCancel, setEntryToCancel] = useState(null);

    // ── Fetch date ────────────────────────────────────────────────────────────

    const loadData = async () => {
        try {
            setLoading(true);
            // Încărcăm lista de așteptare și grupele în paralel
            const [entriesRes, groupsRes] = await Promise.all([
                adminApi.getWaitlistEntries(),
                adminApi.getGroups(),
            ]);
            setEntries(Array.isArray(entriesRes) ? entriesRes : []);
            setGroups(Array.isArray(groupsRes)   ? groupsRes  : []);
        } catch (e) {
            message.error(e?.message || "Nu am putut încărca datele.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // ── Filtrare client-side după status ──────────────────────────────────────
    // Nu facem un request nou pentru fiecare filtru — filtrăm local
    const filteredEntries = statusFilter === "ALL"
        ? entries
        : entries.filter(e => e.status === statusFilter);

    // ── Alocare ───────────────────────────────────────────────────────────────

    const openAllocate = (entry) => {
        setSelectedEntry(entry);
        setSelectedGroup(null);  // resetăm selecția anterioară
        setAllocateModal(true);
    };

    const doAllocate = async () => {
        if (!selectedGroup) {
            message.warning("Selectează o grupă înainte de alocare.");
            return;
        }
        try {
            setAllocating(true);
            const res = await adminApi.allocateWaitlistEntry(selectedEntry.id, selectedGroup);
            message.success(res?.message || "Copil alocat cu succes.");
            setAllocateModal(false);
            await loadData();  // reîncărcăm lista pentru a reflecta noul status
        } catch (e) {
            message.error(e?.message || "Alocarea a eșuat.");
        } finally {
            setAllocating(false);
        }
    };

    // ── Anulare ───────────────────────────────────────────────────────────────

    const openCancel = (entry) => {
        setEntryToCancel(entry);
        setCancelModal(true);
    };

    const doCancel = async () => {
        try {
            setCancelling(true);
            await adminApi.cancelWaitlistEntry(entryToCancel.id);
            message.success("Cererea a fost anulată.");
            setCancelModal(false);
            await loadData();
        } catch (e) {
            message.error(e?.message || "Anularea a eșuat.");
        } finally {
            setCancelling(false);
        }
    };

    // ── Coloane tabel ─────────────────────────────────────────────────────────

    const columns = [
        {
            title: "Dată cerere",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 150,
            render: (v) => v ? v.replace("T", " ").substring(0, 16) : "—",
            sorter: (a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""),
            defaultSortOrder: "descend",
        },
        {
            title: "Părinte",
            key: "parent",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{safe(r.parentLastName)} {safe(r.parentFirstName)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{safe(r.parentEmail)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{safe(r.parentPhone)}</Text>
                </Space>
            ),
        },
        {
            title: "Copil",
            key: "child",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text>{safe(r.childLastName)} {safe(r.childFirstName)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>Vârstă: {safe(r.childAge)}</Text>
                    {r.childSchool && (
                        <Text type="secondary" style={{ fontSize: 12 }}>{r.childSchool}</Text>
                    )}
                </Space>
            ),
        },
        {
            title: "Preferințe",
            key: "preferences",
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    {r.preferredCourseName && (
                        <Text style={{ fontSize: 12 }}>
                            <Text strong>Curs: </Text>{r.preferredCourseName}
                        </Text>
                    )}
                    {r.preferredSchoolName && (
                        <Text style={{ fontSize: 12 }}>
                            <Text strong>Locație: </Text>{r.preferredSchoolName}
                        </Text>
                    )}
                    {r.notes && (
                        <Text type="secondary" italic style={{ fontSize: 12 }}>
                            „{r.notes}"
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 120,
            render: (status) => {
                const cfg = STATUS_TAG[status] || { color: "default", label: status };
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
        {
            title: "Grupă alocată",
            key: "allocated",
            width: 150,
            render: (_, r) => r.status === "ALLOCATED"
                ? <Text style={{ fontSize: 12 }}>{safe(r.allocatedGroupName)}</Text>
                : "—",
        },
        {
            title: "Acțiuni",
            key: "actions",
            width: 180,
            render: (_, r) => (
                <Space direction="vertical" size={4}>
                    {r.status === "WAITING" && (
                        <>
                            <Button
                                size="small"
                                type="primary"
                                icon={<UserAddOutlined />}
                                onClick={() => openAllocate(r)}
                            >
                                Alocă grupă
                            </Button>
                            <Button
                                size="small"
                                danger
                                icon={<CloseCircleOutlined />}
                                onClick={() => openCancel(r)}
                            >
                                Anulează
                            </Button>
                        </>
                    )}
                    {r.status !== "WAITING" && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {r.status === "ALLOCATED" ? "Procesat" : "Anulat"}
                        </Text>
                    )}
                </Space>
            ),
        },
    ];

    // ── Statistici rapide ─────────────────────────────────────────────────────

    const countWaiting   = entries.filter(e => e.status === "WAITING").length;
    const countAllocated = entries.filter(e => e.status === "ALLOCATED").length;
    const countCancelled = entries.filter(e => e.status === "CANCELLED").length;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>

            {/* ── Header ── */}
            <Space style={{ justifyContent: "space-between", width: "100%", flexWrap: "wrap" }}>
                <div>
                    <Title level={4} style={{ marginBottom: 4 }}>
                        Listă de așteptare
                    </Title>
                    <Text type="secondary">
                        Părinți înscriși care nu au găsit loc la grupele dorite.
                    </Text>
                </div>
                <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
                    Reîncarcă
                </Button>
            </Space>

            {/* ── Statistici ── */}
            <Space wrap>
                <Badge count={countWaiting} color="orange" showZero>
                    <Tag color="orange" style={{ padding: "4px 12px" }}>În așteptare</Tag>
                </Badge>
                <Badge count={countAllocated} color="green" showZero>
                    <Tag color="green" style={{ padding: "4px 12px" }}>Alocați</Tag>
                </Badge>
                <Badge count={countCancelled} color="red" showZero>
                    <Tag color="red" style={{ padding: "4px 12px" }}>Anulați</Tag>
                </Badge>
            </Space>

            {/* ── Filtru status ── */}
            <Space>
                <Text strong>Afișează:</Text>
                <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: 160 }}
                    options={[
                        { value: "WAITING",   label: "În așteptare" },
                        { value: "ALLOCATED", label: "Alocați" },
                        { value: "CANCELLED", label: "Anulați" },
                        { value: "ALL",       label: "Toate" },
                    ]}
                />
            </Space>

            {/* ── Tabel ── */}
            <Card>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={filteredEntries}
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    locale={{ emptyText: "Nicio cerere în această categorie." }}
                    size="small"
                />
            </Card>

            {/* ── Modal alocare ── */}
            <Modal
                title="Alocă copil la grupă"
                open={allocateModal}
                onCancel={() => setAllocateModal(false)}
                onOk={doAllocate}
                okText="Alocă"
                cancelText="Anulează"
                confirmLoading={allocating}
                okButtonProps={{ disabled: !selectedGroup }}
            >
                {selectedEntry && (
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        {/* Detalii cerere */}
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="Părinte">
                                {selectedEntry.parentLastName} {selectedEntry.parentFirstName}
                            </Descriptions.Item>
                            <Descriptions.Item label="Email">
                                {selectedEntry.parentEmail}
                            </Descriptions.Item>
                            <Descriptions.Item label="Copil">
                                {selectedEntry.childLastName} {selectedEntry.childFirstName}
                                {selectedEntry.childAge ? `, ${selectedEntry.childAge} ani` : ""}
                            </Descriptions.Item>
                            {selectedEntry.preferredCourseName && (
                                <Descriptions.Item label="Curs dorit">
                                    {selectedEntry.preferredCourseName}
                                </Descriptions.Item>
                            )}
                            {selectedEntry.preferredSchoolName && (
                                <Descriptions.Item label="Locație dorită">
                                    {selectedEntry.preferredSchoolName}
                                </Descriptions.Item>
                            )}
                            {selectedEntry.notes && (
                                <Descriptions.Item label="Mesaj">
                                    {selectedEntry.notes}
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        {/* Selector grupă */}
                        <div>
                            <Text strong>Selectează grupa:</Text>
                            <Select
                                style={{ width: "100%", marginTop: 8 }}
                                placeholder="Caută grupă..."
                                showSearch
                                optionFilterProp="label"
                                value={selectedGroup}
                                onChange={setSelectedGroup}

                                options={groups
                                    .filter(g => g.active !== false)
                                    .map(g => ({
                                        value: g.id,
                                        //label pentru admin
                                        label: [
                                            g.name,
                                            g.courseName && `| ${g.courseName}`,
                                            g.schoolName && `| ${g.schoolName}`,
                                        ].filter(Boolean).join(" "),
                                    }))}
                                notFoundContent="Nu există grupe active."
                            />
                        </div>

                        <Alert
                            type="info"
                            showIcon
                            message={
                                "Dacă emailul părintelui nu există în sistem, va fi creat un cont nou " +
                                "cu o parolă temporară — aceasta va fi trimisă pe email."
                            }
                        />
                    </Space>
                )}
            </Modal>

            {/* ── Modal confirmare anulare ── */}
            <Modal
                title="Confirmare anulare"
                open={cancelModal}
                onCancel={() => setCancelModal(false)}
                onOk={doCancel}
                okText="Anulează cererea"
                cancelText="Înapoi"
                okButtonProps={{ danger: true }}
                confirmLoading={cancelling}
            >
                {entryToCancel && (
                    <Text>
                        Ești sigur că vrei să anulezi cererea lui{" "}
                        <Text strong>
                            {entryToCancel.parentLastName} {entryToCancel.parentFirstName}
                        </Text>
                        {" "}pentru copilul{" "}
                        <Text strong>
                            {entryToCancel.childLastName} {entryToCancel.childFirstName}
                        </Text>
                        ?
                    </Text>
                )}
            </Modal>
        </Space>
    );
}
