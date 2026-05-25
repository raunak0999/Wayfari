import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import AnimatedLayout from './components/AnimatedLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { TripProvider } from './context/TripContext';
import { BuddyProvider } from './context/BuddyContext';
import ErrorBoundary from './components/ErrorBoundary';

import Navbar from './components/Navbar';
import CustomCursor from './components/CustomCursor';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import FindBuddiesPage from './pages/FindBuddiesPage';
import MyTripsPage from './pages/MyTripsPage';
import SafetyHubPage from './pages/SafetyHubPage';
import BuddyProfilePage from './pages/BuddyProfilePage';
import ChatPage from './pages/ChatPage';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const hideNavbar = ['/auth', '/profile-setup'].includes(location.pathname);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/find-buddies" replace /> : <LandingPage />} />
        <Route path="/auth" element={user ? <Navigate to="/find-buddies" replace /> : <AuthPage />} />
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProfileSetupPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/find-buddies"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <FindBuddiesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-trips"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MyTripsPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/safety-hub"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <SafetyHubPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/buddy/:id"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <BuddyProfilePage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ChatPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <BuddyProvider>
            <TripProvider>
              <ChatProvider>
                <AnimatedLayout>
                  <AppRoutes />
                </AnimatedLayout>
              </ChatProvider>
            </TripProvider>
          </BuddyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
