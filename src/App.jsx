import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import EnrollmentPage              from "./pages/EnrollmentPage.jsx";
import WaitlistPage                from "./pages/WaitlistPage.jsx";          // NOU
import LoginPage                   from "./pages/LoginPage.jsx";

import AdminLayout                 from "./layouts/AdminLayout.jsx";
import AdminDashboard              from "./pages/AdminDashboard.jsx";
import AdminChildren               from "./pages/AdminChildren.jsx";
import AdminSchools                from "./pages/AdminSchools.jsx";
import AdminCourses                from "./pages/AdminCourses.jsx";
import AdminTeachers               from "./pages/AdminTeachers.jsx";
import AdminHolidays               from "./pages/AdminHolidays.jsx";
import AdminReports                from "./pages/AdminReports.jsx";
import AdminAttendanceArchivePage  from "./pages/AdminAttendanceArchivePage.jsx";
import AdminParentsPage            from "./pages/AdminParentsPage.jsx";
import AdminLogsPage               from "./pages/AdminLogsPage.jsx";  // NOU
import AdminWaitlistPage           from "./pages/AdminWaitlistPage.jsx";     // NOU
import AdminMessageBoardPage       from "./pages/AdminMessageBoardPage.jsx";   // NOU

import TeacherLayout               from "./layouts/TeacherLayout.jsx";
import TeacherGroupsPage           from "./pages/TeacherGroupsPage.jsx";
import TeacherGroupSessionsPage    from "./pages/TeacherGroupSessionsPage.jsx";
import TeacherRequestsPage         from "./pages/TeacherRequestsPage.jsx";
import TeacherChangePasswordPage   from "./pages/TeacherChangePasswordPage.jsx";
import TeacherMessageBoardPage     from "./pages/TeacherMessageBoardPage.jsx"; // NOU

import ParentLayout                from "./layouts/ParentLayout.jsx";
import ParentChildrenPage          from "./pages/ParentChildrenPage.jsx";
import ParentChildEnrollmentsPage  from "./pages/ParentChildEnrollmentsPage.jsx";
import ParentSchedulePage          from "./pages/ParentSchedulePage.jsx";
import ParentGroupSchedulePage     from "./pages/ParentGroupSchedulePage.jsx";
import ParentChangePasswordPage    from "./pages/ParentChangePasswordPage.jsx";
import ParentMessageBoardPage      from "./pages/ParentMessageBoardPage.jsx";  // NOU

import ProtectedRoute              from "./auth/ProtectedRoute.jsx";
import { authApi }                 from "./auth/authApi.js";
import { clearSession, saveSession, isRememberedSession } from "./auth/session.jsx";
import ErrorBoundary               from "./ErrorBoundary.jsx";  // NOU

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
            {/* Rută publică — accesibilă fără autentificare, linkuită din EnrollmentPage */}
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/enroll" element={<EnrollmentPage />} />
            <Route path="/login"  element={<LoginPage />} />

            {/* ADMIN */}
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowRoles={["ADMIN"]}>
                        {/*
                            ErrorBoundary la nivel de layout admin:
                            orice crash JavaScript în orice pagină de admin va fi
                            interceptat, logat la backend și afișat ca mesaj prietenos.
                            Nu mai există ecran alb pentru admin.
                        */}
                        <ErrorBoundary section="AdminLayout">
                            <AdminLayout />
                        </ErrorBoundary>
                    </ProtectedRoute>
                }
            >
                <Route index                    element={<AdminDashboard />} />
                <Route path="children"          element={<AdminChildren />} />
                <Route path="schools"           element={<AdminSchools />} />
                <Route path="courses"           element={<AdminCourses />} />
                <Route path="teachers"          element={<AdminTeachers />} />
                <Route path="holidays"          element={<AdminHolidays />} />
                <Route path="reports"           element={<AdminReports />} />
                <Route path="attendance-archive" element={<AdminAttendanceArchivePage />} />
                <Route path="parents"           element={<AdminParentsPage />} />
                <Route path="waitlist"           element={<AdminWaitlistPage />} />  {/* NOU */}
                {/* NOU: pagina de loguri server */}
                <Route path="logs"              element={<AdminLogsPage />} />
                {/* NOU: Forum admin — acces la toate canalele */}
                <Route path="board"              element={<AdminMessageBoardPage />} />
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
                {/* NOU: Forum teacher — GENERAL + ANNOUNCEMENTS + grupele proprii */}
                <Route path="board"                    element={<TeacherMessageBoardPage />} />
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
                {/* NOU: Forum parent — GENERAL + ANNOUNCEMENTS + grupele copiilor */}
                <Route path="board"                           element={<ParentMessageBoardPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}
