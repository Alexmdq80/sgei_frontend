import { useAuth } from '../context/AuthContext';

/**
 * Página principal del panel de control.
 */
const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-6 animate-fadeIn">
            <header>
                <h1 className="text-2xl font-bold text-secondary-900">Bienvenido, {user?.nombre || 'Usuario'}</h1>
                <p className="text-secondary-500 mt-1">Este es el resumen general del Sistema de Gestión Escolar Integral.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards - Mockups para visualización */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-secondary-500">Estudiantes</p>
                            <p className="text-2xl font-bold text-secondary-900">1,248</p>
                        </div>
                        <div className="p-3 bg-primary-50 text-primary-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-green-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>+12% vs mes anterior</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-secondary-500">Docentes</p>
                            <p className="text-2xl font-bold text-secondary-900">84</p>
                        </div>
                        <div className="p-3 bg-accent-50 text-accent-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-secondary-500">
                        <span>Sin cambios recientes</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-secondary-500">Cursos Activos</p>
                            <p className="text-2xl font-bold text-secondary-900">42</p>
                        </div>
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-green-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>+2 nuevos esta semana</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                <div className="p-6 border-b border-secondary-200">
                    <h3 className="text-lg font-bold text-secondary-900">Actividad Reciente</h3>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-center h-48 border-2 border-dashed border-secondary-200 rounded-lg text-secondary-400">
                        <p>No hay actividad reciente para mostrar.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
