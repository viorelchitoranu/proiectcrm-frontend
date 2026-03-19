import React, { useState } from "react";
import {
    Avatar, Button, Card, Input, Popconfirm,
    Space, Tag, Tooltip, Typography, Upload, message as antMessage,
} from "antd";
import {
    CommentOutlined, DeleteOutlined, EditOutlined,
    FilePdfOutlined, PaperClipOutlined,
} from "@ant-design/icons";
import ReactionBar    from "./ReactionBar.jsx";
import CommentSection from "./CommentSection.jsx";
import { boardApi }   from "../boardApi.js";

const { Text, Paragraph } = Typography;

/**
 * Card de post în stilul Facebook.
 *
 * Conține:
 *   - Header: avatar + nume autor + rol + canal + timestamp (+ "(editat)")
 *   - Conținut: text post
 *   - Atașament opțional: imagine inline sau buton download PDF
 *   - Bara de reacții (6 emoji-uri cu counter)
 *   - Contor comentarii + buton toggle expandare
 *   - Secțiunea de comentarii (expandabilă)
 *   - Acțiuni admin: editare conținut, upload atașament, ștergere
 *
 * Props:
 *   @param {object}   post            - PostCardDto
 *   @param {string}   currentRole     - "ADMIN", "TEACHER", "PARENT"
 *   @param {number}   currentUserId   - ID utilizator curent
 *   @param {function} onReact         - callback(postId, type)
 *   @param {function} onCommentAdded  - callback(postId, CommentDto)
 *   @param {function} onPostUpdated   - callback(PostCardDto) — după editare/atașament
 *   @param {function} onPostDeleted   - callback(postId)
 */
