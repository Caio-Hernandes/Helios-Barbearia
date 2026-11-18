import { BrowserRouter, Route, Routes } from 'react-router';
import { AppLayout } from './components/layout/AppLayout';
import { HomeRedirect, ProtectedRoute, PublicOnlyRoute } from './components/routing/ProtectedRoute';
import { AuthProvider } from './contexts/AuthProvider';
import { ThemeProvider } from './contexts/ThemeProvider';
import { AuthPage } from './pages/AuthPage';
import { BookingPage } from './pages/BookingPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SchedulePage } from './pages/SchedulePage';
import { WorkSchedulePage } from './pages/WorkSchedulePage';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <AuthPage />
                </PublicOnlyRoute>
              }
            />

            {/* Tudo abaixo exige login */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<HomeRedirect />} />

                <Route element={<ProtectedRoute roles={['CLIENT']} />}>
                  <Route path="agendar" element={<BookingPage />} />
                  <Route path="meus-agendamentos" element={<MyAppointmentsPage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['EMPLOYEE', 'OWNER']} />}>
                  <Route path="agenda" element={<SchedulePage />} />
                  <Route path="expediente" element={<WorkSchedulePage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['OWNER']} />}>
                  <Route path="painel" element={<DashboardPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
