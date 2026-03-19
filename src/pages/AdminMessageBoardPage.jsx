import React, { useEffect, useState } from "react";
import { Spin } from "antd";
import { adminApi } from "../adminapi.js";
import MessageBoardPage from "../MessageBoardPage.jsx";

/**
 * Pagina de forum pentru ADMIN.
 *
 * Canalele disponibile:
 *   GENERAL       → chat general
 *   ANNOUNCEMENTS → anunțuri (adminul poate posta, edita, șterge)
 *   GROUP_{id}    → toate grupele active din sistem
 *
 * Adminul vede TOATE grupele — nu doar grupele proprii.
 * Poate edita orice post, șterge orice comentariu, adăuga atașamente.
 *
 * channelNames trimis la MessageBoardPage → afișează "Robotică Luni 17:00"
 * în loc de "Grupa #5" în selectorului de canal.
 */
export default function AdminMessageBoardPage() {
    const [channels,     setChannels]     = useState(["GENERAL", "ANNOUNCEMENTS"]);
    const [channelNames, setChannelNames] = useState({});
    const [loading,      setLoading]      = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                // adminApi.getGroups() returnează GroupAdminResponse[]
                // cu câmpurile: id, name, courseName, schoolName, active
                const groups = await adminApi.getGroups();
                if (!active) return;

                if (Array.isArray(groups) && groups.length > 0) {
                    // Filtrăm doar grupele active — grupele inactive nu au canal de forum
                    const activeGroups = groups.filter(g => g.active !== false);

                    const groupChannels = activeGroups.map(g => `GROUP_${g.id}`);

                    // Map canal → nume afișat în selector
                    // ex: { "GROUP_5": "Robotică | Școala nr. 5" }
                    const names = {};
                    activeGroups.forEach(g => {
                        const label = [g.name, g.courseName, g.schoolName]
                            .filter(Boolean)
                            .join(" | ");
                        names[`GROUP_${g.id}`] = label || g.name;
                    });

                    setChannels(["GENERAL", "ANNOUNCEMENTS", ...groupChannels]);
                    setChannelNames(names);
                }
            } catch {
                // Eșec silențios — rămânem cu GENERAL + ANNOUNCEMENTS
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: 40 }}>
                <Spin tip="Se încarcă forumul..." />
            </div>
        );
    }

    return (
        <MessageBoardPage
            availableChannels={channels}
            channelNames={channelNames}
            defaultChannel="GENERAL"
        />
    );
}
