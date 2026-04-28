import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Layout principal que envuelve las páginas protegidas.
 * Incluye un Sidebar para navegación y un Navbar superior con menú de usuario.
 */
const Layout = ({ children }) => {
    const { user, logout, notification, clearNotification, activeProfile, hasPermission } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isGeneralPanelOpen, setIsGeneralPanelOpen] = useState(false);
    const [isInstGroupOpen, setIsInstGroupOpen] = useState(false);
    const [isOfferGroupOpen, setIsOfferGroupOpen] = useState(false);
    const [isPeopleGroupOpen, setIsPeopleGroupOpen] = useState(false);
    const [isDocGroupOpen, setIsDocGroupOpen] = useState(false);
    const [isIdentityGroupOpen, setIsIdentityGroupOpen] = useState(false);
    const [isGeoGroupOpen, setIsGeoGroupOpen] = useState(false);
    const [isOpsGroupOpen, setIsOpsGroupOpen] = useState(false);
    const [isCurricularPanelOpen, setIsCurricularPanelOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    // Abrir automáticamente los paneles si la ruta actual es una de sus subrutas
    useEffect(() => {
        const instPaths = [
            '/admin/general/escuelas',
            '/admin/general/escuela-tipos',
            '/admin/general/dependencias',
            '/admin/general/ambitos',
            '/admin/general/escuela-ubicaciones'
        ];
        const offerPaths = [
            '/admin/general/niveles',
            '/admin/general/modalidades',
            '/admin/general/modalidad-niveles',
            '/admin/general/ofertas'
        ];
        const docPaths = [
            '/admin/general/documento-situacions',
            '/admin/general/documento-tipos'
        ];
        const identityPaths = [
            '/admin/general/generos',
            '/admin/general/sexos'
        ];
        const geoPaths = [
            '/admin/general/continentes',
            '/admin/general/naciones',
            '/admin/general/provincias',
            '/admin/general/departamentos',
            '/admin/general/localidades'
        ];
        const opsPaths = [
            '/admin/general/cargos', 
            '/admin/general/ciclos', 
            '/admin/general/condiciones',
            '/admin/general/cierre-causas'
        ];

        const allGeneralPaths = [...instPaths, ...offerPaths, ...docPaths, ...identityPaths, ...geoPaths, ...opsPaths];

        if (allGeneralPaths.includes(location.pathname)) {
            setIsGeneralPanelOpen(true);
        }
        if (instPaths.includes(location.pathname)) {
            setIsInstGroupOpen(true);
        }
        if (offerPaths.includes(location.pathname)) {
            setIsOfferGroupOpen(true);
        }
        if (docPaths.includes(location.pathname) || identityPaths.includes(location.pathname)) {
            setIsPeopleGroupOpen(true);
            if (docPaths.includes(location.pathname)) setIsDocGroupOpen(true);
            if (identityPaths.includes(location.pathname)) setIsIdentityGroupOpen(true);
        }
        if (geoPaths.includes(location.pathname)) {
            setIsGeoGroupOpen(true);
        }
        if (opsPaths.includes(location.pathname)) {
            setIsOpsGroupOpen(true);
        }

        if (['/admin/curricular/anios', '/admin/curricular/planes'].includes(location.pathname)) {
            setIsCurricularPanelOpen(true);
        }
    }, [location.pathname]);

    const handleLogout = async () => {
        setIsUserMenuOpen(false);
        await logout();
        navigate('/login');
    };

    const handleSwitchProfile = () => {
        setIsUserMenuOpen(false);
        navigate('/select-school');
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

    if (hasPermission('sistema.usuarios') || user?.roles?.some(r => r.name === 'supervisor_curricular')) {
        navItems.push({ 
            name: 'Gestión de Usuarios', 
            path: '/admin/usuarios', 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        });

        navItems.push({ 
            name: 'Gestión de Personas', 
            path: '/admin/personas', 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
                </svg>
            )
        });

        navItems.push({ 
            name: 'Gestión CUPOF', 
            path: '/admin/cupofs', 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            )
        });
    }

    if (user?.roles?.some(r => r.name === 'superuser') || hasPermission('sistema.usuarios')) {
        navItems.push({ 
            name: 'Panel General', 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
            ),
            isDropdown: true,
            isOpen: isGeneralPanelOpen,
            setIsOpen: setIsGeneralPanelOpen,
            subItems: [
                {
                    name: 'Instituciones',
                    isSubgroup: true,
                    isOpen: isInstGroupOpen,
                    setIsOpen: setIsInstGroupOpen,
                    items: [
                        { name: 'Escuelas', path: '/admin/general/escuelas' },
                        { name: 'Tipos de Escuela', path: '/admin/general/escuela-tipos' },
                        { name: 'Dependencias', path: '/admin/general/dependencias' },
                        { name: 'Ámbitos', path: '/admin/general/ambitos' },
                        { name: 'Ubicaciones', path: '/admin/general/escuela-ubicaciones' },
                    ]
                },
                {
                    name: 'Geografía',
                    isSubgroup: true,
                    isOpen: isGeoGroupOpen,
                    setIsOpen: setIsGeoGroupOpen,
                    items: [
                        { name: 'Continentes', path: '/admin/general/continentes' },
                        { name: 'Naciones', path: '/admin/general/naciones' },
                        { name: 'Provincias', path: '/admin/general/provincias' },
                        { name: 'Departamentos', path: '/admin/general/departamentos' },
                        { name: 'Localidades', path: '/admin/general/localidades' },
                    ]
                },
                {
                    name: 'Oferta Educativa',
                    isSubgroup: true,
                    isOpen: isOfferGroupOpen,
                    setIsOpen: setIsOfferGroupOpen,
                    items: [
                        { name: 'Niveles', path: '/admin/general/niveles' },
                        { name: 'Modalidades', path: '/admin/general/modalidades' },
                        { name: 'Modalidades por Nivel', path: '/admin/general/modalidad-niveles' },
                        { name: 'Otras Ofertas', path: '/admin/general/ofertas' },
                    ]
                },
                {
                    name: 'Personas',
                    isSubgroup: true,
                    isOpen: isPeopleGroupOpen,
                    setIsOpen: setIsPeopleGroupOpen,
                    items: [
                        { 
                            name: 'Documentación', 
                            isSubgroup: true, 
                            isOpen: isDocGroupOpen, 
                            setIsOpen: setIsDocGroupOpen,
                            items: [
                                { name: 'Situaciones', path: '/admin/general/documento-situacions' },
                                { name: 'Tipos de Documento', path: '/admin/general/documento-tipos' },
                            ]
                        },
                        { 
                            name: 'Identidad', 
                            isSubgroup: true, 
                            isOpen: isIdentityGroupOpen, 
                            setIsOpen: setIsIdentityGroupOpen,
                            items: [
                                { name: 'Géneros', path: '/admin/general/generos' },
                                { name: 'Sexos', path: '/admin/general/sexos' },
                            ]
                        },
                    ]
                },
                {
                    name: 'Operativos',
                    isSubgroup: true,
                    isOpen: isOpsGroupOpen,
                    setIsOpen: setIsOpsGroupOpen,
                    items: [
                        { name: 'Cargos', path: '/admin/general/cargos' },
                        { name: 'Ciclos Lectivos', path: '/admin/general/ciclos' },
                        { name: 'Condiciones', path: '/admin/general/condiciones' },
                        { name: 'Causas de Cierre', path: '/admin/general/cierre-causas' },
                    ]
                }
            ]
        });
    }

    if (user?.roles?.some(r => r.name === 'superuser') || hasPermission('planes.ver')) {
        navItems.push({ 
            name: 'Panel Curricular', 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
            isDropdown: true,
            isOpen: isCurricularPanelOpen,
            setIsOpen: setIsCurricularPanelOpen,
            subItems: [
                { name: 'Planes de Estudio', path: '/admin/curricular/planes' },
                { name: 'Años', path: '/admin/curricular/anios' },
            ]
        });
    }

    const isConduccion = ['director', 'vicedirector', 'secretario', 'prosecretario'].includes(activeProfile?.role?.name);
    if (isConduccion || user?.roles?.some(r => r.name === 'superuser')) {
        navItems.push({ 
            name: 'Propuestas Inst.', 
            path: '/academic/propuestas', 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            )
        });
    }

    // FUNCIONES AUXILIARES DE RENDERIZADO
    
    const isActiveDropdown = (item) => {
        if (!item.subItems) return location.pathname === item.path;
        return item.subItems.some(sub => {
            if (sub.isSubgroup) return sub.items.some(si => isActiveDropdown(si));
            return location.pathname === sub.path;
        });
    };

    const renderNavItem = (item, depth = 0) => {
        if (item.isSubgroup) {
            const hasActiveChild = item.items.some(child => 
                child.isSubgroup ? child.items.some(gc => location.pathname === gc.path) : location.pathname === child.path
            );

            return (
                <li key={item.name} className="flex flex-col">
                    <button 
                        onClick={() => item.setIsOpen(!item.isOpen)}
                        className={`flex items-center justify-between w-full p-2 rounded-lg transition-colors ${
                            hasActiveChild ? 'text-primary-400' : 'text-secondary-500 hover:text-white hover:bg-secondary-800'
                        }`}
                        style={{ paddingLeft: `${(depth + 1) * 1.5}rem` }}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.name}</span>
                        <svg className={`w-3 h-3 transition-transform duration-200 ${item.isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {item.isOpen && (
                        <ul className={`mt-1 ml-4 space-y-1 ${depth === 0 ? 'border-l border-secondary-800' : ''}`}>
                            {item.items.map(sub => renderNavItem(sub, depth + 1))}
                        </ul>
                    )}
                </li>
            );
        }

        return (
            <li key={item.path}>
                <Link 
                    to={item.path}
                    className={`block p-2 rounded-lg transition-colors text-sm ${
                        location.pathname === item.path
                        ? 'text-primary-400 font-bold' 
                        : 'text-secondary-400 hover:text-white hover:bg-secondary-800'
                    }`}
                    style={{ paddingLeft: `${(depth + 1) * 1.5}rem` }}
                >
                    {item.name}
                </Link>
            </li>
        );
    };

    return (
        <div className="min-h-screen bg-secondary-50 flex font-sans">
            {/* Global Notifications */}
            {notification && (
                <div className="fixed top-20 right-8 z-[100] max-w-sm w-full animate-fadeInRight">
                    <div className={`p-4 rounded-2xl shadow-2xl border-l-4 flex items-start gap-4 ${
                        notification.type === 'success' ? 'bg-white border-green-500' : 'bg-white border-red-500'
                    }`}>
                        <div className={`p-2 rounded-xl shrink-0 ${notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {notification.type === 'success' ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            )}
                        </div>
                        <div className="flex-grow pt-0.5">
                            <p className="text-sm font-bold">{notification.type === 'success' ? 'Éxito' : 'Error'}</p>
                            <p className="text-xs text-secondary-600 mt-1">{notification.message}</p>
                        </div>
                        <button onClick={clearNotification} className="text-secondary-400 hover:text-secondary-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-secondary-900 text-white transition-all duration-300 flex flex-col shadow-xl`}>
                <div className="p-6 flex items-center justify-between border-b border-secondary-800">
                    {isSidebarOpen && <span className="text-xl font-bold text-primary-400">SGEI</span>}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-secondary-800 rounded">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>

                <nav className="flex-grow mt-6 px-3 overflow-y-auto custom-scrollbar">
                    <ul className="space-y-2 pb-6">
                        {navItems.map((item) => (
                            <li key={item.name}>
                                {item.isDropdown ? (
                                    <div className="flex flex-col">
                                        <button 
                                            onClick={() => item.setIsOpen(!item.isOpen)}
                                            className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                                                isActiveDropdown(item) ? 'bg-secondary-800 text-white' : 'text-secondary-400 hover:bg-secondary-800 hover:text-white'
                                            }`}
                                        >
                                            {item.icon}
                                            {isSidebarOpen && (
                                                <div className="flex items-center justify-between flex-grow ml-4">
                                                    <span className="font-medium">{item.name}</span>
                                                    <svg className={`w-4 h-4 transition-transform duration-200 ${item.isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            )}
                                        </button>
                                        {item.isOpen && isSidebarOpen && (
                                            <ul className="mt-2 ml-4 space-y-1">
                                                {item.subItems.map(subItem => renderNavItem(subItem))}
                                            </ul>
                                        )}
                                    </div>
                                ) : (
                                    <Link 
                                        to={item.path}
                                        className={`flex items-center p-3 rounded-lg transition-colors ${
                                            location.pathname === item.path ? 'bg-primary-600 text-white shadow-md' : 'text-secondary-400 hover:bg-secondary-800 hover:text-white'
                                        }`}
                                    >
                                        {item.icon}
                                        {isSidebarOpen && <span className="ml-4 font-medium">{item.name}</span>}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-secondary-800">
                    {isSidebarOpen && activeProfile && (
                        <div className="mb-4 px-3 py-2 bg-secondary-800/50 rounded-xl border border-secondary-700/50">
                            <p className="text-[9px] font-black text-secondary-500 uppercase tracking-widest">Contexto Activo</p>
                            <p className="text-xs font-bold text-primary-400 truncate mt-1">{activeProfile.escuela.nombre}</p>
                            <p className="text-[10px] font-medium text-secondary-300 mt-0.5">{activeProfile.role?.name}</p>
                        </div>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center p-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        {isSidebarOpen && <span className="ml-4 font-medium">Salir</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-grow flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-secondary-200 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center"><h2 className="text-secondary-800 font-semibold text-lg">{navItems.find(i => i.path === location.pathname)?.name || 'SGEI'}</h2></div>
                    <div className="flex items-center gap-4 relative" ref={userMenuRef}>
                        <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 p-1.5 hover:bg-secondary-50 rounded-xl border border-transparent group">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-secondary-900">{user?.nombre}</p>
                                {activeProfile ? (
                                    <p className="text-[10px] text-primary-600 font-black uppercase tracking-widest truncate max-w-[150px]">{activeProfile.escuela.nombre}</p>
                                ) : (
                                    <p className="text-[12px] text-secondary-500">{user?.email}</p>
                                )}
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border-2 border-primary-200 overflow-hidden shadow-sm">
                                {user?.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span>{user?.nombre?.charAt(0)}</span>}
                            </div>
                            <svg className={`w-4 h-4 text-secondary-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-secondary-200 rounded-2xl shadow-2xl py-2 z-50">
                                <div className="px-4 py-3 border-b border-secondary-100 mb-1">
                                    <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-1">Sesión Activa</p>
                                    <p className="text-sm font-bold text-secondary-900 truncate">{user?.nombre}</p>
                                </div>
                                <Link to="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary-700 hover:bg-primary-50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>Mi Perfil
                                </Link>
                                {(user?.escuela_usuarios?.filter(l => l.verified_at).length > 1) && (
                                    <button onClick={handleSwitchProfile} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-secondary-700 hover:bg-primary-50 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>Cambiar Institución/Rol
                                    </button>
                                )}
                                <div className="border-t border-secondary-100 mt-1 pt-1">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>
                <main className="flex-grow p-8 overflow-y-auto bg-secondary-50/30">{children}</main>
            </div>
        </div>
    );
};

export default Layout;
