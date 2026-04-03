import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import SelectSchool from './pages/SelectSchool';
import PendingApproval from './pages/PendingApproval';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import VerifyEmailPage from './pages/VerifyEmailPage';
import UserManagement from './pages/Admin/UserManagement';

/**
 * Componente para proteger rutas privadas.
 * Redirige al login si el usuario no está autenticado.
 * Intercepta si el usuario requiere verificar su email.
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-50">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-secondary-600 font-medium">Cargando sistema...</p>
            </div>
        </div>
    );

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    // Admins saltan el flujo de aprobación escolar por ahora
    if (user?.es_administrador) {
        return <Layout>{children}</Layout>;
    }

    // 1. Verificación de Email (Redirigir al perfil si no está verificado)
    if (!user?.email_verified_at && location.pathname !== '/profile') {
        return <Navigate to="/profile" replace />;
    }

    // 2. Permitir siempre acceso al Perfil si está autenticado
    if (location.pathname === '/profile') {
        return <Layout>{children}</Layout>;
    }

    // 3. Rutas de flujo de selección/aprobación (se permiten a sí mismas)
    if (location.pathname === '/select-school' || location.pathname === '/pending-approval') {
        return <Layout>{children}</Layout>;
    }

    // 4. Restricción de Acceso para el resto de las rutas (ej: Dashboard)
    // Si no está activo, lo mandamos al perfil para que vea su estado
    if (user?.estado !== 'activo') {
        return <Navigate to="/profile" replace />;
    }

    return <Layout>{children}</Layout>;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Rutas Públicas */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Ruta de Verificación de Email (Pública) */}
                    <Route path="/verificar-email" element={<VerifyEmailPage />} />

                    {/* Rutas de Flujo de Escuela (Envueltas en ProtectedRoute) */}
                    <Route 
                        path="/select-school" 
                        element={
                            <ProtectedRoute>
                                <SelectSchool />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/pending-approval" 
                        element={
                            <ProtectedRoute>
                                <PendingApproval />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Rutas Protegidas principales */}
                    <Route 
                        path="/" 
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        } 
                    />
                    
                    <Route 
                        path="/profile" 
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Rutas de Administración */}
                    <Route 
                        path="/admin/usuarios" 
                        element={
                            <ProtectedRoute>
                                <UserManagement />
                            </ProtectedRoute>
                        } 
                    />
   
                    {/* Redirección por defecto */} 
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
