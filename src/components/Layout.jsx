import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Home, User, Users, Contact, School, LayoutDashboard, 
    BookOpen, GraduationCap, ChevronDown, Menu, LogOut, 
    RefreshCw, CheckCircle, AlertCircle, X 
} from 'lucide-react';

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
    const [isGeorefGroupOpen, setIsGeorefGroupOpen] = useState(false);
    const [isOpsGroupOpen, setIsOpsGroupOpen] = useState(false);
    const [isCurricularPanelOpen, setIsCurricularPanelOpen] = useState(false);
    const [isDistrictPanelOpen, setIsDistrictPanelOpen] = useState(false);
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
            '/admin/general/jornadas',
            '/admin/general/turnos',
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
            '/admin/general/regiones',
            '/admin/general/municipios',
            '/admin/general/departamentos',
            '/admin/general/localidades',
            '/admin/general/localidad-censals',
            '/admin/general/calles'
        ];
        const georefPaths = [
            '/admin/general/georef-fuentes',
            '/admin/general/georef-categorias',
            '/admin/general/georef-funcions'
        ];
        const opsPaths = [
            '/admin/general/cargos', 
            '/admin/general/ciclos', 
            '/admin/general/condiciones',
            '/admin/general/vinculo-tipos',
            '/admin/general/vinculos',
            '/admin/general/cierre-causas',
            '/admin/general/escalafones',
            '/admin/general/puesto-tipos'
        ];

        const allGeneralPaths = [...instPaths, ...offerPaths, ...docPaths, ...identityPaths, ...geoPaths, ...georefPaths, ...opsPaths];

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
        if (geoPaths.includes(location.pathname) || georefPaths.includes(location.pathname)) {
            setIsGeoGroupOpen(true);
            if (georefPaths.includes(location.pathname)) setIsGeorefGroupOpen(true);
        }
        if (opsPaths.includes(location.pathname)) {
            setIsOpsGroupOpen(true);
        }

        if (['/admin/curricular/anios', '/admin/curricular/planes'].includes(location.pathname)) {
            setIsCurricularPanelOpen(true);
        }

        if (['/admin/cupofs', '/admin/comunidad'].includes(location.pathname)) {
            setIsDistrictPanelOpen(true);
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
        { name: 'Dashboard', path: '/', icon: <Home className="w-6 h-6" /> },
        { name: 'Perfil', path: '/profile', icon: <User className="w-6 h-6" /> },
    ];

    // Lógica de acceso basada en el PERFIL ACTIVO
    const activeRoleName = activeProfile?.role?.name;
    const isSuperUser = user?.es_administrador || user?.roles?.some(r => r.name === 'superuser');
    
    // El Supervisor Curricular NO gestiona personas ni usuarios, incluso si tiene otros roles globales
    const isActingAsSupervisor = activeRoleName === 'supervisor_curricular';

    if (hasPermission('sistema.usuarios') && !isActingAsSupervisor) {
        navItems.push({
            name: 'Gestión de Usuarios',
            path: '/admin/usuarios',
            icon: <Users className="w-6 h-6" />
        });
    }

    if ((hasPermission('sistema.usuarios') || hasPermission('personal.ver')) && !isActingAsSupervisor) {
        navItems.push({
            name: 'Gestión de Personas',
            path: '/admin/personas',
            icon: <Contact className="w-6 h-6" />
        });
    }

    if (hasPermission('sistema.usuarios') || isActingAsSupervisor) {
        navItems.push({
            name: 'Escuelas',
            icon: <School className="w-6 h-6" />,
            isDropdown: true,
            isOpen: isDistrictPanelOpen,
            setIsOpen: setIsDistrictPanelOpen,
            subItems: [
                ...(isActingAsSupervisor ? [] : [{ name: 'Gestión CUPOF', path: '/admin/cupofs' }]),
                { name: 'Comunidad Educativa', path: '/admin/comunidad' },
            ]
        });
    }

    if (isSuperUser || (hasPermission('sistema.usuarios') && !isActingAsSupervisor)) {
        navItems.push({ 
            name: 'Panel General', 
            icon: <LayoutDashboard className="w-6 h-6" />,
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
                        { name: 'Regiones', path: '/admin/general/regiones' },
                        { name: 'Departamentos', path: '/admin/general/departamentos' },
                        { name: 'Municipios', path: '/admin/general/municipios' },
                        { name: 'Localidades', path: '/admin/general/localidades' },
                        { name: 'Localidades Censales', path: '/admin/general/localidad-censals' },
                        { name: 'Calles', path: '/admin/general/calles' },
                        {
                            name: 'Metadatos Georef',
                            isSubgroup: true,
                            isOpen: isGeorefGroupOpen,
                            setIsOpen: setIsGeorefGroupOpen,
                            items: [
                                { name: 'Fuentes', path: '/admin/general/georef-fuentes' },
                                { name: 'Categorías', path: '/admin/general/georef-categorias' },
                                { name: 'Funciones', path: '/admin/general/georef-funcions' },
                            ]
                        },
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
                        { name: 'Jornadas', path: '/admin/general/jornadas' },
                        { name: 'Turnos', path: '/admin/general/turnos' },
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
                        { name: 'Escalafones', path: '/admin/general/escalafones' },
                        { name: 'Tipos de Puesto', path: '/admin/general/puesto-tipos' },
                        { name: 'Tipos de Vínculo', path: '/admin/general/vinculo-tipos' },
                        { name: 'Vínculos', path: '/admin/general/vinculos' },
                        { name: 'Causas de Cierre', path: '/admin/general/cierre-causas' },
                    ]
                }
            ]
        });
    }

    if (isSuperUser || hasPermission('planes.ver')) {
        navItems.push({ 
            name: 'Panel Curricular', 
            icon: <BookOpen className="w-6 h-6" />,
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
            icon: <GraduationCap className="w-6 h-6" />
        });
    }

    /**
     * Obtiene el rol con el que el usuario está actuando actualmente.
     */
    const getActingRole = () => {
        // PRIORIDAD: Perfil seleccionado explícitamente en SelectRole
        if (activeProfile) {
            return {
                name: activeProfile.role?.name || 'Usuario',
                context: activeProfile.context || activeProfile.escuela?.nombre,
                type: activeProfile.type === 'school' ? 'institutional' : 'admin'
            };
        }

        // FALLBACK: Superusuario global o detección por roles (si no hay perfil seleccionado)
        if (user?.es_administrador || user?.roles?.some(r => r.name === 'superuser')) {
            return { name: 'Superusuario', type: 'admin' };
        }

        const adminRoles = [
            { id: 'jefe_provincial', name: 'Jefe Provincial', context: user?.provincia_usuario?.provincia?.nombre },
            { id: 'jefe_regional', name: 'Jefe Regional', context: user?.region_usuario?.region?.nombre },
            { id: 'jefe_distrital', name: 'Jefe Distrital', context: user?.distrito_usuario?.distrito?.nombre || user?.distrito_usuario?.distrito?.departamento?.nombre },
            { id: 'supervisor_curricular', name: 'Supervisor' }
        ];

        for (const role of adminRoles) {
            if (user?.roles?.some(r => r.name === role.id)) {
                return { 
                    name: role.name, 
                    type: 'admin',
                    context: role.context 
                };
            }
        }

        return { name: 'Usuario Estándar', type: 'standard' };
    };

    const actingRole = getActingRole();
    
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
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${item.isOpen ? 'rotate-180' : ''}`} />
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
                <div className="fixed top-20 right-8 z-[200] max-w-sm w-full animate-fadeInRight">
                    <div className={`p-4 rounded-2xl shadow-2xl border-l-4 flex items-start gap-4 ${
                        notification.type === 'success' ? 'bg-white border-green-500' : 'bg-white border-red-500'
                    }`}>
                        <div className={`p-2 rounded-xl shrink-0 ${notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-grow pt-0.5">
                            <p className="text-sm font-bold">{notification.type === 'success' ? 'Éxito' : 'Error'}</p>
                            <p className="text-xs text-secondary-600 mt-1">{notification.message}</p>
                        </div>
                        <button onClick={clearNotification} className="text-secondary-400 hover:text-secondary-600"><X className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-secondary-900 text-white transition-all duration-300 flex flex-col shadow-xl`}>
                <div className="p-6 flex items-center justify-between border-b border-secondary-800">
                    {isSidebarOpen && <span className="text-xl font-bold text-primary-400">SGEI</span>}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-secondary-800 rounded">
                        <Menu className="w-6 h-6" />
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
                                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${item.isOpen ? 'rotate-180' : ''}`} />
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
                    {isSidebarOpen && (
                        <div className="mb-4 px-3 py-2 bg-secondary-800/50 rounded-xl border border-secondary-700/50">
                            <p className="text-[9px] font-black text-secondary-500 uppercase tracking-widest">Actuando como</p>
                            <p className="text-xs font-bold text-primary-400 truncate mt-1">{actingRole.name}</p>
                            {actingRole.context && (
                                <p className="text-[10px] font-medium text-secondary-300 mt-0.5 truncate">{actingRole.context}</p>
                            )}
                        </div>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center p-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors">
                        <LogOut className="w-6 h-6" />
                        {isSidebarOpen && <span className="ml-4 font-medium">Salir</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-grow flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-secondary-200 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center"><h2 className="text-secondary-800 font-semibold text-lg">{navItems.find(i => i.path === location.pathname)?.name || 'SGEI'}</h2></div>
                    <div className="flex items-center gap-4 relative" ref={userMenuRef}>
                        <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 p-1.5 hover:bg-secondary-50 rounded-xl border border-transparent group transition-all">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">{user?.nombre}</p>
                                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${
                                        actingRole.type === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        actingRole.type === 'institutional' ? 'bg-primary-50 text-primary-600 border-primary-100' :
                                        'bg-secondary-100 text-secondary-500 border-secondary-200'
                                    }`}>
                                        {actingRole.name}
                                    </span>
                                    {actingRole.context && (
                                        <p className="text-[9px] text-secondary-400 font-bold uppercase truncate max-w-[120px]">{actingRole.context}</p>
                                    )}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border-2 border-primary-200 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                                {user?.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span>{user?.nombre?.charAt(0)}</span>}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-secondary-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-secondary-200 rounded-2xl shadow-2xl py-2 z-50">
                                <div className="px-4 py-3 border-b border-secondary-100 mb-1">
                                    <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-1">Sesión Activa</p>
                                    <p className="text-sm font-bold text-secondary-900 truncate">{user?.nombre}</p>
                                </div>
                                <Link to="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary-700 hover:bg-primary-50 transition-colors">
                                    <User className="w-4 h-4" />Mi Perfil
                                </Link>
                                {((user?.roles?.length || 0) + (user?.escuela_usuarios?.filter(l => l.verified_at).length || 0) > 1) && (
                                    <Link to="/select-role" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary-700 hover:bg-primary-50 transition-colors">
                                        <RefreshCw className="w-4 h-4" />Cambiar Perfil/Rol
                                    </Link>
                                )}
                                <div className="border-t border-secondary-100 mt-1 pt-1">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold">
                                        <LogOut className="w-4 h-4" />Cerrar Sesión
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
