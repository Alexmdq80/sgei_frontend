import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Profile from './pages/Profile';

// ***prueba
//import { useEffect } from 'react';
//import api, { BACKEND_URL } from "./services/api"; // Importa tu configuración de axios
//import axios from 'axios';

/*** */
/**
 * Componente para proteger rutas privadas.
 * Redirige al login si el usuario no está autenticado.
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    return isAuthenticated ? children : <Navigate to="/login" />;
};

/**
 * Componente provisional para el Dashboard/Home.
 */
const Dashboard = () => {
    const { user, logout } = useAuth();
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
                <div className="flex gap-4">
                    <Link 
                        to="/profile" 
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                        Mi Perfil
                    </Link>
                    <button 
                        onClick={logout}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold mb-2 text-gray-700">Bienvenido, {user?.name || 'Usuario'}</h2>
                <p className="text-gray-600">Has ingresado correctamente al SGEI. Desde aquí podrás gestionar las operaciones escolares.</p>
            </div>
        </div>
    );
};

/*function App() {
    useEffect(() => {
        const runDebug = async () => {
            console.log("--- INICIANDO DIAGNÓSTICO SGEI ---");
            try {
                // 1. Solicitar el token y la cookie inicial
                // Usamos axios directo para asegurar que la URL sea la base
                await axios.get(`${BACKEND_URL}/sanctum/csrf-cookie`, { withCredentials: true });
                console.log("Step 1: CSRF Cookie solicitada con éxito.");

                // 2. Primera llamada para obtener el ID de sesión
                const res1 = await api.get('/check-id');
                const id1 = res1.data;
                console.log("Step 2: Primer Session ID ->", id1);

                // 3. Segunda llamada para comparar
                const res2 = await api.get('/check-id');
                const id2 = res2.data;
                console.log("Step 3: Segundo Session ID ->", id2);

                // Verificación lógica
                if (id1 === id2 && id1 !== undefined) {
                    console.log("%c✅ SESIÓN ESTABLE: El ID no cambia. El problema es el Token CSRF.", "color: green; font-weight: bold;");
                } else {
                    console.log("%c❌ SESIÓN INESTABLE: El ID cambia. El navegador NO está guardando o enviando la cookie de sesión.", "color: red; font-weight: bold;");
                }
            } catch (err) {
                console.error("Error durante el diagnóstico:", err.response?.data || err.message);
            }
        };

        runDebug();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Panel de Diagnóstico SGEI</h1>
            <p>Abre la consola del navegador (F12) para ver los resultados.</p>
        </div>
    );
}

export default App;*/


function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Ruta de Login */}
                    <Route path="/login" element={<Login />} />

                    {/* Rutas Protegidas */}
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
