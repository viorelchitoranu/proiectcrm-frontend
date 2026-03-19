import React, { useEffect, useState } from "react";
import { Spin } from "antd";
import { teacherApi }  from "../teacherApi.js";
import { loadSession } from "../auth/session.jsx";
import MessageBoardPage from "../MessageBoardPage.jsx";

/**
 * Pagina de forum pentru TEACHER.
 *
 * Canalele disponibile:
 *   GENERAL       → chat general (poate posta)
 *   ANNOUNCEMENTS → anunțuri (profesorul poate posta)
 *   GROUP_{id}    → câte un canal per grupă activă predată de acest profesor
 *
 * Fix față de versiunea anterioară:
 *   - teacherId era lipsă la apelul getActiveGroups() → grupele nu se încărcau
 *   - channelNames trimis la MessageBoardPage → afișează "Robotică Luni"
 *     în loc de "Grupa #5"
 */
export default function TeacherMessageBoardPage() {
    const [channels,     setChannels]     = useState(["GENERAL", "ANNOUNCEMENTS"]);
    const [channelNames, setChannelNames] = useState({});
    const [loading,      setLoading]      = useState(true);

    // teacherId e obligatoriu pentru teacherApi — la fel ca în TeacherGroupsPage
    const session   = loadSession();
    const teacherId = session?.userId;

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const groups = await teacherApi.getActiveTeacherGroups();
                if (!active) return;

                if (Array.isArray(groups) && groups.length > 0) {
                    const groupChannels = groups.map(g => `GROUP_${g.groupId}`);
                    const names = {};
                    groups.forEach(g => {
                        names[`GROUP_${g.groupId}`] = g.groupName;
                    });
                    setChannels(["GENERAL", "ANNOUNCEMENTS", ...groupChannels]);
                    setChannelNames(names);
                }
            } catch (err) {
                console.error("[TeacherBoard] Eroare încărcare grupe:", err);
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
