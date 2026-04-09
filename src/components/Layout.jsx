import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Layout principal que envuelve las páginas protegidas.
 * Incluye un Sidebar para navegación y un Navbar superior con menú de usuario.
 */
const Layout = ({ children }) => {
    const { user, logout, notification, clearNotification } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        setIsUserMenuOpen(false);
        await logout();
        navigate('/login');
    };

    // Cerrar menú de usuario al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
        { name: 'Dashboard', path: '/', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )},
        { name: 'Perfil', path: '/profile', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        )},
    ];

    // Módulos Administrativos
    if (useAuth().hasPermission('sistema.usuarios')) {
        navItems.push({ 
            name: 'Gestión de Usuarios', 
            path: '/admin/usuarios', 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        });
    }

    // Gestión Académica
    if (useAuth().hasPermission('planes.ver')) {
        navItems.push({ 
            name: 'Planes de Estudio', 
            path: '/academic/planes', 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        });
    }

    return (
        <div className="min-h-screen bg-secondary-50 flex font-sans">
            {/* Global Notifications (Toasts) */}
            {notification && (
                <div className="fixed top-20 right-8 z-[100] max-w-sm w-full animate-fadeInRight">
                    <div className={`p-4 rounded-2xl shadow-2xl border-l-4 flex items-start gap-4 ${
                        notification.type === 'success' 
                        ? 'bg-white border-green-500 text-secondary-900' 
                        : 'bg-white border-red-500 text-secondary-900'
                    }`}>
                        <div className={`p-2 rounded-xl shrink-0 ${
                            notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                            {notification.type === 'success' ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div className="flex-grow pt-0.5">
                            <p className="text-sm font-bold leading-tight">
                                {notification.type === 'success' ? 'Éxito' : 'Error'}
                            </p>
                            <p className="text-xs text-secondary-600 mt-1 font-medium leading-relaxed">
                                {notification.message}
                            </p>
                        </div>
                        <button 
                            onClick={clearNotification}
                            className="text-secondary-400 hover:text-secondary-600 transition-colors shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-secondary-900 text-white transition-all duration-300 flex flex-col shadow-xl`}>
                <div className="p-6 flex items-center justify-between border-b border-secondary-800">
                    {isSidebarOpen && <span className="text-xl font-bold text-primary-400">SGEI</span>}
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-1 hover:bg-secondary-800 rounded transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-grow mt-6 px-3">
                    <ul className="space-y-2">
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <Link 
                                    to={item.path}
                                    className={`flex items-center p-3 rounded-lg transition-colors ${
                                        location.pathname === item.path 
                                        ? 'bg-primary-600 text-white shadow-md' 
                                        : 'text-secondary-400 hover:bg-secondary-800 hover:text-white'
                                    }`}
                                >
                                    {item.icon}
                                    {isSidebarOpen && <span className="ml-4 font-medium">{item.name}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-secondary-800">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center p-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {isSidebarOpen && <span className="ml-4 font-medium">Salir</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col">
                {/* Navbar */}
                <header className="h-16 bg-white border-b border-secondary-200 flex items-center justify-between px-8 shadow-sm">
                    <div className="flex items-center">
                        <h2 className="text-secondary-800 font-semibold text-lg">
                            {navItems.find(i => i.path === location.pathname)?.name || 'SGEI'}
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-4 relative" ref={userMenuRef}>
                        <button 
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-3 p-1.5 hover:bg-secondary-50 rounded-xl transition-all border border-transparent hover:border-secondary-200 group"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">{user?.nombre}</p>
                                <p className="text-[12px] text-secondary-500 font-medium tracking-wider">{user?.email}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border-2 border-primary-200 overflow-hidden shadow-sm group-hover:border-primary-400 transition-all">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user?.nombre?.charAt(0)}</span>
                                )}
                            </div>
                            <svg className={`w-4 h-4 text-secondary-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-secondary-200 rounded-2xl shadow-2xl py-2 z-50 animate-fadeInUp animate-duration-200">
                                <div className="px-4 py-3 border-b border-secondary-100 mb-1">
                                    <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-1">Cuenta</p>
                                    <p className="text-sm font-bold text-secondary-900 truncate">{user?.nombre}</p>
                                </div>
                                
                                <Link 
                                    to="/profile" 
                                    onClick={() => setIsUserMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary-700 hover:bg-primary-50 hover:text-primary-700 transition-colors font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Mi Perfil
                                </Link>

                                <div className="border-t border-secondary-100 mt-1 pt-1">
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Content */}
                <main className="flex-grow p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
