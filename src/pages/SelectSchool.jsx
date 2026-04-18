import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Vista para que el usuario seleccione el cargo (escuela/rol) con el que desea trabajar.
 * Las vinculaciones son automáticas vía CUPOF, por lo que aquí solo se eligen las verificadas.
 */
const SelectSchool = () => {
    const { user, logout, selectProfile } = useAuth();
    const navigate = useNavigate();
    
    // Filtrar vinculaciones verificadas (las que vienen del CUPOF)
    const activeLinks = user?.escuela_usuarios?.filter(link => link.verified_at) || [];

    /**
     * Lógica de redirección automática:
     * 1. Si solo tiene un cargo, seleccionarlo automáticamente.
     * 2. Si es superusuario o administrador global, no necesita seleccionar escuela específica.
     */
    useEffect(() => {
        const isSuperUser = user?.es_administrador || user?.roles?.some(r => r.name === 'superuser');
        
        if (isSuperUser) {
            navigate('/dashboard');
            return;
        }

        if (activeLinks.length === 1) {
            selectProfile(activeLinks[0]);
            navigate('/dashboard');
        }
    }, [user, activeLinks, selectProfile, navigate]);

    const handleSelectProfile = (link) => {
        selectProfile(link);
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-secondary-50 flex flex-col items-center justify-center p-6 animate-fadeIn">
            <div className="max-w-4xl w-full">
                {/* Cabecera */}
                <div className="text-center mb-10">
                    <div className="inline-block p-4 bg-primary-50 rounded-2xl mb-4 text-primary-600">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
                        Seleccionar Cargo Activo
                    </h1>
                    <p className="text-secondary-500 mt-2 font-medium">
                        Elige la institución y el perfil con el que deseas trabajar en esta sesión
                    </p>
                </div>

                {activeLinks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeLinks.map((link) => (
                            <button
                                key={link.id}
                                onClick={() => handleSelectProfile(link)}
                                className="group relative bg-white p-8 rounded-3xl border-2 border-secondary-100 shadow-sm hover:border-primary-500 hover:shadow-xl transition-all text-left overflow-hidden active:scale-[0.98]"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 group-hover:text-primary-600 transition-opacity">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex flex-col h-full justify-between gap-6">
                                    <div>
                                        <h3 className="font-black text-secondary-900 text-xl leading-tight group-hover:text-primary-700 transition-colors uppercase">
                                            {link.escuela.nombre}
                                        </h3>
                                        <p className="text-xs font-bold text-secondary-400 uppercase mt-1 tracking-widest">
                                            CUE: {link.escuela.cue_anexo}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-6 border-t border-secondary-50">
                                        <span className="px-4 py-1.5 bg-primary-50 text-primary-600 rounded-xl text-xs font-black uppercase tracking-widest border border-primary-100">
                                            {link.role?.name || 'Personal'}
                                        </span>
                                        <span className="text-primary-500 font-bold text-sm flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                            Ingresar <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-12 rounded-3xl shadow-xl border border-secondary-200 text-center max-w-lg mx-auto">
                        <div className="w-20 h-20 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-6 text-secondary-300">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-black text-secondary-900 mb-4">Sin Cargos Asignados</h2>
                        <p className="text-secondary-500 font-medium leading-relaxed mb-8">
                            Actualmente no registras cargos activos en el sistema. <br />
                            La vinculación institucional se realiza automáticamente a través de la oficina de personal mediante el sistema CUPOF.
                        </p>
                        <button 
                            onClick={logout}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-secondary-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Cerrar Sesión
                        </button>
                    </div>
                )}

                {/* Footer informativo */}
                {activeLinks.length > 0 && (
                    <div className="mt-12 flex justify-center items-center gap-6 text-secondary-400">
                        <button 
                            onClick={logout}
                            className="text-xs font-black uppercase tracking-[0.2em] hover:text-red-600 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Salir del Sistema
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelectSchool;
