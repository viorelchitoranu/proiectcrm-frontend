import React, { useEffect, useState } from "react";
import {
    Alert, Button, Card, Form, Input, InputNumber,
    Result, Space, Typography, message,
} from "antd";
import { Link, useNavigate } from "react-router-dom";
import { http } from "../http.jsx";

const { Title, Text } = Typography;

const formItemLayout = {
    labelCol:   { xs: { span: 24 }, sm: { span: 8 } },
    wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};
const tailLayout = {
    wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

/**
 * Pagina publică de înscriere pe lista de așteptare.
 *
 * Afișată când un părinte nu găsește locuri în nicio grupă disponibilă
 * și dorește să fie contactat când apare un loc sau când adminul îl poate aloca manual.
 *
 * Formular colectează:
 *   - Date părinte: nume, email, telefon, adresă
 *   - Date copil: nume, vârstă, școală, clasă
 *   - Preferințe orientative: cursul și școala dorite (text liber)
 *   - Mesaj opțional pentru admin
 *
 * La submit → POST /api/public/waitlist (endpoint public, fără autentificare)
 * La succes → ecran de confirmare cu mesaj că vor fi contactați
 */
export default function WaitlistPage() {
    const [form]        = Form.useForm();
    const navigate      = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone]             = useState(false);

    const onFinish = async (values) => {
        try {
            setSubmitting(true);
            await http.post("/api/public/waitlist", {
                parentFirstName:     values.parentFirstName,
                parentLastName:      values.parentLastName,
                parentEmail:         values.parentEmail,
                parentPhone:         values.parentPhone,
                parentAddress:       values.parentAddress || "",
                childFirstName:      values.childFirstName,
                childLastName:       values.childLastName,
                childAge:            values.childAge,
                childSchool:         values.childSchool    || "",
                childSchoolClass:    values.childSchoolClass || "",
                preferredCourseName: values.preferredCourseName || "",
                preferredSchoolName: values.preferredSchoolName || "",
                notes:               values.notes || "",
            });
            setDone(true);
        } catch (e) {
            message.error(e?.message || "Nu am putut trimite cererea. Încearcă din nou.");
        } finally {
            setSubmitting(false);
        }
    };

    // ── Ecran de confirmare după submit reușit ────────────────────────────────
    if (done) {
        return (
            <div style={{ maxWidth: 700, margin: "48px auto", padding: 16 }}>
                <Result
                    status="success"
                    title="Cerere înregistrată!"
                    subTitle="Ai fost adăugat pe lista de așteptare. Echipa noastră te va contacta la emailul și telefonul furnizate pentru a stabili detaliile înscrierii."
                    extra={[
                        <Button key="login" type="primary" onClick={() => navigate("/login")}>
                            Am deja cont — Login
                        </Button>,
                        <Button key="enroll" onClick={() => navigate("/enroll")}>
                            Înapoi la înscriere
                        </Button>,
                    ]}
                />
            </div>
        );
    }

    // ── Formular ──────────────────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>

                <div>
                    <Title level={2} style={{ marginBottom: 4 }}>
                        Listă de așteptare
                    </Title>
                    <Text type="secondary">
                        Dacă nu există locuri disponibile în grupele dorite, completează
                        formularul de mai jos. Echipa noastră te va contacta când apare
                        un loc disponibil sau te va aloca manual la o grupă potrivită.
                    </Text>
                </div>

                <Alert
                    type="info"
                    showIcon
                    message="Completează datele orientative despre cursul și școala dorite — adminul va alege grupa finală."
                />

                <Form
                    {...formItemLayout}
                    form={form}
                    name="waitlist"
                    onFinish={onFinish}
                    style={{ width: "100%" }}
                    scrollToFirstError
                >
                    {/* ── Date părinte ── */}
                    <Card title="Date părinte" style={{ marginBottom: 16 }}>
                        <Form.Item
                            name="parentFirstName"
                            label="Prenume"
                            rules={[{ required: true, message: "Prenumele este obligatoriu." }]}
                        >
                            <Input placeholder="Ex: Bianca" />
                        </Form.Item>

                        <Form.Item
                            name="parentLastName"
                            label="Nume"
                            rules={[{ required: true, message: "Numele este obligatoriu." }]}
                        >
                            <Input placeholder="Ex: Popescu" />
                        </Form.Item>

                        <Form.Item
                            name="parentEmail"
                            label="E-mail"
                            rules={[
                                { required: true, message: "Emailul este obligatoriu." },
                                { type: "email", message: "Emailul nu este valid." },
                            ]}
                        >
                            <Input placeholder="exemplu@email.com" />
                        </Form.Item>

                        <Form.Item
                            name="parentPhone"
                            label="Telefon"
                            rules={[{ required: true, message: "Telefonul este obligatoriu." }]}
                        >
                            <Input placeholder="07xx xxx xxx" />
                        </Form.Item>

                        <Form.Item name="parentAddress" label="Adresă">
                            <Input placeholder="Oraș, stradă (opțional)" />
                        </Form.Item>
                    </Card>

                    {/* ── Date copil ── */}
                    <Card title="Date copil" style={{ marginBottom: 16 }}>
                        <Form.Item
                            name="childFirstName"
                            label="Prenume copil"
                            rules={[{ required: true, message: "Prenumele copilului este obligatoriu." }]}
                        >
                            <Input placeholder="Ex: Andrei" />
                        </Form.Item>

                        <Form.Item
                            name="childLastName"
                            label="Nume copil"
                            rules={[{ required: true, message: "Numele copilului este obligatoriu." }]}
                        >
                            <Input placeholder="Ex: Ionescu" />
                        </Form.Item>

                        <Form.Item
                            name="childAge"
                            label="Vârstă (ani)"
                            rules={[{ required: true, message: "Vârsta este obligatorie." }]}
                        >
                            <InputNumber min={1} max={18} style={{ width: "100%" }} />
                        </Form.Item>

                        <Form.Item name="childSchool" label="Școala copilului">
                            <Input placeholder="Ex: Școala Gimnazială nr. 5" />
                        </Form.Item>

                        <Form.Item name="childSchoolClass" label="Clasa">
                            <Input placeholder="Ex: a III-a B" />
                        </Form.Item>
                    </Card>

                    {/* ── Preferințe orientative ── */}
                    <Card title="Preferințe (orientativ)" style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                            Aceste informații sunt orientative — adminul va decide grupa finală.
                        </Text>

                        <Form.Item name="preferredCourseName" label="Curs dorit">
                            <Input placeholder="Ex: Robotică, Programare, Matematică..." />
                        </Form.Item>

                        <Form.Item name="preferredSchoolName" label="Locație preferată">
                            <Input placeholder="Ex: Școala nr. 5, Sector 2..." />
                        </Form.Item>

                        <Form.Item name="notes" label="Mesaj pentru admin">
                            <Input.TextArea
                                rows={3}
                                placeholder="Ex: prefer dimineața, orice grupă e ok, am mai fost înscris anterior..."
                            />
                        </Form.Item>
                    </Card>

                    <Form.Item {...tailLayout}>
                        <Space wrap>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={submitting}
                            >
                                Trimite cererea
                            </Button>
                            <Button onClick={() => navigate("/enroll")}>
                                Înapoi la înscriere
                            </Button>
                            <Link to="/login">Am deja cont</Link>
                        </Space>
                    </Form.Item>
                </Form>
            </Space>
        </div>
    );
}
