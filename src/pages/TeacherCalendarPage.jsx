import React, { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Card, Select, Spin, Tag, Tooltip, Typography } from "antd";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ro } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { teacherApi } from "../teacherApi.js";

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

function getEventStyle(event) {
    return {
        style: {
            backgroundColor: STATUS_COLORS[event.status] || "#1677ff",
            borderRadius: 4,
            color: "white",
            border: "none",
            fontSize: 12,
            padding: "2px 4px",
        }
    };
}

export default function TeacherCalendarPage() {
    const [groups,        setGroups]        = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null); // null = toate grupele
    const [events,        setEvents]        = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [view,          setView]          = useState("month");
    const [date,          setDate]          = useState(new Date());

    // ── Încarcă toate grupele profesorului ────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const data = await teacherApi.getTeacherGroups();
                setGroups(Array.isArray(data) ? data : []);
            } catch (e) {
                setError(e?.message || "Nu am putut încărca grupele.");
            }
        })();
    }, []);

    // ── Încarcă sesiunile pentru grupele selectate ────────────────────────────
    const loadEvents = useCallback(async (groupList, filterGroupId) => {
        setLoading(true);
        setError(null);
        try {
            const targetGroups = filterGroupId
                ? groupList.filter(g => g.groupId === filterGroupId)
                : groupList;

            const allEvents = [];

            await Promise.all(
                targetGroups.map(async (group) => {
                    const sessions = await teacherApi.getGroupSessions(group.groupId);
                    const mapped = (Array.isArray(sessions) ? sessions : []).map(s => {
                        const dateObj = new Date(s.sessionDate);
                        const [h, m]  = s.time.split(":");
                        const startDt = new Date(
                            dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(),
                            parseInt(h), parseInt(m)
                        );
                        const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);

                        return {
                            title:      `${group.groupName}`,
                            start:      startDt,
                            end:        endDt,
                            status:     s.status,
                            groupName:  group.groupName,
                            courseName: group.courseName,
                            schoolName: group.schoolName,
                            sessionId:  s.sessionId,
                            attendanceTaken: s.attendanceTaken,
                        };
                    });
                    allEvents.push(...mapped);
                })
            );

            // Sortare după dată
            allEvents.sort((a, b) => a.start - b.start);
            setEvents(allEvents);
        } catch (e) {
            setError(e?.message || "Nu am putut încărca sesiunile.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (groups.length > 0) {
            loadEvents(groups, selectedGroup);
        } else {
            setLoading(false);
        }
    }, [groups, selectedGroup, loadEvents]);

    // ── Tooltip per eveniment ─────────────────────────────────────────────────
    const EventComponent = ({ event }) => (
        <Tooltip
            title={
                <div>
                    <div><strong>{event.groupName}</strong></div>
                    {event.courseName && <div>{event.courseName}</div>}
                    {event.schoolName && <div>📍 {event.schoolName}</div>}
                    <div>
                        Status: <Tag color={STATUS_COLORS[event.status]}
                            style={{ color: "white", borderColor: "transparent" }}>
                            {event.status}
                        </Tag>
                    </div>
                    {event.attendanceTaken && <div>✅ Prezență marcată</div>}
                </div>
            }
        >
            <span>
                {event.attendanceTaken ? "✅ " : ""}{event.title}
            </span>
        </Tooltip>
    );

    return (
        <div style={{ padding: 8 }}>
            <Title level={3} style={{ marginBottom: 16 }}>Calendarul meu</Title>

            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

            <Card>
                {/* Filtru grupă */}
                <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Text>Grupă:</Text>
                    <Select
                        style={{ minWidth: 220 }}
                        value={selectedGroup}
                        onChange={setSelectedGroup}
                        options={[
                            { value: null, label: "Toate grupele mele" },
                            ...groups.map(g => ({ value: g.groupId, label: `${g.groupName} — ${g.courseName || ""}` }))
                        ]}
                    />

                    {/* Legendă */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
                        {[
                            { label: "Planificată", color: STATUS_COLORS.PLANNED },
                            { label: "Ținută",      color: STATUS_COLORS.TAUGHT },
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
