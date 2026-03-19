import { http } from "./http.jsx";

/**
 * API REST pentru Message Board — versiunea Facebook.
 *
 * Endpoints:
 *   getFeed()          → GET  /api/board/feed/{channel}?limit=50
 *   addComment()       → POST /api/board/posts/{id}/comments
 *   react()            → POST /api/board/posts/{id}/react
 *   editPost()         → PUT  /api/board/posts/{id}           [ADMIN]
 *   uploadAttachment() → POST /api/board/posts/{id}/attachment [ADMIN]
 *   deletePost()       → DELETE /api/board/posts/{id}          [ADMIN]
 *
 * Mesajele noi, comentariile și reacțiile sosesc prin WebSocket STOMP.
 * useBoardSocket.js gestionează subscription-urile la toate topicurile.
 */
export const boardApi = {

    /**
     * Returnează ultimele {limit} posturi dintr-un canal ca PostCardDto-uri complete.
     * Apelat o singură dată la montarea paginii, înainte de conectarea WebSocket.
     */
    getFeed: (channel, limit = 50) =>
        http.get(`/api/board/feed/${channel}`, { limit }),

    /**
     * Adaugă un comentariu la un post.
     * @param {number} postId
     * @param {string} content
     */
    addComment: (postId, content) =>
        http.post(`/api/board/posts/${postId}/comments`, { content }),

    /**
     * Toggle/upsert reacție la un post.
     * Dacă tipul e același cu cel existent → șterge (toggle off).
     * @param {number} postId
     * @param {string} type  ex: "LIKE", "HEART", "LAUGH", "WOW", "SAD", "CLAP"
     */
    react: (postId, type) =>
        http.post(`/api/board/posts/${postId}/react`, { type }),

    /**
     * Editează conținutul unui post (ADMIN only).
     * @param {number} postId
     * @param {string} content
     */
    editPost: (postId, content) =>
        http.put(`/api/board/posts/${postId}`, { content }),

    /**
     * Adaugă sau înlocuiește atașamentul unui post (ADMIN only).
     * Trimite multipart/form-data cu câmpul "file".
     * @param {number} postId
     * @param {File}   file   obiect File din <input type="file">
     */
    uploadAttachment: async (postId, file) => {
        const formData = new FormData();
        formData.append("file", file);

        // Folosim fetch direct pentru multipart — http.jsx nu suportă FormData
        const res = await fetch(`/api/board/posts/${postId}/attachment`, {
            method:      "POST",
            credentials: "include",
            body:        formData,
            // NU setăm Content-Type — browser-ul adaugă automat boundary-ul
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            let message = text;
            try {
                const json = JSON.parse(text);
                message = json.message || text;
            } catch { /* ignorăm */ }
            throw new Error(message || `${res.status} ${res.statusText}`);
        }

        return res.json();
    },

    /**
     * Șterge un post (ADMIN only).
     */
    deletePost: (postId) =>
        http.delete(`/api/board/posts/${postId}`),

    /**
     * Șterge un comentariu (ADMIN only).
     * @param {number} commentId
     */
    deleteComment: (commentId) =>
        http.delete(`/api/board/comments/${commentId}`),
};
