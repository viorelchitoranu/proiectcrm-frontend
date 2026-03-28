import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import EnrollmentPage              from "./pages/EnrollmentPage.jsx";
import WaitlistPage                from "./pages/WaitlistPage.jsx";
import LoginPage                   from "./pages/LoginPage.jsx";

import AdminLayout                 from "./layouts/AdminLayout.jsx";
import AdminDashboard              from "./pages/AdminDashboard.jsx";
import AdminChildren               from "./pages/AdminChildren.jsx";
import AdminSchools                from "./pages/AdminSchools.jsx";
import AdminCourses                from "./pages/AdminCourses.jsx";
import AdminTeachers               from "./pages/AdminTeachers.jsx";
import AdminHolidays               from "./pages/AdminHolidays.jsx";
import AdminAttendanceArchivePage  from "./pages/AdminAttendanceArchivePage.jsx";
import AdminParentsPage            from "./pages/AdminParentsPage.jsx";
import AdminWaitlistPage           from "./pages/AdminWaitlistPage.jsx";
import AdminMessageBoardPage       from "./pages/AdminMessageBoardPage.jsx";
import AdminEmailTemplatesPage     from "./pages/AdminEmailTemplatesPage.jsx";
import AdminDashboardPage          from "./pages/AdminDashboardPage.jsx";
import AdminCalendarPage           from "./pages/AdminCalendarPage.jsx";
import AdminReportsEnhanced        from "./pages/AdminReportsEnhanced.jsx";

import TeacherLayout               from "./layouts/TeacherLayout.jsx";
import TeacherGroupsPage           from "./pages/TeacherGroupsPage.jsx";
import TeacherGroupSessionsPage    from "./pages/TeacherGroupSessionsPage.jsx";
import TeacherRequestsPage         from "./pages/TeacherRequestsPage.jsx";
import TeacherChangePasswordPage   from "./pages/TeacherChangePasswordPage.jsx";
import TeacherMessageBoardPage     from "./pages/TeacherMessageBoardPage.jsx";
import TeacherCalendarPage         from "./pages/TeacherCalendarPage.jsx";

import ParentLayout                from "./layouts/ParentLayout.jsx";
import ParentChildrenPage          from "./pages/ParentChildrenPage.jsx";
import ParentChildEnrollmentsPage  from "./pages/ParentChildEnrollmentsPage.jsx";
import ParentSchedulePage          from "./pages/ParentSchedulePage.jsx";
import ParentGroupSchedulePage     from "./pages/ParentGroupSchedulePage.jsx";
import ParentChangePasswordPage    from "./pages/ParentChangePasswordPage.jsx";
import ParentMessageBoardPage      from "./pages/ParentMessageBoardPage.jsx";
import ParentCalendarPage          from "./pages/ParentCalendarPage.jsx";

import ProtectedRoute              from "./auth/ProtectedRoute.jsx";
import { authApi }                 from "./auth/authApi.js";
import { clearSession, saveSession, isRememberedSession } from "./auth/session.jsx";
import ErrorBoundary               from "./ErrorBoundary.jsx";

export default function App() {
    const [bootstrapping, setBootstrapping] = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const me = await authApi.me();
                if (!active) return;
                saveSession(
                    { userId: me.userId, role: me.role, firstName: me.firstName, lastName: me.lastName },
                    isRememberedSession()
                );
            } catch {
                if (!active) return;
                clearSession();
            } finally {
                if (active) setBootstrapping(false);
            }
        })();
        return () => { active = false; };
    }, []);

    if (bootstrapping) return null;

    return (
        <Routes>
            <Route path="/"       element={<Navigate to="/enroll" replace />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/enroll" element={<EnrollmentPage />} />
            <Route path="/login"  element={<LoginPage />} />

            {/* ADMIN */}
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowRoles={["ADMIN"]}>
                        <ErrorBoundary section="AdminLayout">
                            <AdminLayout />
                        </ErrorBoundary>
                    </ProtectedRoute>
                }
            >
                <Route index                     element={<AdminDashboard />} />
                <Route path="children"           element={<AdminChildren />} />
                <Route path="schools"            element={<AdminSchools />} />
                <Route path="courses"            element={<AdminCourses />} />
                <Route path="teachers"           element={<AdminTeachers />} />
                <Route path="holidays"           element={<AdminHolidays />} />
                <Route path="attendance-archive" element={<AdminAttendanceArchivePage />} />
                <Route path="parents"            element={<AdminParentsPage />} />
                <Route path="waitlist"           element={<AdminWaitlistPage />} />
                <Route path="board"              element={<AdminMessageBoardPage />} />
                <Route path="/admin/email-templates" element={<AdminEmailTemplatesPage />} />
                <Route path="charts"             element={<AdminDashboardPage />} />
                <Route path="calendar"           element={<AdminCalendarPage />} />
                <Route path="reports"            element={<AdminReportsEnhanced />} />
            </Route>

            {/* TEACHER */}
            <Route
                path="/teacher"
                element={
                    <ProtectedRoute allowRoles={["TEACHER"]}>
                        <TeacherLayout />
                    </ProtectedRoute>
                }
            >
                <Route index                              element={<Navigate to="groups" replace />} />
                <Route path="groups"                      element={<TeacherGroupsPage />} />
                <Route path="groups/:groupId/sessions"    element={<TeacherGroupSessionsPage />} />
                <Route path="requests"                    element={<TeacherRequestsPage />} />
                <Route path="password"                    element={<TeacherChangePasswordPage />} />
                <Route path="board"                       element={<TeacherMessageBoardPage />} />
                <Route path="calendar"                    element={<TeacherCalendarPage />} />
            </Route>

            {/* PARENT */}
            <Route
                path="/parent"
                element={
                    <ProtectedRoute allowRoles={["PARENT"]}>
                        <ParentLayout />
                    </ProtectedRoute>
                }
            >
                <Route index                                    element={<ParentChildrenPage />} />
                <Route path="children"                          element={<ParentChildrenPage />} />
                <Route path="children/:childId/enrollments"     element={<ParentChildEnrollmentsPage />} />
                <Route path="schedule"                          element={<ParentSchedulePage />} />
                <Route path="schedule/:childId/:groupId"        element={<ParentGroupSchedulePage />} />
                <Route path="password"                          element={<ParentChangePasswordPage />} />
                <Route path="board"                             element={<ParentMessageBoardPage />} />
                <Route path="calendar"                          element={<ParentCalendarPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}
