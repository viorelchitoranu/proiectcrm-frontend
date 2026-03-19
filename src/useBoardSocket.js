import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

/**
 * Hook React pentru conexiunea WebSocket STOMP la Message Board — versiunea Facebook.
 *
 * Se abonează la 3 topicuri per canal:
 *   /topic/board/{channel}           → post nou sau post actualizat (PostCardDto)
 *   /topic/board/{channel}/comments  → comentariu nou ({ postId, comment: CommentDto })
 *   /topic/board/{channel}/reactions → reacție actualizată ({ postId, reactions: ReactionSummaryDto })
 *
 * Callbacks:
 *   onNewPost(PostCardDto)                                → post nou de adăugat în feed
 *   onPostUpdate(PostCardDto)                             → post existent de înlocuit
 *   onNewComment({ postId, comment })                     → comentariu nou de adăugat
 *   onReactionUpdate({ postId, reactions })               → reacții actualizate
 *   onConnect()                                           → conexiunea e activă
 *   onError(msg)                                          → eroare conexiune
 *
 * Diferența onNewPost vs onPostUpdate:
 *   Backend trimite același PostCardDto pe /topic/board/{channel} atât pentru
 *   posturi noi cât și pentru posturi editate/cu atașament.
 *   Frontend distinge: dacă postId există deja în feed → update, altfel → new.
 *
 * @param {object}   options
 * @param {string}   options.channel
 * @param {function} options.onPost          - callback(PostCardDto) — post nou SAU actualizat
 * @param {function} options.onNewComment    - callback({ postId, comment })
 * @param {function} options.onReactionUpdate - callback({ postId, reactions })
 * @param {function} [options.onConnect]
 * @param {function} [options.onError]
 *
 * @returns {{ sendMessage: function(channel, content), connected: boolean ref }}
 */
export function useBoardSocket({
                                   channel,
                                   onPost,
                                   onNewComment,
                                   onReactionUpdate,
                                   onConnect,
                                   onError,
                               }) {
    const clientRef = useRef(null);

    /**
     * Trimite un mesaj (post nou) prin WebSocket.
     * Dacă nu suntem conectați, ignorăm silențios.
     */
    const sendMessage = useCallback((targetChannel, content) => {
        if (!clientRef.current?.connected) {
            console.warn("[Board] Tentativă de trimitere fără conexiune activă.");
            return;
        }
        clientRef.current.publish({
            destination: "/app/board/publish",
            body: JSON.stringify({ channel: targetChannel, content }),
        });
    }, []);

    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS("/ws"),
            reconnectDelay: 5000,

            onConnect: () => {
                // ── Subscription 1: posturi noi și actualizate ─────────────
                client.subscribe(`/topic/board/${channel}`, (msg) => {
                    try { onPost(JSON.parse(msg.body)); }
                    catch (e) { console.error("[Board] Eroare parsare post:", e); }
                });

                // ── Subscription 2: comentarii noi ─────────────────────────
                client.subscribe(`/topic/board/${channel}/comments`, (msg) => {
                    try { onNewComment(JSON.parse(msg.body)); }
                    catch (e) { console.error("[Board] Eroare parsare comentariu:", e); }
                });

                // ── Subscription 3: reacții actualizate ────────────────────
                client.subscribe(`/topic/board/${channel}/reactions`, (msg) => {
                    try { onReactionUpdate(JSON.parse(msg.body)); }
                    catch (e) { console.error("[Board] Eroare parsare reacție:", e); }
                });

                if (onConnect) onConnect();
            },

            onStompError: (frame) => {
                const errorMsg = frame?.headers?.message || "Eroare conexiune WebSocket.";
                console.error("[Board] STOMP error:", errorMsg);
                if (onError) onError(errorMsg);
            },
        });

        clientRef.current = client;
        client.activate();

        // Cleanup la demontarea componentei sau la schimbarea canalului
        return () => {
            client.deactivate();
            clientRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channel]);

    return { sendMessage };
}
