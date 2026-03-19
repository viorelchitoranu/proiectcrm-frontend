import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert, Badge, Button, Input, Select,
    Space, Spin, Typography, message as antMessage,
} from "antd";
import { ReloadOutlined, SendOutlined } from "@ant-design/icons";
import PostCard        from "./components/PostCard.jsx";
import { boardApi }    from "./boardApi.js";
import { useBoardSocket } from "./useBoardSocket.js";
import { loadSession } from "./auth/session.jsx";

const { Title, Text } = Typography;
const { TextArea }    = Input;

/**
 * Pagina principală Message Board — stilul Facebook cu carduri.
 *
 * Funcționalități:
 *   - Feed de carduri (PostCardDto) cu comentarii + reacții per card
 *   - Selector canal: GENERAL, ANNOUNCEMENTS, GROUP_{id}
 *   - Posturi noi și actualizări sosesc în timp real prin WebSocket
 *   - Input de postare (ADMIN și TEACHER) — PARENT nu poate posta
 *   - Pe ANNOUNCEMENTS, PARENT nu vede câmpul de input
 *   - Reacții cu 6 emoji-uri, toggle off, counter vizibil
 *   - Comentarii expandabile per card
 *   - Admin: editare post, upload atașament JPEG/PNG/PDF, ștergere
 *
 * Props:
 *   @param {string[]} [availableChannels]  - canalele accesibile utilizatorului
 *   @param {string}   [defaultChannel]     - canalul selectat la deschidere
 *   @param {object}   [channelNames]       - map canal → nume afișat în selector
 *                                            ex: { "GROUP_5": "Robotică Luni 17:00" }
 *                                            Dacă lipsește, se afișează "Grupă #5"
 */
