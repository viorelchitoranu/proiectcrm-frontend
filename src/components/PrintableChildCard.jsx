import React from "react";
import { Descriptions, Tag, Typography } from "antd";

const { Title, Text } = Typography;

/**
 * Componentă printabilă pentru fișa unui copil.
 *
 * Primește structura AdminChildDetailsResponse:
 *   {
 *     child:       AdminChildRowResponse    (childFirstName, childLastName, age, school, schoolClass, active, parentEmail, parentPhone, parentName)
 *     parent:      AdminParentSummaryResponse (firstName, lastName, email, phone)
 *     enrollments: AdminChildEnrollmentRowResponse[] (groupName, courseName, schoolName, active, enrollmentDate)
 *   }
 *
 * Utilizare:
 *   const { printRef, handlePrint } = usePrintAndExport("Fișă Copil");
 *   <PrintableChildCard ref={printRef} details={childDetails} platformName="Young Engineers" />
 *   <Button onClick={handlePrint}>Print fișă</Button>
 */
const PrintableChildCard = React.forwardRef(({ details, platformName = "CRM Platform" }, ref) => {
    if (!details) return null;

    const { child, parent, enrollments = [] } = details;

    const childName = `${child?.childFirstName || ""} ${child?.childLastName || ""}`.trim();
    const parentName = parent
        ? `${parent.firstName || ""} ${parent.lastName || ""}`.trim()
        : child?.parentName || "—";

    return (
        <div ref={ref} style={{ padding: 24, maxWidth: 800, fontFamily: "Arial, sans-serif" }}>
            {/* Header */}
            <div style={{
                borderBottom: "2px solid #1677ff",
                paddingBottom: 12,
                marginBottom: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: "#1677ff" }}>
                        Fișă Copil
                    </Title>
                    <Text type="secondary">{platformName}</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Generat: {new Date().toLocaleDateString("ro-RO")}
                </Text>
            </div>

            {/* Date copil */}
            <Title level={4} style={{ marginBottom: 8 }}>Date copil</Title>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                <Descriptions.Item label="Prenume">{child?.childFirstName || "—"}</Descriptions.Item>
                <Descriptions.Item label="Nume">{child?.childLastName || "—"}</Descriptions.Item>
                <Descriptions.Item label="Vârstă">{child?.age ? `${child.age} ani` : "—"}</Descriptions.Item>
                <Descriptions.Item label="Status">
                    <Tag color={child?.active !== false ? "green" : "red"}>
                        {child?.active !== false ? "Activ" : "Inactiv"}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Școală" span={2}>{child?.school || "—"}</Descriptions.Item>
                <Descriptions.Item label="Clasă">{child?.schoolClass || "—"}</Descriptions.Item>
            </Descriptions>

            {/* Date părinte */}
            <Title level={4} style={{ marginBottom: 8 }}>Date părinte</Title>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                <Descriptions.Item label="Nume complet" span={2}>{parentName || "—"}</Descriptions.Item>
                <Descriptions.Item label="Email" span={2}>{parent?.email || child?.parentEmail || "—"}</Descriptions.Item>
                <Descriptions.Item label="Telefon" span={2}>{parent?.phone || child?.parentPhone || "—"}</Descriptions.Item>
            </Descriptions>

            {/* Grupe înscrise */}
            {enrollments.length > 0 && (
                <>
                    <Title level={4} style={{ marginBottom: 8 }}>Grupe înscrise</Title>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
                        <thead>
                            <tr style={{ background: "#f0f0f0" }}>
                                {["Grupă", "Curs", "Școală", "Data înscrierii", "Status"].map(h => (
                                    <th key={h} style={{ border: "1px solid #ddd", padding: "6px 10px", textAlign: "left" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {enrollments.map((e, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}>
                                    <td style={{ border: "1px solid #ddd", padding: "6px 10px" }}>{e.groupName || "—"}</td>
                                    <td style={{ border: "1px solid #ddd", padding: "6px 10px" }}>{e.courseName || "—"}</td>
                                    <td style={{ border: "1px solid #ddd", padding: "6px 10px" }}>{e.schoolName || "—"}</td>
                                    <td style={{ border: "1px solid #ddd", padding: "6px 10px" }}>
                                        {e.enrollmentDate
                                            ? new Date(e.enrollmentDate).toLocaleDateString("ro-RO")
                                            : "—"}
                                    </td>
                                    <td style={{ border: "1px solid #ddd", padding: "6px 10px" }}>
                                        {e.active ? "Activ" : "Inactiv"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* Footer */}
            <div style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 24, fontSize: 11, color: "#999", textAlign: "center" }}>
                Document generat automat de {platformName} · {new Date().toLocaleString("ro-RO")}
            </div>
        </div>
    );
});

PrintableChildCard.displayName = "PrintableChildCard";
export default PrintableChildCard;
