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
            setUser(null);
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
