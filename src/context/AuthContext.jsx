import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: string }

    /**
     * Muestra una notificación temporal en el sistema.
     */
    const showNotification = (message, type = 'success', duration = 5000) => {
        setNotification({ message, type });
        if (duration) {
            setTimeout(() => {
                setNotification(null);
            }, duration);
        }
    };

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

    /**
     * Verifica si el usuario tiene un permiso específico.
     * @param {string} permission 
     * @returns {boolean}
     */
    const hasPermission = (permission) => {
        if (!user) return false;
        if (user.es_administrador) return true; // Super Admin bypass
        return user.permissions?.includes(permission) || false;
    };

    const value = {
        user,
        isAuthenticated: !!user,
        loading,
        notification,
        showNotification,
        clearNotification: () => setNotification(null),
        login,
        logout,
        checkAuth,
        hasPermission
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
