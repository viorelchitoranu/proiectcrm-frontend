import React, { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Card, Spin, Tag, Tooltip, Typography } from "antd";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ro } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { http } from "../http.jsx";

const { Title, Text } = Typography;

// ── Configurare localizare română ─────────────────────────────────────────────
const locales = { ro };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }), // Luni primul
    getDay,
    locales,
});

const MESSAGES_RO = {
    allDay:     "Toată ziua",
    previous:   "Înapoi",
    next:       "Înainte",
    today:      "Azi",
    month:      "Lună",
    week:       "Săptămână",
    day:        "Zi",
    agenda:     "Agendă",
    date:       "Dată",
    time:       "Oră",
    event:      "Eveniment",
    noEventsInRange: "Niciun eveniment în această perioadă.",
};

// ── Culori per status sesiune ─────────────────────────────────────────────────
const STATUS_COLORS = {
    PLANNED:            "#1677ff",
    TAUGHT:             "#52c41a",
    CANCELED:           "#d9d9d9",
    CANCELED_HOLIDAY:   "#fa8c16",
    CANCELED_MANUAL:    "#f5222d",
    NOT_STARTED_SKIPPED:"#d9d9d9",
    HOLIDAY:            "#722ed1",
};

function getEventStyle(event) {
    const color = event.type === "HOLIDAY"
        ? STATUS_COLORS.HOLIDAY
        : STATUS_COLORS[event.status] || "#1677ff";
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

export default function AdminCalendarPage() {
    const [events,  setEvents]  = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [date,    setDate]    = useState(new Date());
    const [view,    setView]    = useState("month");

    // ── Fetch evenimente pentru luna/săptămâna curentă ────────────────────────
    const loadEvents = useCallback(async (currentDate) => {
        setLoading(true);
        setError(null);
        try {
            // Calculăm intervalul vizibil (luna curentă ± 1 lună buffer)
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const end   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

            const startStr = format(start, "yyyy-MM-dd");
            const endStr   = format(end, "yyyy-MM-dd");

            const data = await http.get(
                `/api/admin/calendar/events?start=${startStr}&end=${endStr}`
            );

            // Transformăm în formatul react-big-calendar
            const mapped = data.map(ev => {
                const dateObj = new Date(ev.date);
                let startDt, endDt;

                if (ev.startTime) {
                    const [h, m] = ev.startTime.split(":");
                    startDt = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(),
                        parseInt(h), parseInt(m));
                    endDt   = new Date(startDt.getTime() + 60 * 60 * 1000); // +1 oră
                } else {
                    // Zile libere — eveniment pe toată ziua
                    startDt = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                    endDt   = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1);
                }

                return {
                    title:       ev.title,
                    start:       startDt,
                    end:         endDt,
                    allDay:      ev.type === "HOLIDAY",
                    type:        ev.type,
                    status:      ev.status,
                    groupName:   ev.groupName,
                    teacherName: ev.teacherName,
                    groupId:     ev.groupId,
                };
            });

            setEvents(mapped);
        } catch (e) {
            setError(e?.message || "Nu am putut încărca evenimentele.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadEvents(date); }, [loadEvents, date]);

    // ── Tooltip pe eveniment ──────────────────────────────────────────────────
    const EventComponent = ({ event }) => (
        <Tooltip
            title={
                event.type === "HOLIDAY" ? event.title : (
                    <div>
                        <div><strong>{event.groupName}</strong></div>
                        {event.teacherName && <div>Prof: {event.teacherName}</div>}
                        <div>Status: <Tag color={STATUS_COLORS[event.status] || "blue"}>
                            {event.status}
                        </Tag></div>
                    </div>
                )
            }
        >
            <span>{event.title}</span>
        </Tooltip>
    );

    // ── Legendă ───────────────────────────────────────────────────────────────
    const Legend = () => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {[
                { label: "Planificată",  color: STATUS_COLORS.PLANNED },
                { label: "Ținută",       color: STATUS_COLORS.TAUGHT },
                { label: "Anulată",      color: STATUS_COLORS.CANCELED_MANUAL },
                { label: "Zi liberă",    color: STATUS_COLORS.CANCELED_HOLIDAY },
                { label: "Holiday",      color: STATUS_COLORS.HOLIDAY },
            ].map(({ label, color }) => (
                <Badge key={label} color={color} text={<Text style={{ fontSize: 12 }}>{label}</Text>} />
            ))}
        </div>
    );

    return (
        <div style={{ padding: 8 }}>
            <Title level={3} style={{ marginBottom: 16 }}>Calendar Sesiuni</Title>

            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

            <Card>
                <Legend />
                {loading && (
                    <div style={{ textAlign: "center", padding: 24 }}>
                        <Spin />
                    </div>
                )}
                <div style={{ height: 650 }}>
                    <Calendar
                        localizer={localizer}
                        events={events}
                        date={date}
                        view={view}
                        onNavigate={(newDate) => {
                            setDate(newDate);
                            loadEvents(newDate);
                        }}
                        onView={setView}
                        messages={MESSAGES_RO}
                        culture="ro"
                        eventPropGetter={getEventStyle}
                        components={{ event: EventComponent }}
                        popup
                        showMultiDayTimes
                    />
                </div>
            </Card>
        </div>
    );
}
