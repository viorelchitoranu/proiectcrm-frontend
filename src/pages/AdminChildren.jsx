import React, {useEffect, useMemo, useState, useCallback} from "react";
import {
    Alert,
    Button,
    Card,
    Col,
    Drawer,
    Form,
    Input,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from "antd";
import {ReloadOutlined, SwapOutlined} from "@ant-design/icons";
import {useNavigate, useSearchParams} from "react-router-dom";

import {adminApi} from "../adminApi.js";
import {loadSession} from "../auth/session.jsx";

const {Title, Text} = Typography;

function safe(v) {
    return v === null || v === undefined || v === "" ? "—" : v;
}

export default function AdminChildrenPage() {
    const session = loadSession();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // list state
    const [qInput, setQInput] = useState(""); // ce tastează user-ul
    const [q, setQ] = useState("");           // query-ul efectiv (debounced) trimis la backend
    const [loadingList, setLoadingList] = useState(false);
    const [page, setPage] = useState(0); // backend 0-based
    const [size, setSize] = useState(10);
    const [children, setChildren] = useState([]);
    const [total, setTotal] = useState(0);

    // selected child from URL
    const selectedChildId = useMemo(() => {
        const raw = searchParams.get("childId");
        const id = raw ? Number(raw) : NaN;
        return Number.isFinite(id) && id > 0 ? id : null;
    }, [searchParams]);

    // details state
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [details, setDetails] = useState(null); // AdminChildDetailsResponse

    // groups for move drawer
    const [groups, setGroups] = useState([]);

    // move drawer
    const [moveOpen, setMoveOpen] = useState(false);
    const [movingChild, setMovingChild] = useState(null);
    const [savingMove, setSavingMove] = useState(false);
    const [moveForm] = Form.useForm();

    const setChildIdInUrl = (childIdOrNull) => {
        const sp = new URLSearchParams(searchParams);
        if (childIdOrNull) sp.set("childId", String(childIdOrNull));
        else sp.delete("childId");
        setSearchParams(sp, {replace: true});
    };

    const clearSelection = () => {
        setChildIdInUrl(null);   // scoate childId din URL
        setDetails(null);        // opțional; oricum se golește și din effect-ul pe selectedChildId
    };

    const loadChildren = useCallback(async () => {
        setLoadingList(true);
        try {
            const res = await adminApi.getChildrenPaged(q, page, size);
            setChildren(Array.isArray(res?.items) ? res.items : []);
            setTotal(Number(res?.totalItems || 0));
        } catch (e) {
            message.error(e?.message || "Nu pot încărca lista copiilor.");
            setChildren([]);
            setTotal(0);
        } finally {
            setLoadingList(false);
        }
    }, [q, page, size]);

    const loadDetails = useCallback(async (childId) => {
        if (!childId) return;
        setLoadingDetails(true);
        try {
            const res = await adminApi.getChildDetails(childId);
            console.log("childdetails", res)
            setDetails(res || null);
        } catch (e) {
            message.error(e?.message || "Nu pot încărca detaliile copilului.");
            setDetails(null);
        } finally {
            setLoadingDetails(false);
        }
    }, []);

    const loadGroups = useCallback(async () => {
        try {
            const data = await adminApi.getGroups();
            setGroups(Array.isArray(data) ? data : []);

        } catch (e) {
            console.error(e);
            setGroups([]);
        }
    }, []);

    // initial / list reload
    useEffect(() => {
        loadChildren();
    }, [loadChildren]);

    // load groups once
    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    // debounce: trimite catre backend doar după ce user-ul se opreste din tastat
    useEffect(() => {
        const t = setTimeout(() => {
            setQ((qInput || "").trim());
        }, 350); // ajustează 250-500ms

        return () => clearTimeout(t);
    }, [qInput]);

        // cand se schimbă filtrul (q), se curata selecția din URL
 /*   useEffect(() => {
        setDetails(null);

        const sp = new URLSearchParams(window.location.search);
        if (sp.has("childId")) {
            sp.delete("childId");
            setSearchParams(sp, {replace: true});
        }
    }, [q, setSearchParams]);
*/

    // when selection changes -> load details
    useEffect(() => {
        if (selectedChildId) loadDetails(selectedChildId);
        else setDetails(null);
    }, [selectedChildId, loadDetails]);


    const groupOptions = useMemo(() => {
        return groups
            .filter((g) => g.active === true || g.isActive === true)
            .map((g) => ({
                value: g.id ?? g.groupId ?? g.idGroup,
                label: `${g.name || g.groupName} — ${g.schoolName || ""} — ${g.courseName || ""}`.trim(),
            }));
    }, [groups]);

    const openMove = (row) => {
        setMovingChild(row);
        setMoveOpen(true);

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;

        moveForm.setFieldsValue({
            toGroupId: undefined,
            effectiveDate: todayStr,
        });
    };

    const closeMove = () => {
        setMoveOpen(false);
        setMovingChild(null);
        moveForm.resetFields();
    };

    const onConfirmMove = async () => {
        try {
            const v = await moveForm.validateFields();
            setSavingMove(true);

            await adminApi.moveChild(movingChild.childId, {
                fromGroupId: movingChild.groupId ?? null,
                toGroupId: v.toGroupId,
                effectiveDate: v.effectiveDate,
            });

            message.success("Copil mutat cu succes.");
            closeMove();
            loadChildren();
            if (selectedChildId) loadDetails(selectedChildId);
        } catch (e) {
            message.error(e?.message || "Mutarea a eșuat.");
        } finally {
            setSavingMove(false);
        }
    };

    const childColumns = useMemo(
        () => [
            {
                title: "Copil",
                key: "child",
                render: (_, r) => (
                    <Space direction="vertical" size={0}>
                        <Text strong>
                            {safe(r.childLastName)} {safe(r.childFirstName)}
                        </Text>
                        <Text type="secondary">
                            {safe(r.school)} · {safe(r.schoolClass)} · {r.age ? `${r.age} ani` : "—"}
                        </Text>
                    </Space>
                ),
            },
            {
                title: "Părinte",
                key: "parent",
                render: (_, r) => (
                    <Space direction="vertical" size={0}>
                        <Text>{safe(r.parentName)}</Text>
                        <Text type="secondary">
                            {safe(r.parentPhone)}{r.parentEmail ? ` · ${r.parentEmail}` : ""}
                        </Text>
                    </Space>
                ),
            },
            {
                title: "Grupă",
                key: "group",
                render: (_, r) =>
                    r.groupName ? <Tag color="blue">{r.groupName}</Tag> : <Tag>—</Tag>,
            },
            {
                title: "Acțiuni",
                key: "actions",
                width: 110,
                render: (_, r) => (
                    <Button
                        icon={<SwapOutlined/>}
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            openMove(r);
                        }}
                    >
                        Mută
                    </Button>
                ),
            },
        ],
        []
    );

    const enrollColumns = useMemo(
        () => [
            {
                title: "Grupă",
                key: "g",
                render: (_, r) => (
                    <Space direction="vertical" size={0}>
                        <Text strong>{safe(r.groupName)}</Text>
                        <Text type="secondary">
                            {safe(r.schoolName)} · {safe(r.courseName)}
                        </Text>
                    </Space>
                ),
            },
            {
                title: "Perioadă",
                key: "p",
                render: (_, r) => (
                    <Text>
                        {safe(r.groupStartDate)} → {safe(r.groupEndDate)} ·
                        Start {String(r.sessionStartTime || "").slice(0, 5) || "—"}
                    </Text>
                ),
            },
            {
                title: "Enrollment",
                key: "e",
                render: (_, r) => (
                    <Space>
                        <Tag color={r.active ? "green" : "default"}>{r.active ? "ACTIVE" : "INACTIVE"}</Tag>
                        <Text type="secondary">{safe(r.enrollmentDate)}</Text>
                    </Space>
                ),
            },
        ],
        []
    );

    if (session?.role !== "ADMIN") {
        return (
            <div style={{maxWidth: 600, margin: "40px auto", padding: 16}}>
                <Alert type="error" showIcon description="Această pagină este doar pentru ADMIN."/>
            </div>
        );
    }

    return (
        <>
            <Space direction="vertical" style={{width: "100%"}} size="large">
                <Title level={3} style={{margin: 0}}>
                    Admin – Copii
                </Title>

                <Row gutter={16}>
                    {/* LEFT */}
                    <Col span={10}>
                        <Card
                            title="Copii"
                            extra={
                                <Space>
                                    <Input.Search
                                        placeholder="Caută (copil/părinte/email/telefon)"
                                        allowClear
                                        value={qInput}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPage(0);
                                            setQInput(val);
                                            // user a început să caute => selecția curentă nu mai e relevantă
                                            if (selectedChildId) clearSelection();

                                            // dacă a dat clear (X), vrei să resetezi și query-ul imediat
                                            if (val === "") {
                                                setQ("");
                                            }

                                        }}
                                        onSearch={(value) => {
                                            // Enter / click pe lupa => instant (fără a aștepta debounce)
                                            setPage(0);

                                            if (selectedChildId) clearSelection();

                                            const v = (value || "").trim();
                                            setQInput(value);
                                            setQ(v);
                                        }}
                                        style={{width: 320}}
                                    />
                                    <Button icon={<ReloadOutlined/>} onClick={loadChildren}/>
                                </Space>
                            }
                        >
                            <Table
                                rowKey="childId"
                                loading={loadingList}
                                columns={childColumns}
                                dataSource={children}
                                size="middle"
                                pagination={{
                                    current: page + 1,
                                    pageSize: size,
                                    total,
                                    showSizeChanger: true,
                                    onChange: (p, ps) => {
                                        setPage(p - 1);
                                        setSize(ps);
                                    },
                                }}
                                onRow={(r) => ({
                                    onClick: () => setChildIdInUrl(r.childId),
                                })}
                                rowClassName={(r) =>
                                    r.childId === selectedChildId ? "ant-table-row-selected" : ""
                                }
                            />
                        </Card>
                    </Col>

                    {/* RIGHT */}
                    <Col span={14}>
                        <Card
                            title="Detalii"
                            extra={
                                <Space>
                                    <Button disabled={!selectedChildId} onClick={() => setChildIdInUrl(null)}>
                                        Clear
                                    </Button>
                                    {selectedChildId ? (
                                        <Button
                                            icon={<SwapOutlined/>}
                                            onClick={() => {
                                                // deschide move pe copilul selectat (din detalii)
                                                if (details?.child) openMove(details.child);
                                            }}
                                        >
                                            Mută copil
                                        </Button>
                                    ) : null}
                                </Space>
                            }
                        >
                            {!selectedChildId && (
                                <Text type="secondary">Selectează un copil din stânga.</Text>
                            )}

                            {selectedChildId && (
                                <Space direction="vertical" style={{width: "100%"}} size="large">
                                    <Card size="small" loading={loadingDetails} title="Copil">
                                        <Space direction="vertical" size={2}>
                                            <Text>
                                                <Text strong>Nume:</Text>{" "}
                                                {safe(details?.child?.childLastName)} {safe(details?.child?.childFirstName)}
                                            </Text>
                                            <Text>
                                                <Text strong>Vârstă:</Text> {details?.child?.age ?? "—"}
                                            </Text>
                                            <Text>
                                                <Text strong>Școală:</Text> {safe(details?.child?.school)} ·{" "}
                                                {safe(details?.child?.schoolClass)}
                                            </Text>
                                            <Text>
                                                <Text strong>Grupă
                                                    activă:</Text> {safe(details?.child?.groupName)} ·{" "}
                                                <Text type="secondary">{safe(details?.child?.enrollmentDate)}</Text>
                                            </Text>
                                        </Space>
                                    </Card>

                                    <Card
                                        size="small"
                                        loading={loadingDetails}
                                        title="Părinte"
                                        extra={
                                            details?.parent?.parentId ? (
                                                <Button
                                                    type="link"
                                                    onClick={() =>
                                                        navigate(`/admin/parents?parentId=${details.parent.parentId}`)
                                                    }
                                                >
                                                    Vezi părinte
                                                </Button>
                                            ) : null
                                        }
                                    >
                                        <Space direction="vertical" size={2}>
                                            <Text>
                                                <Text strong>Nume:</Text> {safe(details?.parent?.lastName)}{" "}
                                                {safe(details?.parent?.firstName)}
                                            </Text>
                                            <Text>
                                                <Text strong>Email:</Text> {safe(details?.parent?.email)}
                                            </Text>
                                            <Text>
                                                <Text strong>Telefon:</Text> {safe(details?.parent?.phone)}
                                            </Text>
                                            <Text>
                                                <Text strong>Copii:</Text> {details?.parent?.childrenCount ?? 0}
                                            </Text>
                                        </Space>
                                    </Card>

                                    <Card size="small" loading={loadingDetails} title="Enrollments">
                                        <Table
                                            rowKey={(r) => `${r.groupId}-${r.enrollmentDate}`}
                                            columns={enrollColumns}
                                            dataSource={Array.isArray(details?.enrollments) ? details.enrollments : []}
                                            pagination={false}
                                        />
                                    </Card>
                                </Space>
                            )}
                        </Card>
                    </Col>
                </Row>


                <Drawer
                    title={`Mută copil – ${movingChild?.childLastName || ""} ${movingChild?.childFirstName || ""}`}
                    open={moveOpen}
                    onClose={closeMove}
                    width={520}
                    destroyOnClose
                    footer={
                        <Space style={{justifyContent: "flex-end", width: "100%"}}>
                            <Button onClick={closeMove}>Renunță</Button>
                            <Button type="primary" loading={savingMove} onClick={onConfirmMove}>
                                Confirmă mutarea
                            </Button>
                        </Space>
                    }
                >
                    <Form form={moveForm} layout="vertical">
                        <Form.Item
                            name="toGroupId"
                            label="Grupa nouă"
                            rules={[{required: true, message: "Alege grupa nouă."}]}
                        >
                            <Select
                                showSearch
                                options={groupOptions}
                                placeholder="Selectează grupa"
                                filterOption={(input, option) =>
                                    String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Form.Item>

                        <Form.Item
                            name="effectiveDate"
                            label="Data mutării (effectiveDate)"
                            rules={[{required: true, message: "Alege data mutării."}]}
                        >
                            <Input type="date"/>
                        </Form.Item>

                        <Alert
                            type="info"
                            showIcon
                            description="Notă: attendance existent pe sesiuni viitoare din grupa veche va fi arhivat + șters. Copilul va apărea în grupa nouă prin enrollment."
                        />
                    </Form>
                </Drawer>
            </Space>
        </>
    );
}