import { http } from "./http.jsx";

export const parentApi = {
    getChildren: () => http.get("/api/parent/children"),

    getChildEnrollments: (childId) =>
        http.get(`/api/parent/children/${childId}/enrollments`),

    getChildGroupSchedule: (childId, groupId) =>
        http.get(`/api/parent/children/${childId}/groups/${groupId}/schedule`),

    cancelChildSession: (childId, sessionId, payload) =>
        http.post(`/api/parent/children/${childId}/sessions/${sessionId}/cancel`, payload),

    requestRecoveryForChildSession: (childId, sessionId, payload) =>
        http.post(`/api/parent/children/${childId}/sessions/${sessionId}/request-recovery`, payload),

    updatePassword: (payload) =>
        http.put("/api/parent/password", payload),
};