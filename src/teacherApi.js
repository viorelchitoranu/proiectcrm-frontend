import { http } from "./http.jsx";

export const teacherApi = {
    // =========================
    // Groups
    // =========================
    getTeacherGroups: () =>
        http.get("/api/teacher"),

    getActiveTeacherGroups: () =>
        http.get("/api/teacher/groups/active"),

    getFinishedTeacherGroups: () =>
        http.get("/api/teacher/groups/finished"),

    startGroup: (groupId) =>
        http.post(`/api/teacher/groups/${groupId}/start`),

    // =========================
    // Sessions
    // =========================
    getGroupSessions: (groupId) =>
        http.get(`/api/teacher/groups/${groupId}/sessions`),

    getSessionAttendance: (groupId, sessionId) =>
        http.get(`/api/teacher/groups/${groupId}/sessions/${sessionId}/attendance`),

    updateSessionAttendance: (groupId, sessionId, payload) =>
        http.post(`/api/teacher/groups/${groupId}/sessions/${sessionId}/attendance`, payload),

    // =========================
    // Parent requests
    // =========================
    getParentRequests: (type) =>
        http.get("/api/teacher/requests", type ? { type } : undefined),

    getRecoveryTargetSessions: (attendanceId) =>
        http.get(`/api/teacher/requests/${attendanceId}/recovery-target-sessions`),

    allocateRecovery: (attendanceId, payload) =>
        http.post(`/api/teacher/requests/${attendanceId}/allocate-recovery`, payload),

    confirmCancel: (attendanceId) =>
        http.post(`/api/teacher/requests/${attendanceId}/confirm-cancel`),

    // =========================
    // Password
    // =========================
    changeOwnPassword: (payload) =>
        http.put("/api/teacher/password", payload),
};
