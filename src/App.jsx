import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import SelectSchool from './pages/SelectSchool';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import VerifyEmailPage from './pages/VerifyEmailPage';
import UserManagement from './pages/Admin/UserManagement';
import CupofManagement from './pages/Admin/CupofManagement';
import PersonaManagement from './pages/Admin/PersonaManagement';
import CargoManagement from './pages/Admin/CargoManagement';
import PlanManagement from './pages/Academic/PlanManagement';
import PropuestaManagement from './pages/Academic/PropuestaManagement';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

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

    // 1. Bypass de Seguridad (Superusuario tiene acceso total inmediato)
    const isSuperUser = user?.es_administrador || user?.roles?.some(r => r.name === 'superuser');
    if (isSuperUser) {
        return <Layout>{children}</Layout>;
    }

    // 2. Verificación de Email (OBLIGATORIO PARA EL RESTO)
    // Redirigir al perfil si no está verificado
    if (!user?.email_verified_at && location.pathname !== '/profile') {
        return <Navigate to="/profile" replace />;
    }

    // 3. Usuarios Especiales (Bypass de Vinculación Escolar Post-Verificación)
    // Una vez verificado el email, los Supervisores Curriculares y Jefe Distrital tienen acceso total
    const isSpecialUser = user?.roles?.some(r => r.name === 'supervisor_curricular' || r.name === 'jefe_distrital');
    if (isSpecialUser) {
        return <Layout>{children}</Layout>;
    }

    // 3. Permitir siempre acceso al Perfil si está autenticado y verificado
    if (location.pathname === '/profile') {
        return <Layout>{children}</Layout>;
    }

    // 4. Rutas de flujo de selección (se permite a sí misma para usuarios regulares)
    if (location.pathname === '/select-school') {
        return <Layout>{children}</Layout>;
    }

    // 5. Restricción de Acceso para el resto de las rutas (Usuarios Regulares)
    // Si no tiene perfil activo (contexto institucional), lo mandamos a seleccionar uno
    const activeLinks = user?.escuela_usuarios?.filter(l => l.verified_at) || [];
    if (activeLinks.length > 0 && !localStorage.getItem('activeProfile')) {
        return <Navigate to="/select-school" replace />;
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
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

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
                    
                    <Route 
                        path="/admin/cupofs" 
                        element={
                            <ProtectedRoute>
                                <CupofManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/cargos" 
                        element={
                            <ProtectedRoute>
                                <CargoManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/personas" 
                        element={
                            <ProtectedRoute>
                                <PersonaManagement />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Rutas de Gestión Académica */}
                    <Route 
                        path="/academic/planes" 
                        element={
                            <ProtectedRoute>
                                <PlanManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/academic/propuestas" 
                        element={
                            <ProtectedRoute>
                                <PropuestaManagement />
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
