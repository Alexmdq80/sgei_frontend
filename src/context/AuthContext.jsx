import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [activeProfile, setActiveProfile] = useState(() => {
        const saved = localStorage.getItem('activeProfile');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

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
     * Selecciona el perfil activo (Escuela + Rol) para la sesión.
     */
    const selectProfile = (profile) => {
        setActiveProfile(profile);
        if (profile) {
            localStorage.setItem('activeProfile', JSON.stringify(profile));
            // Opcional: Recargar permisos del usuario basados en este perfil si el backend lo requiere
        } else {
            localStorage.removeItem('activeProfile');
        }
    };

    /**
     * Verifica si el usuario tiene un permiso en el contexto del perfil activo.
     */
    const hasPermission = (permission) => {
        if (!user) return false;
        if (user.es_administrador || user.roles?.some(r => r.name === 'superuser')) return true;
        
        // Si hay un perfil activo, verificar los permisos de ese rol específico
        if (activeProfile?.role?.permissions) {
            return activeProfile.role.permissions.includes(permission);
        }

        // Fallback a permisos globales si no hay perfil (ej. gestión de cuenta propia)
        return user.permissions?.includes(permission) || false;
    };

    /**
     * Inicia sesión con credenciales.
     */
    const login = async (credentials) => {
        const data = await authService.login(credentials);
        setUser(data.user);
        // Al loguear, reseteamos el perfil activo para obligar a seleccionar uno
        selectProfile(null);
        return data;
    };

    /**
     * Cierra la sesión activa.
     */
    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.warn('Sesión ya expirada:', error);
        } finally {
            setUser(null);
            selectProfile(null);
            window.location.href = '/login';
        }
    };

    const checkAuth = async () => {
        try {
            const data = await authService.me();
            setUser(data.user);
            
            // Si el perfil guardado ya no es válido para este usuario, limpiarlo
            if (activeProfile && !data.user.escuela_usuarios?.some(link => 
                link.escuela_id === activeProfile.escuela_id && 
                link.role_id === activeProfile.role_id && 
                link.verified_at
            )) {
                selectProfile(null);
            }
        } catch (error) {
            if (error.response?.status === 401) {
                setUser(null);
                selectProfile(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const value = {
        user,
        activeProfile,
        selectProfile,
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
