import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Button,
    Card,
    Divider,
    Form,
    Input,
    InputNumber,
    Result,
    Select,
    Space,
    Spin,
    Typography,
    message,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { http } from "../http.jsx";

const { Title, Text } = Typography;

const formItemLayout = {
    labelCol: { xs: { span: 24 }, sm: { span: 8 } },
    wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};

const tailFormItemLayout = {
    wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

const EMPTY_CHILD = {
    childFirstName: "",
    childLastName: "",
    childAge: undefined,
    childSchool: "",
    childSchoolClass: "",
    schoolId: undefined, // UI-only
    courseId: undefined, // UI-only
    groupId: undefined,
};

// ── Helper funcții pure (în afara componentei) ────────────────────────────────

/**
 * Filtrează un obiect de state păstrând doar cheile prezente în currentIndexes.
 * Folosit pentru a curăța state-urile indexate (groupOptions, groupLoading)
 * când un copil e eliminat din formular.
 *
 * Optimizare: returnează referința originală `prev` dacă nu s-a schimbat nimic
 * — previne re-render-uri inutile în React.
 *
 * @param {object} prev           - obiectul de state curent
 * @param {Set<string>} validKeys - setul de chei valide (indexii copiilor activi)
 * @returns {object}              - obiect filtrat sau `prev` dacă nu s-a schimbat
 */
function filterByIndexes(prev, validKeys) {
    const next = {};
    let changed = false;
    Object.entries(prev).forEach(([key, value]) => {
        if (validKeys.has(key)) next[key] = value;
        else changed = true;
    });
    return changed ? next : prev;
}

/**
 * Filtrează un ref object (nu un state) păstrând doar cheile valide.
 * Același scop ca filterByIndexes, dar pentru ref-uri (requestTokenRef, previousFiltersRef).
 *
 * @param {object} obj            - obiectul ref curent
 * @param {Set<string>} validKeys - setul de chei valide
 * @returns {object}              - obiect filtrat nou
 */
function filterObjByIndexes(obj, validKeys) {
    const next = {};
    Object.entries(obj).forEach(([key, value]) => {
        if (validKeys.has(key)) next[key] = value;
    });
    return next;
}

/**
 * Încarcă grupele disponibile pentru un copil dintr-un formular de înscriere.
 * Apelată din useEffect când se schimbă schoolId sau courseId pentru un copil.
 *
 * Mecanism de anulare a request-urilor concurente (race condition prevention):
 *   Fiecare apel primește un token unic incrementat. Dacă token-ul din ref
 *   s-a schimbat până când request-ul se termină → un apel mai nou a fost
 *   inițiat → ignorăm răspunsul (stale request).
 *
 * Logică:
 *   1. Dacă filtrele (schoolId + courseId) nu s-au schimbat → skip
 *   2. Resetăm grupele și groupId selectat anterior
 *   3. Dacă lipsește schoolId sau courseId → oprim loading, nu facem request
 *   4. Altfel → incrementăm token, setăm loading, facem request
 *   5. La succes: actualizăm opțiunile de grupe
 *   6. La eroare: afișăm mesaj, resetăm opțiunile
 *   7. În finally: oprim loading (doar dacă token-ul e încă valid)
 *
 * @param {object} child                  - datele copilului din Form.useWatch
 * @param {number} idx                    - indexul copilului în lista formularului
 * @param {object} ctx                    - context cu referințe și setteri React
 * @param {object} ctx.form               - instanța Form Ant Design
 * @param {object} ctx.requestTokenRef    - ref pentru token-uri de anulare
 * @param {object} ctx.previousFiltersRef - ref pentru filtrele anterioare per index
 * @param {Function} ctx.setGroupOptionsByIndex  - setter pentru opțiuni grupe
 * @param {Function} ctx.setGroupLoadingByIndex  - setter pentru loading per index
 */
async function fetchGroupsForChild(child, idx, ctx) {
    const { form, requestTokenRef, previousFiltersRef,
        setGroupOptionsByIndex, setGroupLoadingByIndex } = ctx;

    const schoolId = child?.schoolId;
    const courseId = child?.courseId;
    const criteria = `${schoolId ?? ""}|${courseId ?? ""}`;

    // Skip dacă filtrele nu s-au schimbat față de ultima încărcare
    if (previousFiltersRef.current[idx] === criteria) return;
    previousFiltersRef.current[idx] = criteria;

    // Resetăm grupă selectată și opțiunile vechi
    form.setFieldValue(["children", idx, "groupId"], undefined);
    setGroupOptionsByIndex((prev) => ({ ...prev, [idx]: [] }));

    // Fără schoolId sau courseId → nu facem request, oprim loading
    if (!schoolId || !courseId) {
        setGroupLoadingByIndex((prev) => ({ ...prev, [idx]: false }));
        return;
    }

    // Token unic — previne race conditions între request-uri concurente
    const token = (requestTokenRef.current[idx] || 0) + 1;
    requestTokenRef.current[idx] = token;
    setGroupLoadingByIndex((prev) => ({ ...prev, [idx]: true }));

    try {
        const groupsRes = await http.get(
            `/api/groups/active/by-school/${schoolId}/course/${courseId}`
        );

        // Ignorăm dacă un request mai nou a înlocuit acest token
        if (requestTokenRef.current[idx] !== token) return;

        setGroupOptionsByIndex((prev) => ({
            ...prev,
            [idx]: Array.isArray(groupsRes) ? groupsRes : [],
        }));
    } catch (e) {
        if (requestTokenRef.current[idx] !== token) return;

        message.error(
            `Eroare la încărcarea grupelor pentru copilul ${idx + 1}: ${e.message}`
        );
        setGroupOptionsByIndex((prev) => ({ ...prev, [idx]: [] }));
    } finally {
        // Oprim loading doar dacă token-ul e încă valid (nu a fost suprascris)
        if (requestTokenRef.current[idx] === token) {
            setGroupLoadingByIndex((prev) => ({ ...prev, [idx]: false }));
        }
    }
}

/**
 * Afișează rezumatul grupei selectate pentru un copil din formular.
 *
 * Extrasă ca componentă separată pentru a reduce adâncimea de nesting
 * din JSX — IIFE-ul original (() => { ... })() era la nivelul 5,
 * depășind limita SonarCloud de 4 niveluri.
 *
 * Comportament:
 *   - Dacă groupId selectat nu mai există în lista de grupe disponibile
 *     (ex: filtrele s-au schimbat după selecție) → mesaj de avertizare
 *   - Altfel → afișează detaliile grupei: nume, curs, școală, perioadă,
 *     orar, locuri rămase, capacitate maximă
 *
 * @param {object[]} childGroups  - lista de grupe disponibile pentru acest copil
 * @param {number}   groupId      - ID-ul grupei selectate curent din formular
 */
function GroupSummary({ childGroups, groupId }) {
    const selectedGroup = childGroups.find((g) => g.groupId === groupId);

    if (!selectedGroup) {
        return (
            <Text type="secondary">
                Grupa selectată nu mai este disponibilă.
            </Text>
        );
    }

    return (
        <Space direction="vertical" size={4}>
            <Text><Text strong>Grupă:</Text> {selectedGroup.groupName}</Text>
            <Text><Text strong>Curs:</Text> {selectedGroup.courseName}</Text>
            <Text><Text strong>Școală:</Text> {selectedGroup.schoolName}</Text>
            <Text><Text strong>Adresă:</Text> {selectedGroup.schoolAddress}</Text>
            <Text>
                <Text strong>Perioadă:</Text>{" "}
                {selectedGroup.startDate} – {selectedGroup.endDate}
            </Text>
            <Text><Text strong>Ora:</Text> {selectedGroup.sessionStartTime}</Text>
            <Text><Text strong>Locuri rămase:</Text> {selectedGroup.remainingSpots}</Text>
            <Text>
                <Text strong>Capacitate:</Text>{" "}
                {selectedGroup.maxCapacity ?? "Nelimitat"}
            </Text>
        </Space>
    );
}

export default function EnrollmentPage() {
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const [schools, setSchools] = useState([]);
    const [courses, setCourses] = useState([]);

    const [loadingInit, setLoadingInit] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [emailCheckLoading, setEmailCheckLoading] = useState(false);
    const [emailExists, setEmailExists] = useState(false);
    const [emailCheckError, setEmailCheckError] = useState(null);

    const [enrollmentResult, setEnrollmentResult] = useState(null);

    // groups per child index
    const [groupOptionsByIndex, setGroupOptionsByIndex] = useState({});
    const [groupLoadingByIndex, setGroupLoadingByIndex] = useState({});

    const watchedChildren = Form.useWatch("children", form) || [];
    const watchedParentEmail = Form.useWatch("parentEmail", form);

    const previousFiltersRef = useRef({});
    const requestTokenRef = useRef({});

    const resetEnrollmentForm = () => {
        form.resetFields();
        form.setFieldsValue({ children: [{ ...EMPTY_CHILD }] });

        setGroupOptionsByIndex({});
        setGroupLoadingByIndex({});

        setEmailExists(false);
        setEmailCheckError(null);
        setEmailCheckLoading(false);

        previousFiltersRef.current = {};
        requestTokenRef.current = {};
    };

    useEffect(() => {
        form.setFieldsValue({ children: [{ ...EMPTY_CHILD }] });
    }, [form]);

    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                setLoadingInit(true);

                const [schoolsRes, coursesRes] = await Promise.all([
                    http.get("/api/public/schools"),
                    http.get("/api/courses"),
                ]);

                if (!isMounted) return;

                setSchools(Array.isArray(schoolsRes) ? schoolsRes : []);
                setCourses(Array.isArray(coursesRes) ? coursesRes : []);
            } catch (e) {
                message.error(`Eroare la încărcarea datelor inițiale: ${e.message}`);
            } finally {
                if (isMounted) setLoadingInit(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        // dacă utilizatorul schimbă emailul, resetăm rezultatul ultimei verificări
        setEmailExists(false);
        setEmailCheckError(null);
    }, [watchedParentEmail]);

    useEffect(() => {
        const currentIndexes = new Set(watchedChildren.map((_, idx) => String(idx)));

        // Curățăm state-urile și ref-urile pentru copiii eliminați din formular
        // — previne memory leaks și state stale pentru indecși care nu mai există
        setGroupOptionsByIndex((prev) => filterByIndexes(prev, currentIndexes));
        setGroupLoadingByIndex((prev) => filterByIndexes(prev, currentIndexes));
        previousFiltersRef.current  = filterObjByIndexes(previousFiltersRef.current,  currentIndexes);
        requestTokenRef.current     = filterObjByIndexes(requestTokenRef.current,     currentIndexes);

        // Verificăm fiecare copil — dacă filtrele (școală + curs) s-au schimbat,
        // declanșăm o nouă căutare de grupe
        watchedChildren.forEach((child, idx) => {
            fetchGroupsForChild(child, idx, {
                form,
                requestTokenRef,
                previousFiltersRef,
                setGroupOptionsByIndex,
                setGroupLoadingByIndex,
            });
        });
    }, [watchedChildren, form]);

    const handleEmailBlur = async () => {
        const email = form.getFieldValue("parentEmail");

        setEmailCheckError(null);
        setEmailExists(false);

        if (!email) return;

        try {
            setEmailCheckLoading(true);
            const res = await http.get("/api/public/email/check", { email });
            setEmailExists(Boolean(res?.exists));
        } catch (e) {
            setEmailCheckError(e.message);
        } finally {
            setEmailCheckLoading(false);
        }
    };

    const onFinish = async (values) => {
        if (emailExists) {
            message.warning("Există deja un cont cu acest email. Te rugăm să te loghezi.");
            return;
        }

        const children = Array.isArray(values.children) ? values.children : [];

        const payload = {
            parentFirstName: values.parentFirstName,
            parentLastName: values.parentLastName,
            parentEmail: values.parentEmail,
            parentPhone: values.parentPhone,
            parentAddress: values.parentAddress || "",
            parentPassword: values.parentPassword,
            children: children.map((child) => ({
                childFirstName: child.childFirstName,
                childLastName: child.childLastName,
                childAge: child.childAge,
                childSchool: child.childSchool || "",
                childSchoolClass: child.childSchoolClass || "",
                groupId: child.groupId,
            })),
        };

        try {
            setSubmitting(true);

            const res = await http.post("/api/enrollments", payload);

            setEnrollmentResult(res);
            message.success("Înscriere reușită.");
        } catch (e) {
            message.error(`Înscriere eșuată: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const successChildren = useMemo(() => {
        return Array.isArray(enrollmentResult?.enrollments)
            ? enrollmentResult.enrollments
            : [];
    }, [enrollmentResult]);

    if (enrollmentResult) {
        return (
            <div style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <Result
                        status="success"
                        title="Înscriere reușită"
                        subTitle={
                            enrollmentResult.message ||
                            "Vei primi un email de confirmare. Te poți loga cu emailul și parola aleasă."
                        }
                        extra={[
                            <Button
                                key="login"
                                type="primary"
                                onClick={() => navigate("/login")}
                            >
                                Mergi la Login
                            </Button>,
                            <Button
                                key="new"
                                onClick={() => {
                                    setEnrollmentResult(null);
                                    resetEnrollmentForm();
                                }}
                            >
                                Fă o nouă înscriere
                            </Button>,
                        ]}
                    />

                    {successChildren.length > 0 ? (
                        <Card title="Copii înscriși">
                            <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                {successChildren.map((item, idx) => (
                                    <Text key={`${item.childId}-${item.groupId}-${idx}`}>
                                        {idx + 1}.{" "}
                                        <Text strong>
                                            {item.childLastName} {item.childFirstName}
                                        </Text>{" "}
                                        → {item.groupName || `Grupa #${item.groupId}`}
                                    </Text>
                                ))}
                            </Space>
                        </Card>
                    ) : null}
                </Space>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <div>
                    <Title level={2} style={{ marginBottom: 0 }}>
                        Înscriere copil / copii
                    </Title>
                    <Text type="secondary">
                        Completează datele părintelui și poți înscrie între 1 și 4 copii în
                        același formular.
                    </Text>
                </div>

                {loadingInit ? (
                    <Space align="center">
                        <Spin />
                        <Text>Se încarcă...</Text>
                    </Space>
                ) : (
                    <Form
                        {...formItemLayout}
                        form={form}
                        name="enrollment"
                        onFinish={onFinish}
                        style={{ width: "100%" }}
                        scrollToFirstError
                    >
                        <Card title="Date părinte" style={{ marginBottom: 16 }}>
                            <Form.Item
                                name="parentFirstName"
                                label="Prenume"
                                rules={[
                                    {
                                        required: true,
                                        message: "Te rog introdu prenumele părintelui.",
                                    },
                                ]}
                            >
                                <Input placeholder="Ex: Bianca" />
                            </Form.Item>

                            <Form.Item
                                name="parentLastName"
                                label="Nume"
                                rules={[
                                    {
                                        required: true,
                                        message: "Te rog introdu numele părintelui.",
                                    },
                                ]}
                            >
                                <Input placeholder="Ex: Chițoranu" />
                            </Form.Item>

                            <Form.Item
                                name="parentEmail"
                                label="E-mail"
                                rules={[
                                    { type: "email", message: "Te rog introdu un email valid." },
                                    {
                                        required: true,
                                        message: "Te rog introdu emailul părintelui.",
                                    },
                                ]}
                            >
                                <Input
                                    placeholder="exemplu@email.com"
                                    onBlur={handleEmailBlur}
                                />
                            </Form.Item>

                            {emailCheckLoading ? (
                                <div style={{ marginBottom: 16 }}>
                                    <Spin size="small" />
                                    <Text style={{ marginLeft: 8 }}>
                                        Verific emailul...
                                    </Text>
                                </div>
                            ) : null}

                            {emailCheckError ? (
                                <Alert
                                    type="error"
                                    showIcon
                                    message="Nu am putut verifica emailul acum."
                                    description={emailCheckError}
                                    style={{ marginBottom: 16 }}
                                />
                            ) : null}

                            {emailExists ? (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message="Există deja un cont cu acest email."
                                    description={
                                        <span>
                                            Te rugăm să te loghezi.{" "}
                                            <Link to="/login">Mergi la Login</Link>
                                        </span>
                                    }
                                    style={{ marginBottom: 16 }}
                                />
                            ) : null}

                            <Form.Item
                                name="parentPhone"
                                label="Telefon"
                                rules={[
                                    {
                                        required: true,
                                        message: "Te rog introdu numărul de telefon.",
                                    },
                                ]}
                            >
                                <Input placeholder="Ex: 07xx xxx xxx" />
                            </Form.Item>

                            <Form.Item
                                name="parentAddress"
                                label="Adresă"
                                rules={[
                                    {
                                        required: true,
                                        message:
                                            "Te rog introdu cel puțin orașul și județul/sectorul.",
                                    },
                                ]}
                            >
                                <Input placeholder="Stradă, număr, bloc etc." />
                            </Form.Item>
                        </Card>

                        <Card title="Parolă cont părinte" style={{ marginBottom: 16 }}>
                            <Form.Item
                                name="parentPassword"
                                label="Parolă"
                                rules={[
                                    {
                                        required: true,
                                        message: "Te rog introdu o parolă.",
                                    },
                                    {
                                        min: 6,
                                        message:
                                            "Parola trebuie să aibă minim 6 caractere.",
                                    },
                                ]}
                                hasFeedback
                            >
                                <Input.Password placeholder="Minim 6 caractere" />
                            </Form.Item>

                            <Form.Item
                                name="confirmPassword"
                                label="Confirmă parola"
                                dependencies={["parentPassword"]}
                                hasFeedback
                                rules={[
                                    {
                                        required: true,
                                        message: "Te rog confirmă parola.",
                                    },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (
                                                !value ||
                                                getFieldValue("parentPassword") === value
                                            ) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(
                                                new Error("Parolele nu se potrivesc.")
                                            );
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password placeholder="Reintrodu parola" />
                            </Form.Item>
                        </Card>

                        <Card title="Copii" style={{ marginBottom: 16 }}>
                            <Form.List name="children">
                                {(fields, { add, remove }) => (
                                    <Space
                                        direction="vertical"
                                        size={16}
                                        style={{ width: "100%" }}
                                    >
                                        {fields.map((field, index) => {
                                            const childGroups =
                                                groupOptionsByIndex[index] || [];
                                            const childGroupsLoading = Boolean(
                                                groupLoadingByIndex[index]
                                            );
                                            const currentChild =
                                                watchedChildren[index] || {};
                                            const childCanSelectGroup = Boolean(
                                                currentChild.schoolId &&
                                                currentChild.courseId
                                            );

                                            return (
                                                <Card
                                                    key={field.key}
                                                    type="inner"
                                                    title={`Copil ${index + 1}`}
                                                    extra={
                                                        fields.length > 1 ? (
                                                            <Button
                                                                type="text"
                                                                danger
                                                                icon={
                                                                    <MinusCircleOutlined />
                                                                }
                                                                onClick={() =>
                                                                    remove(
                                                                        field.name
                                                                    )
                                                                }
                                                            >
                                                                Șterge
                                                            </Button>
                                                        ) : null
                                                    }
                                                >
                                                    <Form.Item
                                                        name={[
                                                            field.name,
                                                            "childFirstName",
                                                        ]}
                                                        label="Prenume copil"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message:
                                                                    "Te rog introdu prenumele copilului.",
                                                            },
                                                        ]}
                                                    >
                                                        <Input placeholder="Ex: Andrei" />
                                                    </Form.Item>

                                                    <Form.Item
                                                        name={[
                                                            field.name,
                                                            "childLastName",
                                                        ]}
                                                        label="Nume copil"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message:
                                                                    "Te rog introdu numele copilului.",
                                                            },
                                                        ]}
                                                    >
                                                        <Input placeholder="Ex: Popescu" />
                                                    </Form.Item>

                                                    <Form.Item
                                                        name={[
                                                            field.name,
                                                            "childAge",
                                                        ]}
                                                        label="Vârstă (ani)"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message:
                                                                    "Te rog introdu vârsta copilului.",
                                                            },
                                                        ]}
                                                    >
                                                        <InputNumber
                                                            min={1}
                                                            max={18}
                                                            style={{
                                                                width: "100%",
                                                            }}
                                                        />
                                                    </Form.Item>

                                                    <Form.Item
                                                        name={[
                                                            field.name,
                                                            "childSchool",
                                                        ]}
                                                        label="Școala copilului"
                                                    >
                                                        <Input placeholder="Ex: Școala Gimnazială nr. ..." />
                                                    </Form.Item>

                                                    <Form.Item
                                                        name={[
                                                            field.name,
                                                            "childSchoolClass",
                                                        ]}
                                                        label="Clasa"
                                                    >
                                                        <Input placeholder="Ex: a III-a B" />
                                                    </Form.Item>

                                                    <Divider />

                                                    <Form.Item
                                                        name={[
                                                            field.name,
                                                            "schoolId",
                                                        ]}
                                                        label="Școală (locație)"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message:
                                                                    "Te rog selectează o școală.",
                                                            },
                                                        ]}
                                                    >
                                                        <Select
                                                            placeholder="Selectează școala"
                                                            options={schools.map(
                                                                (s) => ({
                                                                    label: s.name,
                                                                    value: s.id,
                                                                })
                                                            )}
                                                            showSearch
                                                            optionFilterProp="label"
                                                        />
                                                    </Form.Item>

                                                    <Form.Item
                                                        name={[
                                                            field.name,
                                                            "courseId",
                                                        ]}
                                                        label="Curs"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message:
                                                                    "Te rog selectează un curs.",
                                                            },
                                                        ]}
                                                    >
                                                        <Select
                                                            placeholder="Selectează cursul"
                                                            options={courses.map(
                                                                (c) => ({
                                                                    label: c.name,
                                                                    value: c.idCourse,
                                                                })
                                                            )}
                                                            showSearch
                                                            optionFilterProp="label"
                                                        />
                                                    </Form.Item>

                                                    <Form.Item
                                                        name={[
                                                            field.name,
                                                            "groupId",
                                                        ]}
                                                        label="Grupă"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message:
                                                                    "Te rog selectează o grupă.",
                                                            },
                                                        ]}
                                                    >
                                                        <Select
                                                            placeholder={
                                                                childCanSelectGroup
                                                                    ? "Selectează grupa"
                                                                    : "Selectează întâi școala și cursul"
                                                            }
                                                            loading={
                                                                childGroupsLoading
                                                            }
                                                            disabled={
                                                                !childCanSelectGroup
                                                            }
                                                            options={childGroups.map(
                                                                (g) => ({
                                                                    label:
                                                                        g.label ||
                                                                        g.groupName,
                                                                    value: g.groupId,
                                                                })
                                                            )}
                                                            showSearch
                                                            optionFilterProp="label"
                                                            notFoundContent={
                                                                childGroupsLoading
                                                                    ? "Se încarcă..."
                                                                    : "Nu există grupe disponibile"
                                                            }
                                                        />
                                                    </Form.Item>

                                                    {currentChild.groupId ? (
                                                        <Card
                                                            type="inner"
                                                            size="small"
                                                            title="Rezumat grupă"
                                                        >
                                                            {/* GroupSummary extrasă din IIFE — reduce nesting la max 3 niveluri */}
                                                            <GroupSummary
                                                                childGroups={childGroups}
                                                                groupId={currentChild.groupId}
                                                            />
                                                        </Card>
                                                    ) : null}
                                                </Card>
                                            );
                                        })}

                                        <div>
                                            <Button
                                                type="dashed"
                                                block
                                                icon={<PlusOutlined />}
                                                onClick={() => add({ ...EMPTY_CHILD })}
                                                disabled={fields.length >= 4}
                                            >
                                                Adaugă încă un copil
                                            </Button>
                                            <Text
                                                type="secondary"
                                                style={{
                                                    display: "block",
                                                    marginTop: 8,
                                                }}
                                            >
                                                Poți înscrie maximum 4 copii într-un
                                                singur formular.
                                            </Text>
                                        </div>
                                    </Space>
                                )}
                            </Form.List>
                        </Card>

                        <Divider />

                        <Form.Item {...tailFormItemLayout}>
                            <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                <Space wrap>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={submitting}
                                        disabled={emailExists}
                                    >
                                        Trimite înscrierea
                                    </Button>

                                    <Button onClick={resetEnrollmentForm}>
                                        Resetează
                                    </Button>

                                    <Link to="/login">Am deja cont (Login)</Link>
                                </Space>

                                {/* Link spre lista de așteptare — afișat întotdeauna,
            dar util mai ales când nu există grupe disponibile */}
                                <Text type="secondary">
                                    Nu găsești locuri disponibile?{" "}
                                    <Link to="/waitlist">
                                        Înscrie-te pe lista de așteptare
                                    </Link>
                                    {" "}— te vom contacta când apare un loc.
                                </Text>
                            </Space>
                        </Form.Item>

                    </Form>
                )}
            </Space>
        </div>
    );
}