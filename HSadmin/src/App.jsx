import { Navigate, Route, Routes } from "react-router-dom";

import AdminShell from "./components/layout/AdminShell";
import { useAuth } from "./hooks/useAuth";
import CommunityDiscovery from "./pages/CommunityDiscovery";
import Dashboard from "./pages/Dashboard";
import Heritage from "./pages/Heritage";
import JanPukaar from "./pages/JanPukaar";
import LocationManager from "./pages/LocationManager";
import Login from "./pages/Login";
import Operations from "./pages/Operations";
import Settings from "./pages/Settings";
import Users from "./pages/Users";

function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated && (user?.role === "admin" || user?.is_admin) ? <AdminShell /> : <Navigate replace to="/login" />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        element={isAuthenticated ? <Navigate replace to="/" /> : <Login />}
        path="/login"
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<Dashboard />} path="/" />
        <Route element={<JanPukaar />} path="/jan-pukaar" />
        <Route element={<Operations />} path="/operations" />
        <Route element={<CommunityDiscovery />} path="/community" />
        <Route element={<Heritage />} path="/heritage" />
        <Route element={<LocationManager />} path="/locations" />
        <Route element={<Users />} path="/users" />
        <Route element={<Settings />} path="/settings" />
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}
