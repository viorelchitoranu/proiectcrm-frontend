import React, { useEffect, useState } from "react";
import { Spin } from "antd";
import { parentApi }   from "../parentApi.js";
import { loadSession } from "../auth/session.jsx";
import MessageBoardPage from "../MessageBoardPage.jsx";

/**
 * Pagina de forum pentru PARENT.
 *
 * Canalele disponibile:
 *   GENERAL       → chat general (poate posta)
 *   ANNOUNCEMENTS → anunțuri (doar citire pentru PARENT)
 *   GROUP_{id}    → câte un canal per grupă activă a copiilor săi
 *
 * channelNames trimis la MessageBoardPage → afișează numele real al grupei
 * în selector în loc de "Grupa #5".
 */
export default function ParentMessageBoardPage() {
    const [channels,     setChannels]     = useState(["GENERAL", "ANNOUNCEMENTS"]);
    const [channelNames, setChannelNames] = useState({});
    const [loading,      setLoading]      = useState(true);

    const session  = loadSession();
    const parentId = session?.userId;

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const children = await parentApi.getChildren(parentId);
                if (!active || !Array.isArray(children) || children.length === 0) {
                    return;
                }

                const enrollmentResults = await Promise.allSettled(
                    children.map(c =>
                        parentApi.getChildEnrollments(parentId, c.idChild ?? c.childId)
                    )
                );

                if (!active) return;

                // Colectăm groupId + groupName unice din toate înscrieriileactive
                const groupMap = new Map(); // groupId → groupName
                enrollmentResults.forEach(result => {
                    if (result.status === "fulfilled" && Array.isArray(result.value)) {
                        result.value.forEach(enrollment => {
                            if (enrollment.groupId) {
                                // groupName poate fi în câmpul groupName sau name
                                const name = enrollment.groupName || enrollment.name || `Grupă #${enrollment.groupId}`;
                                groupMap.set(enrollment.groupId, name);
                            }
                        });
                    }
                });

                if (groupMap.size > 0) {
                    const groupChannels = [...groupMap.keys()].map(id => `GROUP_${id}`);

                    // Map canal → nume afișat în selector
                    const names = {};
                    groupMap.forEach((name, id) => {
                        names[`GROUP_${id}`] = name;
                    });

                    setChannels(["GENERAL", "ANNOUNCEMENTS", ...groupChannels]);
                    setChannelNames(names);
                }
            } catch {
                // Eșec silențios
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [parentId]);

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
