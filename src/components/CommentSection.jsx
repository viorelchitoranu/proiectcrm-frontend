import React, { useState } from "react";
import { Avatar, Button, Input, Popconfirm, Space, Typography, message as antMessage } from "antd";
import { DeleteOutlined, SendOutlined } from "@ant-design/icons";
import { boardApi } from "../boardApi.js";

const { Text } = Typography;

/**
 * Secțiunea de comentarii a unui card de post.
 *
 * Afișează lista de comentarii existente și un câmp de input pentru
 * adăugarea unui comentariu nou.
 *
 * Comentariile noi adăugate local sunt afișate optimistic (imediat),
 * fără să aștepte WebSocket-ul — WebSocket-ul va aduce ulterior
 * confirmare de la server (prevenind duplicatele prin ID).
 *
 * Props:
 *   @param {object[]} comments      - lista de CommentDto-uri
 *   @param {number}   postId        - ID-ul postului
 *   @param {boolean}  [visible]     - dacă secțiunea e expandată
 *   @param {function} onCommentAdded - callback(CommentDto) când comentariul e adăugat
 *   @param {string}   currentRole   - rolul utilizatorului curent ("ADMIN", "TEACHER", "PARENT")
 *   @param {number}   currentUserId - ID-ul utilizatorului curent
 */
export default function CommentSection({
                                           comments = [],
                                           postId,
                                           visible = false,
                                           onCommentAdded,
                                           onCommentDeleted,
                                           currentRole,
                                           currentUserId,
                                       }) {
    const isAdmin = currentRole === "ADMIN";
    const [inputValue,  setInputValue]  = useState("");
    const [submitting,  setSubmitting]  = useState(false);
    const [deletingId,  setDeletingId]  = useState(null);

    if (!visible) return null;

    const handleSubmit = async () => {
        const content = inputValue.trim();
        if (!content) return;

        setSubmitting(true);
        try {
            const dto = await boardApi.addComment(postId, content);
            setInputValue("");
            if (onCommentAdded) onCommentAdded(dto);
        } catch (e) {
            antMessage.error(e?.message || "Nu am putut trimite comentariul.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        setDeletingId(commentId);
        try {
            await boardApi.deleteComment(commentId);
            if (onCommentDeleted) onCommentDeleted(commentId);
            antMessage.success("Comentariu șters.");
        } catch (e) {
            antMessage.error(e?.message || "Nu am putut șterge comentariul.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    const roleBadgeColor = (role) => {
        if (role === "ADMIN")   return "#1677ff";
        if (role === "TEACHER") return "#52c41a";
        return null;
    };

    const formatDate = (iso) => {
        if (!iso) return "";
        try {
            const d = new Date(iso);
            return d.toLocaleString("ro-RO", {
                day: "2-digit", month: "2-digit",
                hour: "2-digit", minute: "2-digit",
            });
        } catch { return ""; }
    };

    // Inițialele pentru avatar
    const initials = (name) => {
        if (!name) return "?";
        const parts = name.split(" ");
        return parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : name[0].toUpperCase();
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{
            borderTop: "1px solid var(--color-border-tertiary)",
            paddingTop: 12,
            marginTop:  8,
        }}>

            {/* ── Lista comentarii ── */}
            {comments.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 13 }}>
                    Fii primul care comentează.
                </Text>
            ) : (
                <Space direction="vertical" size={8} style={{ width: "100%", marginBottom: 12 }}>
                    {comments.map((c) => (
                        <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            {/* Avatar cu inițiale */}
                            <Avatar
                                size={28}
                                style={{
                                    background:  roleBadgeColor(c.authorRole) || "var(--color-border-secondary)",
                                    fontSize:    11,
                                    flexShrink:  0,
                                    marginTop:   2,
                                }}
                            >
                                {initials(c.authorName)}
                            </Avatar>

                            {/* Bubble comentariu */}
                            <div style={{
                                background:   "var(--color-background-secondary)",
                                borderRadius: 12,
                                padding:      "6px 12px",
                                maxWidth:     "85%",
                            }}>
                                {/* Autor + rol + buton ștergere admin */}
                                <Space size={6} align="center" style={{ justifyContent: "space-between", width: "100%" }}>
                                    <Space size={6} align="center">
                                        <Text strong style={{ fontSize: 12 }}>{c.authorName}</Text>
                                        {roleBadgeColor(c.authorRole) && (
                                            <span style={{
                                                fontSize:     10,
                                                color:        roleBadgeColor(c.authorRole),
                                                border:       `1px solid ${roleBadgeColor(c.authorRole)}`,
                                                borderRadius: 4,
                                                padding:      "0 4px",
                                            }}>
                                                {c.authorRole === "ADMIN" ? "Admin" : "Profesor"}
                                            </span>
                                        )}
                                    </Space>
                                    {/* Buton ștergere — doar pentru ADMIN */}
                                    {isAdmin && (
                                        <Popconfirm
                                            title="Ștergi comentariul?"
                                            okText="Șterge"
                                            cancelText="Anulează"
                                            okButtonProps={{ danger: true, size: "small" }}
                                            onConfirm={() => handleDeleteComment(c.id)}
                                        >
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                loading={deletingId === c.id}
                                                style={{ padding: "0 4px", height: 18, fontSize: 11 }}
                                            />
                                        </Popconfirm>
                                    )}
                                </Space>

                                {/* Conținut */}
                                <Text style={{
                                    display:    "block",
                                    fontSize:   13,
                                    whiteSpace: "pre-wrap",
                                    wordBreak:  "break-word",
                                    marginTop:  2,
                                }}>
                                    {c.content}
                                </Text>

                                {/* Timestamp + editat */}
                                <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: "block" }}>
                                    {formatDate(c.createdAt)}
                                    {c.editedAt && " · (editat)"}
                                </Text>
                            </div>
                        </div>
                    ))}
                </Space>
            )}

            {/* ── Input comentariu nou ── */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 8 }}>
                <Input.TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scrie un comentariu... (Enter = trimite)"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    maxLength={1000}
                    disabled={submitting}
                    style={{ borderRadius: 20, resize: "none", flex: 1 }}
                />
                <Button
                    type="primary"
                    shape="circle"
                    icon={<SendOutlined />}
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={!inputValue.trim()}
                    size="small"
                />
            </div>
        </div>
    );
}
