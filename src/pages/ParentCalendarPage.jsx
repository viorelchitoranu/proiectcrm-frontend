import React, { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Card, Select, Spin, Tag, Tooltip, Typography } from "antd";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ro } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { parentApi } from "../parentApi.js";

const { Title, Text } = Typography;

const locales   = { ro };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
    getDay,
    locales,
});

const MESSAGES_RO = {
    allDay:    "Toată ziua",
    previous:  "Înapoi",
    next:      "Înainte",
    today:     "Azi",
    month:     "Lună",
    week:      "Săptămână",
    day:       "Zi",
    agenda:    "Agendă",
    date:      "Dată",
    time:      "Oră",
    event:     "Eveniment",
    noEventsInRange: "Nicio sesiune în această perioadă.",
};

const STATUS_COLORS = {
    PLANNED:             "#1677ff",
    TAUGHT:              "#52c41a",
    CANCELED:            "#d9d9d9",
    CANCELED_HOLIDAY:    "#fa8c16",
    CANCELED_MANUAL:     "#f5222d",
    NOT_STARTED_SKIPPED: "#d9d9d9",
};

const ATTENDANCE_COLORS = {
    PRESENT:          "#52c41a",
    ABSENT:           "#f5222d",
    RECOVERY_PENDING: "#fa8c16",
};

function getEventStyle(event) {
    const color = event.status === "TAUGHT"
        ? (ATTENDANCE_COLORS[event.childAttendanceStatus] || "#52c41a")
        : (STATUS_COLORS[event.status] || "#1677ff");
    return {
        style: {
            backgroundColor: color,
            borderRadius: 4,
            color: "white",
            border: "none",
            fontSize: 12,
            padding: "2px 4px",
        }
    };
}

// ── Extras din loadEvents pentru a reduce nesting-ul ─────────────────────────
function mapSessionToEvent(s, schedule, childName, showChildName) {
    const dateObj = new Date(s.sessionDate);
    const [h, m]  = s.time.split(":");
    const startDt = new Date(
        dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(),
        parseInt(h), parseInt(m)
    );
    const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
    const title = showChildName
        ? `${childName} — ${schedule.groupName}`
        : schedule.groupName;

    return {
        title,
        start:                 startDt,
        end:                   endDt,
        status:                s.sessionStatus,
        childAttendanceStatus: s.childAttendanceStatus,
        groupName:             schedule.groupName,
        courseName:            schedule.courseName,
        schoolName:            schedule.schoolName,
        childName,
        sessionId:             s.sessionId,
        cancellable:           s.cancellable,
        recoveryAllowed:       s.recoveryRequestAllowed,
        isRecovery:            s.isRecoveryAttendance,
    };
}

async function loadScheduleForEnrollment(child, enrollment, showChildName, allEvents) {
    try {
        const schedule = await parentApi.getChildGroupSchedule(child.childId, enrollment.groupId);
        const sessions = schedule?.sessions || [];
        const childName = `${child.childFirstName || ""} ${child.childLastName || ""}`.trim();
        sessions.forEach(s => {
            allEvents.push(mapSessionToEvent(s, schedule, childName, showChildName));
        });
    } catch {
        // Ignoră grupele fără program disponibil
    }
}

async function loadEventsForChild(child, showChildName, allEvents) {
    const enrollments = await parentApi.getChildEnrollments(child.childId);
    const activeEnrollments = Array.isArray(enrollments)
        ? enrollments.filter(e => e.active !== false)
        : [];
    await Promise.all(
        activeEnrollments.map(enrollment =>
            loadScheduleForEnrollment(child, enrollment, showChildName, allEvents)
        )
    );
}

export default function ParentCalendarPage() {
    const [children,      setChildren]      = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [events,        setEvents]        = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [view,          setView]          = useState("month");
    const [date,          setDate]          = useState(new Date());

    useEffect(() => {
        (async () => {
            try {
                const data = await parentApi.getChildren();
                const list = Array.isArray(data) ? data : [];
                setChildren(list);
                if (list.length === 1) setSelectedChild(list[0].childId);
            } catch (e) {
                setError(e?.message || "Nu am putut încărca copiii.");
                setLoading(false);
            }
        })();
    }, []);

    const loadEvents = useCallback(async (childList, filterChildId) => {
        setLoading(true);
        setError(null);
        try {
            const targetChildren = filterChildId
                ? childList.filter(c => c.childId === filterChildId)
                : childList;
            const showChildName = targetChildren.length > 1;
            const allEvents = [];

            await Promise.all(
                targetChildren.map(child =>
                    loadEventsForChild(child, showChildName, allEvents)
                )
            );

            allEvents.sort((a, b) => a.start - b.start);
            setEvents(allEvents);
        } catch (e) {
            setError(e?.message || "Nu am putut încărca programul.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (children.length > 0) {
            loadEvents(children, selectedChild);
        } else if (children.length === 0) {
            setLoading(false);
        }
    }, [children, selectedChild, loadEvents]);

    const EventComponent = ({ event }) => {
        const attendanceLabel = {
            PRESENT:          "✅ Prezent",
            ABSENT:           "❌ Absent",
            RECOVERY_PENDING: "🔄 Recuperare",
        }[event.childAttendanceStatus] || "";

        return (
            <Tooltip
                title={
                    <div>
                        {children.length > 1 && <div><strong>{event.childName}</strong></div>}
                        <div>{event.groupName}</div>
                        {event.courseName && <div>{event.courseName}</div>}
                        {event.schoolName && <div>📍 {event.schoolName}</div>}
                        <div>
                            Status: <Tag color={STATUS_COLORS[event.status]}
                                style={{ color: "white", borderColor: "transparent" }}>
                                {event.status}
                            </Tag>
                        </div>
                        {attendanceLabel && <div>{attendanceLabel}</div>}
                        {event.isRecovery && <div>🔄 Sesiune de recuperare</div>}
                    </div>
                }
            >
                <span>{event.title}</span>
            </Tooltip>
        );
    };

    return (
        <div style={{ padding: 8 }}>
            <Title level={3} style={{ marginBottom: 16 }}>Program sesiuni</Title>

            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

            <Card>
                <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {children.length > 1 && (
                        <>
                            <Text>Copil:</Text>
                            <Select
                                style={{ minWidth: 200 }}
                                value={selectedChild}
                                onChange={setSelectedChild}
                                options={[
                                    { value: null, label: "Toți copiii" },
                                    ...children.map(c => ({
                                        value: c.childId,
                                        label: `${c.childFirstName} ${c.childLastName}`,
                                    }))
                                ]}
                            />
                        </>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
                        {[
                            { label: "Planificată", color: "#1677ff" },
                            { label: "Prezent",     color: "#52c41a" },
                            { label: "Absent",      color: "#f5222d" },
                            { label: "Anulată",     color: STATUS_COLORS.CANCELED_MANUAL },
                            { label: "Sărbătoare",  color: STATUS_COLORS.CANCELED_HOLIDAY },
                        ].map(({ label, color }) => (
                            <Badge key={label} color={color}
                                text={<Text style={{ fontSize: 12 }}>{label}</Text>} />
                        ))}
                    </div>
                </div>

                {loading && <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>}

                <div style={{ height: 620 }}>
                    <Calendar
                        localizer={localizer}
                        events={events}
                        date={date}
                        view={view}
                        onNavigate={setDate}
                        onView={setView}
                        messages={MESSAGES_RO}
                        culture="ro"
                        eventPropGetter={getEventStyle}
                        components={{ event: EventComponent }}
                        popup
                    />
                </div>
            </Card>
        </div>
    );
}