export default function PostCard({
                                     post,
                                     currentRole,
                                     currentUserId,
                                     onReact,
                                     onCommentAdded,
                                     onPostUpdated,
                                     onPostDeleted,
                                 }) {
    const isAdmin = currentRole === "ADMIN";

    const [commentsVisible, setCommentsVisible] = useState(false);
    const [reacting,        setReacting]        = useState(false);
    const [deleting,        setDeleting]        = useState(false);

    // State editare
    const [editing,      setEditing]      = useState(false);
    const [editContent,  setEditContent]  = useState(post.content);
    const [savingEdit,   setSavingEdit]   = useState(false);

    // State upload atașament
    const [uploading, setUploading] = useState(false);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleReact = async (type) => {
        setReacting(true);
        try {
            await onReact(post.id, type);
        } finally {
            setReacting(false);
        }
    };

    const handleSaveEdit = async () => {
        const content = editContent.trim();
        if (!content) return;
        setSavingEdit(true);
        try {
            const updated = await boardApi.editPost(post.id, content);
            setEditing(false);
            if (onPostUpdated) onPostUpdated(updated);
            antMessage.success("Post editat.");
        } catch (e) {
            antMessage.error(e?.message || "Nu am putut edita postul.");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await boardApi.deletePost(post.id);
            if (onPostDeleted) onPostDeleted(post.id);
            antMessage.success("Post șters.");
        } catch (e) {
            antMessage.error(e?.message || "Nu am putut șterge postul.");
            setDeleting(false);
        }
    };

    const handleUpload = async ({ file }) => {
        setUploading(true);
        try {
            const updated = await boardApi.uploadAttachment(post.id, file);
            if (onPostUpdated) onPostUpdated(updated);
            antMessage.success("Atașament adăugat.");
        } catch (e) {
            antMessage.error(e?.message || "Nu am putut încărca fișierul.");
        } finally {
            setUploading(false);
        }
        // Returnăm false pentru a preveni upload-ul automat al Ant Design
        return false;
    };

    // ── Helpers UI ────────────────────────────────────────────────────────────

    const roleBadge = (role) => {
        if (role === "ADMIN")   return <Tag color="blue"  style={{ fontSize: 11 }}>Admin</Tag>;
        if (role === "TEACHER") return <Tag color="green" style={{ fontSize: 11 }}>Profesor</Tag>;
        return null;
    };

    const channelLabel = (ch) => {
        if (ch === "GENERAL")       return <Tag color="default">General</Tag>;
        if (ch === "ANNOUNCEMENTS") return <Tag color="orange">Anunțuri</Tag>;
        if (ch?.startsWith("GROUP_")) return <Tag color="purple">Grupă #{ch.replace("GROUP_", "")}</Tag>;
        return null;
    };

    const formatDate = (iso) => {
        if (!iso) return "";
        try {
            return new Date(iso).toLocaleString("ro-RO", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
            });
        } catch { return ""; }
    };

    const initials = (name) => {
        if (!name) return "?";
        const parts = name.split(" ");
        return parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : name[0].toUpperCase();
    };

    const avatarColor = (role) => {
        if (role === "ADMIN")   return "#1677ff";
        if (role === "TEACHER") return "#52c41a";
        return "#8c8c8c";
    };

    const commentCount = post.comments?.length || 0;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Card
            size="small"
            style={{
                borderRadius: 12,
                border:       "1px solid var(--color-border-tertiary)",
                marginBottom: 16,
            }}
            bodyStyle={{ padding: "12px 16px" }}
        >
            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <Space align="start">
                    <Avatar
                        size={40}
                        style={{ background: avatarColor(post.authorRole), fontSize: 14, flexShrink: 0 }}
                    >
                        {initials(post.authorName)}
                    </Avatar>
                    <div>
                        <Space size={6} align="center">
                            <Text strong style={{ fontSize: 14 }}>{post.authorName}</Text>
                            {roleBadge(post.authorRole)}
                            {channelLabel(post.channel)}
                        </Space>
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {formatDate(post.createdAt)}
                                {post.editedAt && (
                                    <span style={{ marginLeft: 6, fontStyle: "italic" }}>
                                        · editat {formatDate(post.editedAt)}
                                    </span>
                                )}
                            </Text>
                        </div>
                    </div>
                </Space>

                {/* ── Acțiuni admin ── */}
                {isAdmin && (
                    <Space size={4}>
                        <Tooltip title="Editează">
                            <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => { setEditing(true); setEditContent(post.content); }}
                            />
                        </Tooltip>
                        <Upload
                            beforeUpload={(file) => { handleUpload({ file }); return false; }}
                            showUploadList={false}
                            accept=".jpg,.jpeg,.png,.pdf"
                            disabled={uploading}
                        >
                            <Tooltip title="Adaugă atașament (JPEG, PNG, PDF — max 10MB)">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<PaperClipOutlined />}
                                    loading={uploading}
                                />
                            </Tooltip>
                        </Upload>
                        <Popconfirm
                            title="Ștergi această postare?"
                            okText="Șterge"
                            cancelText="Anulează"
                            okButtonProps={{ danger: true }}
                            onConfirm={handleDelete}
                        >
                            <Tooltip title="Șterge">
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={deleting}
                                />
                            </Tooltip>
                        </Popconfirm>
                    </Space>
                )}
            </div>

            {/* ── Conținut post ── */}
            {editing ? (
                <Space direction="vertical" style={{ width: "100%", marginBottom: 10 }}>
                    <Input.TextArea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 8 }}
                        maxLength={2000}
                        showCount
                    />
                    <Space>
                        <Button
                            type="primary"
                            size="small"
                            onClick={handleSaveEdit}
                            loading={savingEdit}
                            disabled={!editContent.trim()}
                        >
                            Salvează
                        </Button>
                        <Button
                            size="small"
                            onClick={() => setEditing(false)}
                            disabled={savingEdit}
                        >
                            Anulează
                        </Button>
                    </Space>
                </Space>
            ) : (
                <Paragraph
                    style={{
                        marginBottom: 10,
                        whiteSpace:   "pre-wrap",
                        wordBreak:    "break-word",
                        fontSize:     14,
                    }}
                >
                    {post.content}
                </Paragraph>
            )}

            {/* ── Atașament ── */}
            {post.attachmentUrl && (
                <div style={{ marginBottom: 10 }}>
                    {post.attachmentType === "IMAGE" ? (
                        // Imagine afișată inline
                        <img
                            src={post.attachmentUrl}
                            alt="Atașament"
                            style={{
                                maxWidth:     "100%",
                                maxHeight:    400,
                                borderRadius: 8,
                                objectFit:    "contain",
                                border:       "1px solid var(--color-border-tertiary)",
                            }}
                        />
                    ) : (
                        // PDF — buton de download
                        <a
                            href={post.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display:      "inline-flex",
                                alignItems:   "center",
                                gap:          8,
                                padding:      "8px 16px",
                                borderRadius: 8,
                                border:       "1px solid var(--color-border-secondary)",
                                color:        "var(--color-text-primary)",
                                textDecoration: "none",
                                background:   "var(--color-background-secondary)",
                                fontSize:     13,
                            }}
                        >
                            <FilePdfOutlined style={{ color: "#ff4d4f", fontSize: 20 }} />
                            Descarcă document PDF
                        </a>
                    )}
                </div>
            )}

            {/* ── Bara de reacții ── */}
            <div style={{ marginBottom: 8 }}>
                <ReactionBar
                    reactions={post.reactions}
                    onReact={handleReact}
                    loading={reacting}
                />
            </div>

            {/* ── Toggle comentarii ── */}
            <div style={{
                borderTop:  "1px solid var(--color-border-tertiary)",
                paddingTop: 8,
                marginTop:  4,
            }}>
                <Button
                    type="text"
                    size="small"
                    icon={<CommentOutlined />}
                    onClick={() => setCommentsVisible(v => !v)}
                    style={{ color: "var(--color-text-secondary)", fontSize: 13 }}
                >
                    {commentCount > 0
                        ? `${commentCount} ${commentCount === 1 ? "comentariu" : "comentarii"}`
                        : "Comentează"
                    }
                </Button>
            </div>

            {/* ── Secțiunea comentarii (expandabilă) ── */}
            <CommentSection
                comments={post.comments || []}
                postId={post.id}
                visible={commentsVisible}
                onCommentAdded={(dto) => onCommentAdded && onCommentAdded(post.id, dto)}
                onCommentDeleted={(commentId) => onCommentDeleted && onCommentDeleted(post.id, commentId)}
                currentRole={currentRole}
                currentUserId={currentUserId}
            />
        </Card>
    );
}
