import { useAuth } from '../context/AuthContext';
import { User, ShieldAlert, Clock, School, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Página principal del panel de control.
 * Orquesta la visualización según el rango y vinculación del usuario.
 */
const Dashboard = () => {
    const { user } = useAuth();

    // Determinar si es un usuario "Invitado" (Sin roles administrativos y sin vinculaciones escolares verificadas)
    const hasAdminRoles = user?.roles && user.roles.length > 0;
    const hasVerifiedSchools = user?.escuela_usuarios && user.escuela_usuarios.some(link => link.verified_at);
    const isInvited = !hasAdminRoles && !hasVerifiedSchools && !user?.es_administrador;

    if (isInvited) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pt-10">
                <div className="text-center space-y-4">
                    <div className="inline-flex p-4 bg-primary-100 text-primary-600 rounded-3xl shadow-inner mb-2">
                        <User className="w-12 h-12" />
                    </div>
                    <h1 className="text-4xl font-black text-secondary-900 tracking-tight uppercase">
                        Panel de Invitado
                    </h1>
                    <p className="text-secondary-500 text-lg font-medium max-w-2xl mx-auto">
                        ¡Bienvenido al SGEI, <span className="text-primary-600 font-bold">{user?.nombre}</span>! Tu cuenta ha sido creada y verificada con éxito, pero aún no tienes un rol asignado en el sistema.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-secondary-200 shadow-sm space-y-4">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-secondary-900 uppercase">Estado: Pendiente</h3>
                        <p className="text-sm text-secondary-500 font-medium leading-relaxed">
                            Para acceder a las funciones administrativas o académicas, un <span className="font-bold text-secondary-700">Superusuario</span> o <span className="font-bold text-secondary-700">Autoridad Distrital</span> debe asignarte un cargo.
                        </p>
                        <div className="pt-4">
                            <Link to="/profile" className="text-primary-600 font-bold text-sm hover:underline flex items-center gap-2">
                                Completar mis datos de perfil <ShieldCheck className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-secondary-200 shadow-sm space-y-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <School className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-secondary-900 uppercase">Sin Cargos Asignados</h3>
                        <p className="text-sm text-secondary-500 font-medium leading-relaxed">
                            Actualmente no registras cargos activos en el sistema.
                            La vinculación institucional se realiza automáticamente a través de la oficina de personal mediante el sistema <span className="font-bold text-secondary-700">CUPOF</span>.
                        </p>
                    </div>
                </div>

                <div className="bg-secondary-50 p-6 rounded-3xl border border-secondary-200 flex items-start gap-4">
                    <ShieldAlert className="w-6 h-6 text-secondary-400 mt-1" />
                    <p className="text-xs text-secondary-400 font-bold uppercase leading-normal tracking-wide">
                        Si crees que esto es un error, por favor contacta al administrador de tu distrito o institución educativa para que procedan con la asignación de tu cargo correspondiente.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <header>
                <h1 className="text-2xl font-bold text-secondary-900 uppercase tracking-tight">
                    Resumen del Sistema
                </h1>
                <p className="text-secondary-500 mt-1 font-medium italic">
                    Hola {user?.nombre}, gestionando como <span className="text-primary-600 font-bold uppercase">{user?.roles?.[0]?.name?.replace('_', ' ') || 'Usuario'}</span>
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards - Mockups para visualización */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Estudiantes</p>
                            <p className="text-2xl font-black text-secondary-900">1,248</p>
                        </div>
                        <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-green-600 font-bold">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>+12% vs mes anterior</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Docentes</p>
                            <p className="text-2xl font-black text-secondary-900">84</p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-secondary-400 font-bold">
                        <span>Sin cambios recientes</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Cursos Activos</p>
                            <p className="text-2xl font-black text-secondary-900">42</p>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-green-600 font-bold">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>+2 nuevos esta semana</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
                <div className="p-6 border-b border-secondary-200 bg-secondary-50">
                    <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-600" />
                        Actividad Reciente
                    </h3>
                </div>
                <div className="p-12">
                    <div className="flex flex-col items-center justify-center text-center opacity-40">
                        <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
                            <ShieldAlert className="w-8 h-8 text-secondary-300" />
                        </div>
                        <p className="text-sm font-bold text-secondary-400 uppercase tracking-tighter">No hay actividad reciente para mostrar en su jurisdicción.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
