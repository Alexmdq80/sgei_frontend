import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Layout principal que envuelve las páginas protegidas.
 * Incluye un Sidebar para navegación y un Navbar superior.
 */
const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

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
        // Aquí se pueden añadir más módulos del sistema
    ];

    return (
        <div className="min-h-screen bg-secondary-50 flex font-sans">
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
                    
                    <div className="flex items-center gap-4">
                        <div className="text-right mr-2 hidden sm:block">
                            <p className="text-sm font-medium text-secondary-900">{user?.nombre} {user?.apellido}</p>
                            <p className="text-xs text-secondary-500">{user?.email}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border-2 border-primary-200 overflow-hidden">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span>{user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}</span>
                            )}
                        </div>
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
