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
import LectivoManagement from './pages/Admin/LectivoManagement';
import AnioManagement from './pages/Admin/AnioManagement';
import AmbitoManagement from './pages/Admin/AmbitoManagement';
import CierreCausaManagement from './pages/Admin/CierreCausaManagement';
import CondicionManagement from './pages/Admin/CondicionManagement';
import DependenciaManagement from './pages/Admin/DependenciaManagement';
import EscuelaTipoManagement from './pages/Admin/EscuelaTipoManagement';
import EscuelaManagement from './pages/Admin/EscuelaManagement';
import ModalidadNivelManagement from './pages/Admin/ModalidadNivelManagement';
import NivelManagement from './pages/Admin/NivelManagement';
import ModalidadManagement from './pages/Admin/ModalidadManagement';
import OfertaManagement from './pages/Admin/OfertaManagement';
import EscuelaUbicacionManagement from './pages/Admin/EscuelaUbicacionManagement';
import DocumentoSituacionManagement from './pages/Admin/DocumentoSituacionManagement';
import DocumentoTipoManagement from './pages/Admin/DocumentoTipoManagement';
import GeneroManagement from './pages/Admin/GeneroManagement';
import SexoManagement from './pages/Admin/SexoManagement';
import ContinenteManagement from './pages/Admin/ContinenteManagement';
import NacionManagement from './pages/Admin/NacionManagement';
import ProvinciaManagement from './pages/Admin/ProvinciaManagement';
import DepartamentoManagement from './pages/Admin/DepartamentoManagement';
import LocalidadManagement from './pages/Admin/LocalidadManagement';
import MunicipioManagement from './pages/Admin/MunicipioManagement';
import LocalidadCensalManagement from './pages/Admin/LocalidadCensalManagement';
import GeorefFuenteManagement from './pages/Admin/GeorefFuenteManagement';
import GeorefCategoriaManagement from './pages/Admin/GeorefCategoriaManagement';
import GeorefFuncionManagement from './pages/Admin/GeorefFuncionManagement';
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
                        path="/admin/general/cargos" 
                        element={
                            <ProtectedRoute>
                                <CargoManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/ciclos" 
                        element={
                            <ProtectedRoute>
                                <LectivoManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/ambitos" 
                        element={
                            <ProtectedRoute>
                                <AmbitoManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/cierre-causas" 
                        element={
                            <ProtectedRoute>
                                <CierreCausaManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/condiciones" 
                        element={
                            <ProtectedRoute>
                                <CondicionManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/dependencias" 
                        element={
                            <ProtectedRoute>
                                <DependenciaManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/escuela-tipos" 
                        element={
                            <ProtectedRoute>
                                <EscuelaTipoManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/niveles" 
                        element={
                            <ProtectedRoute>
                                <NivelManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/modalidades" 
                        element={
                            <ProtectedRoute>
                                <ModalidadManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/ofertas" 
                        element={
                            <ProtectedRoute>
                                <OfertaManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/modalidad-niveles" 
                        element={
                            <ProtectedRoute>
                                <ModalidadNivelManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/escuela-ubicaciones" 
                        element={
                            <ProtectedRoute>
                                <EscuelaUbicacionManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/documento-situacions" 
                        element={
                            <ProtectedRoute>
                                <DocumentoSituacionManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/documento-tipos" 
                        element={
                            <ProtectedRoute>
                                <DocumentoTipoManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/generos" 
                        element={
                            <ProtectedRoute>
                                <GeneroManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/sexos" 
                        element={
                            <ProtectedRoute>
                                <SexoManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/continentes" 
                        element={
                            <ProtectedRoute>
                                <ContinenteManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/naciones" 
                        element={
                            <ProtectedRoute>
                                <NacionManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/provincias" 
                        element={
                            <ProtectedRoute>
                                <ProvinciaManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/departamentos" 
                        element={
                            <ProtectedRoute>
                                <DepartamentoManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/municipios" 
                        element={
                            <ProtectedRoute>
                                <MunicipioManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/localidades" 
                        element={
                            <ProtectedRoute>
                                <LocalidadManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/localidad-censals" 
                        element={
                            <ProtectedRoute>
                                <LocalidadCensalManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/georef-fuentes" 
                        element={
                            <ProtectedRoute>
                                <GeorefFuenteManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/georef-categorias" 
                        element={
                            <ProtectedRoute>
                                <GeorefCategoriaManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/georef-funcions" 
                        element={
                            <ProtectedRoute>
                                <GeorefFuncionManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/general/escuelas" 
                        element={
                            <ProtectedRoute>
                                <EscuelaManagement />
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

                    {/* Rutas de Gestión Curricular */}
                    <Route 
                        path="/admin/curricular/anios" 
                        element={
                            <ProtectedRoute>
                                <AnioManagement />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/admin/curricular/planes" 
                        element={
                            <ProtectedRoute>
                                <PlanManagement />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Rutas de Gestión Académica */}
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
