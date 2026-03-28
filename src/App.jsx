import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import VerifyEmailPage from './pages/VerifyEmailPage';

/**
 * Componente para proteger rutas privadas.
 * Redirige al login si el usuario no está autenticado.
 * Intercepta si el usuario requiere verificar su email.
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, user, loading } = useAuth();

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

    // Lógica de Verificación de Email
    // Solo se obliga a usuarios normales (no administradores)
    if (!user?.es_administrador && !user?.email_verified_at) {
        return <VerifyEmail />;
    }

    return <Layout>{children}</Layout>;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Ruta de Login */}
                    <Route path="/login" element={<Login />} />

                    {/* Ruta de Verificación de Email (Pública) */}
                    <Route path="/verificar-email" element={<VerifyEmailPage />} />

                    {/* Rutas Protegidas (envueltas por ProtectedRoute que ahora incluye Layout) */}
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
   
                    {/* Redirección por defecto */} 
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