export default function MessageBoardPage({
                                             availableChannels = ["GENERAL", "ANNOUNCEMENTS"],
                                             defaultChannel    = "GENERAL",
                                             channelNames      = {},
                                         }) {
    const session   = loadSession();
    const role      = session?.role?.toUpperCase() || "";
    const userId    = session?.userId;
    const isAdmin   = role === "ADMIN";
    const isParent  = role === "PARENT";

    // ── State ─────────────────────────────────────────────────────────────────
    const [channel,      setChannel]      = useState(defaultChannel);
    const [posts,        setPosts]        = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState(null);
    const [connected,    setConnected]    = useState(false);
    const [inputValue,   setInputValue]   = useState("");
    const [posting,      setPosting]      = useState(false);

    const bottomRef = useRef(null);

    // ── Fetch feed inițial ────────────────────────────────────────────────────

    const loadFeed = useCallback(async (ch) => {
        setLoading(true);
        setError(null);
        setPosts([]);
        try {
            const data = await boardApi.getFeed(ch, 50);
            setPosts(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e?.message || "Nu am putut încărca feed-ul.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadFeed(channel); }, [channel, loadFeed]);

    // Scroll la ultimul post după încărcare
    useEffect(() => {
        if (posts.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [posts.length]);

    // ── WebSocket handlers ────────────────────────────────────────────────────

    /**
     * Post nou SAU post actualizat (editat/cu atașament nou).
     * Dacă ID-ul există deja → update (înlocuim cardul).
     * Dacă nu → adăugăm la sfârșitul feed-ului.
     */
    const handlePost = useCallback((dto) => {
        setPosts(prev => {
            const idx = prev.findIndex(p => p.id === dto.id);
            if (idx >= 0) {
                // Post existent actualizat → înlocuim
                const updated = [...prev];
                updated[idx] = dto;
                return updated;
            }
            // Post nou → adăugăm la final
            return [...prev, dto];
        });
    }, []);

    /**
     * Comentariu nou primit prin WebSocket.
     * Adăugăm la lista de comentarii a cardului corespunzător.
     * Prevenim duplicate: dacă comentariul există deja (adăugat optimistic), îl ignorăm.
     */
    const handleNewComment = useCallback(({ postId, comment }) => {
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            const exists = p.comments?.some(c => c.id === comment.id);
            if (exists) return p;
            return { ...p, comments: [...(p.comments || []), comment] };
        }));
    }, []);

    /**
     * Reacție actualizată primit prin WebSocket.
     * Actualizăm sumarul de reacții al cardului corespunzător.
     */
    const handleReactionUpdate = useCallback(({ postId, reactions }) => {
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, reactions } : p
        ));
    }, []);

    const { sendMessage } = useBoardSocket({
        channel,
        onPost:             handlePost,
        onNewComment:       handleNewComment,
        onReactionUpdate:   handleReactionUpdate,
        onConnect:          () => setConnected(true),
        onError:            () => setConnected(false),
    });

    // ── Handlers UI ───────────────────────────────────────────────────────────

    const handlePost_ = async () => {
        const content = inputValue.trim();
        if (!content || !connected) return;

        setPosting(true);
        try {
            sendMessage(channel, content);
            setInputValue("");
        } catch (e) {
            antMessage.error("Nu am putut trimite postarea.");
        } finally {
            setPosting(false);
        }
    };

    /**
     * Reacție la un post — apelat din PostCard.
     * Nu facem update local optimistic — așteptăm broadcast-ul WebSocket.
     */
    const handleReact = useCallback(async (postId, type) => {
        try {
            await boardApi.react(postId, type);
            // WebSocket va aduce reactionUpdate → handleReactionUpdate
        } catch (e) {
            antMessage.error(e?.message || "Nu am putut trimite reacția.");
        }
    }, []);

    /**
     * Comentariu adăugat din CommentSection — update optimistic local.
     * WebSocket va aduce confirmarea (ignorăm duplicatul prin ID check).
     */
    const handleCommentAdded = useCallback((postId, dto) => {
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            const exists = p.comments?.some(c => c.id === dto.id);
            if (exists) return p;
            return { ...p, comments: [...(p.comments || []), dto] };
        }));
    }, []);

    /** Post actualizat după editare sau upload atașament (primit din PostCard). */
    const handlePostUpdated = useCallback((updatedPost) => {
        setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    }, []);

    /** Post șters — eliminăm din feed. */
    const handlePostDeleted = useCallback((postId) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    }, []);

    /** Comentariu șters de admin — eliminăm din lista comentariilor cardului. */
    const handleCommentDeleted = useCallback((postId, commentId) => {
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            return { ...p, comments: (p.comments || []).filter(c => c.id !== commentId) };
        }));
    }, []);

    // ── Calcul restricții input ───────────────────────────────────────────────

    // PARENT nu poate posta pe ANNOUNCEMENTS; pe restul poate
    const canPost = !isParent || channel !== "ANNOUNCEMENTS";
    // PARENT nu poate posta deloc pe ANNOUNCEMENTS (canal readonly pentru ei)
    const showInput = canPost;

    const channelLabel = (ch) => {
        if (ch === "GENERAL")        return "General";
        if (ch === "ANNOUNCEMENTS")  return "Anunțuri";
        if (ch?.startsWith("GROUP_")) {
            // Folosim numele real din map dacă există, altfel fallback la "Grupă #id"
            return channelNames[ch] || `Grupă #${ch.replace("GROUP_", "")}`;
        }
        return ch;
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>

            {/* ── Header ── */}
            <Space style={{ justifyContent: "space-between", width: "100%", flexWrap: "wrap" }}>
                <Space align="center">
                    <Title level={4} style={{ margin: 0 }}>Forum</Title>
                    <Badge
                        status={connected ? "success" : "processing"}
                        text={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {connected ? "Live" : "Reconectare..."}
                            </Text>
                        }
                    />
                </Space>

                <Space>
                    <Select
                        value={channel}
                        onChange={setChannel}
                        style={{ minWidth: 160 }}
                        options={availableChannels.map(ch => ({
                            value: ch,
                            label: channelLabel(ch),
                        }))}
                    />
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => loadFeed(channel)}
                        loading={loading}
                    />
                </Space>
            </Space>

            {/* ── Info canal ANNOUNCEMENTS pentru PARENT ── */}
            {isParent && channel === "ANNOUNCEMENTS" && (
                <Alert
                    type="info"
                    showIcon
                    message="Canalul Anunțuri este doar pentru citire. Doar administratorii și profesorii pot posta anunțuri."
                />
            )}

            {/* ── Eroare feed ── */}
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message={error}
                    action={
                        <Button size="small" onClick={() => loadFeed(channel)}>
                            Reîncearcă
                        </Button>
                    }
                />
            )}

            {/* ── Input publicare post (ADMIN + TEACHER + PARENT pe GENERAL/GROUP) ── */}
            {showInput && (
                <Space.Compact style={{ width: "100%" }}>
                    <TextArea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handlePost_();
                            }
                        }}
                        placeholder={
                            connected
                                ? `Scrie un mesaj în ${channelLabel(channel)}...`
                                : "Se reconectează..."
                        }
                        disabled={!connected || posting}
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        maxLength={2000}
                        showCount
                        style={{ borderRadius: "8px 0 0 8px" }}
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handlePost_}
                        disabled={!connected || !inputValue.trim()}
                        loading={posting}
                        style={{ height: "auto", borderRadius: "0 8px 8px 0", minWidth: 48 }}
                    />
                </Space.Compact>
            )}

            {/* ── Feed ── */}
            {loading ? (
                <div style={{ textAlign: "center", padding: 48 }}>
                    <Spin size="large" tip="Se încarcă feed-ul..." />
                </div>
            ) : posts.length === 0 ? (
                <div style={{
                    textAlign:  "center",
                    padding:    48,
                    color:      "var(--color-text-secondary)",
                    background: "var(--color-background-secondary)",
                    borderRadius: 12,
                }}>
                    <Text type="secondary">Nicio postare în acest canal. Fii primul!</Text>
                </div>
            ) : (
                <Space direction="vertical" size={0} style={{ width: "100%" }}>
                    {posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentRole={role}
                            currentUserId={userId}
                            onReact={handleReact}
                            onCommentAdded={handleCommentAdded}
                            onCommentDeleted={handleCommentDeleted}
                            onPostUpdated={handlePostUpdated}
                            onPostDeleted={handlePostDeleted}
                        />
                    ))}
                    <div ref={bottomRef} />
                </Space>
            )}
        </Space>
    );
}
