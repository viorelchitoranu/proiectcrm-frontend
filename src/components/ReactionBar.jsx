import React, { useState } from "react";
import { Button, Space, Tooltip, Typography } from "antd";

const { Text } = Typography;

/**
 * Bara de reacții în stilul Facebook.
 *
 * Afișează 6 butoane emoji + numărul total de reacții.
 * Butonul reacției curente a utilizatorului este evidențiat (fundal colorat).
 * Click pe același buton → toggle off (șterge reacția).
 * Click pe alt buton → schimbă reacția.
 *
 * Props:
 *   @param {object}   reactions    - ReactionSummaryDto: { counts, myReaction, totalCount }
 *   @param {function} onReact      - callback(type: string) apelat la click
 *   @param {boolean}  [loading]    - dezactivează butoanele în timp ce request-ul e în curs
 */

// Configurare emoji + tooltip per tip de reacție
const REACTION_CONFIG = [
    { type: "LIKE",  emoji: "👍", label: "Like",     color: "#1877f2" },
    { type: "HEART", emoji: "❤️", label: "Iubesc",   color: "#f33e58" },
    { type: "LAUGH", emoji: "😂", label: "Haha",     color: "#f7b125" },
    { type: "WOW",   emoji: "😮", label: "Wow",      color: "#f7b125" },
    { type: "SAD",   emoji: "😢", label: "Trist",    color: "#f7b125" },
    { type: "CLAP",  emoji: "👏", label: "Bravo",    color: "#1877f2" },
];

export default function ReactionBar({ reactions = {}, onReact, loading = false }) {
    const { counts = {}, myReaction = null, totalCount = 0 } = reactions;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>

            {/* ── Butoane reacții ── */}
            {REACTION_CONFIG.map(({ type, emoji, label, color }) => {
                const count    = counts[type] || 0;
                const isActive = myReaction === type;

                return (
                    <Tooltip key={type} title={label}>
                        <button
                            onClick={() => !loading && onReact(type)}
                            disabled={loading}
                            style={{
                                display:         "flex",
                                alignItems:      "center",
                                gap:             3,
                                padding:         "3px 8px",
                                borderRadius:    20,
                                border:          "1px solid",
                                borderColor:     isActive ? color : "var(--color-border-tertiary)",
                                background:      isActive ? color + "18" : "transparent",
                                cursor:          loading ? "not-allowed" : "pointer",
                                transition:      "all 0.15s",
                                fontSize:        14,
                                fontFamily:      "inherit",
                                opacity:         loading ? 0.6 : 1,
                            }}
                        >
                            <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
                            {count > 0 && (
                                <Text
                                    style={{
                                        fontSize:   12,
                                        color:      isActive ? color : "var(--color-text-secondary)",
                                        fontWeight: isActive ? 500 : 400,
                                    }}
                                >
                                    {count}
                                </Text>
                            )}
                        </button>
                    </Tooltip>
                );
            })}

            {/* ── Total reacții ── */}
            {totalCount > 0 && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                    {totalCount} {totalCount === 1 ? "reacție" : "reacții"}
                </Text>
            )}
        </div>
    );
}
