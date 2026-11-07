import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import StaffLogin from './pages/staff/StaffLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminCategories from './pages/admin/AdminCategories.jsx';
import AdminMenus from './pages/admin/AdminMenus.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminFavorites from './pages/admin/AdminFavorites.jsx';
import KasirDashboard from './pages/kasir/KasirDashboard.jsx';

function Protected({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/kasir'} replace />;
  }
  return children;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/kasir'} replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Login pilih role */}
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/kasir'} replace /> : <StaffLogin />}
      />

      {/* Admin */}
      <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
      <Route path="/admin/kategori" element={<Protected role="admin"><AdminCategories /></Protected>} />
      <Route path="/admin/menu" element={<Protected role="admin"><AdminMenus /></Protected>} />
      <Route path="/admin/user" element={<Protected role="admin"><AdminUsers /></Protected>} />
      <Route path="/admin/laporan" element={<Protected role="admin"><AdminReports /></Protected>} />
      <Route path="/admin/menu-favorit" element={<Protected role="admin"><AdminFavorites /></Protected>} />

      {/* Kasir */}
      <Route path="/kasir" element={<Protected role="kasir"><KasirDashboard /></Protected>} />

      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
