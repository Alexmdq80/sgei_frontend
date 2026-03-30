import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    /**
     * Inicia sesión con credenciales.
     * @param {Object} credentials { email, password }
     */
    const login = async (credentials) => {
        const data = await authService.login(credentials);
        setUser(data.user);
        return data;
    };

    /**
     * Cierra la sesión activa.
     */
    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.warn('Sesión ya expirada o error en logout:', error);
        } finally {
            setUser(null);
            // Limpiar explícitamente cualquier estado residual en el navegador si fuera necesario
            // sessionStorage.clear(); // Opcional
            window.location.href = '/login'; // Forzamos recarga para limpiar memoria React
        }
    };

    /**
     * Verifica el estado actual del usuario al cargar la aplicación.
     */
    const checkAuth = async () => {
        try {
            const data = await authService.me();
            setUser(data.user);
        } catch (error) {
            // Solo cerramos sesión si el error es 401 (No autorizado)
            if (error.response?.status === 401) {
                setUser(null);
            }
            console.error("Error en checkAuth:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const value = {
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
