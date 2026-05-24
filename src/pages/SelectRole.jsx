import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Shield, Globe, MapPin, School, ChevronRight, 
    User, LogOut, Award, Briefcase 
} from 'lucide-react';

/**
 * Página para seleccionar el rol activo cuando el usuario tiene múltiples perfiles.
 */
const SelectRole = () => {
    const { user, selectProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [roles, setRoles] = useState([]);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const availableRoles = [];

        // 1. Roles Administrativos Globales/Jurisdiccionales
        if (user.roles) {
            user.roles.forEach(role => {
                let context = 'Jurisdicción Provincial';
                let icon = <Award className="w-6 h-6" />;
                let color = 'bg-indigo-50 text-indigo-600 border-indigo-100';

                if (role.name === 'jefe_provincial') {
                    context = user.provincia_usuario?.provincia?.nombre || 'Provincia';
                    icon = <Shield className="w-6 h-6" />;
                    color = 'bg-rose-50 text-rose-600 border-rose-100';
                } else if (role.name === 'jefe_regional') {
                    context = `Región ${user.region_usuario?.region?.numero || ''}`;
                    icon = <Globe className="w-6 h-6" />;
                    color = 'bg-blue-50 text-blue-600 border-blue-100';
                } else if (role.name === 'jefe_distrital') {
                    context = user.distrito_usuario?.distrito?.nombre || 'Distrito';
                    icon = <MapPin className="w-6 h-6" />;
                    color = 'bg-amber-50 text-amber-600 border-amber-100';
                } else if (role.name === 'superuser') {
                    context = 'Acceso Total';
                    icon = <Shield className="w-6 h-6 text-red-600" />;
                    color = 'bg-red-50 text-red-700 border-red-200';
                }

                availableRoles.push({
                    id: `role-${role.id}`,
                    type: 'admin',
                    name: role.name,
                    displayName: role.name.replace('_', ' '),
                    context,
                    icon,
                    color,
                    rawRole: role
                });
            });
        }

        // 2. Roles Institucionales (Escuelas)
        if (user.escuela_usuarios) {
            user.escuela_usuarios
                .filter(link => link.verified_at)
                .forEach(link => {
                    availableRoles.push({
                        id: `school-${link.id}`,
                        type: 'school',
                        name: link.role?.name || 'Personal',
                        displayName: link.role?.name || 'Personal',
                        context: link.escuela?.nombre || 'Escuela',
                        icon: <School className="w-6 h-6" />,
                        color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                        rawLink: link
                    });
                });
        }

        setRoles(availableRoles);

        // Si solo tiene un rol, seleccionarlo automáticamente
        if (availableRoles.length === 1) {
            handleSelect(availableRoles[0]);
        }
    }, [user, navigate]);

    const handleSelect = (roleOption) => {
        if (roleOption.type === 'admin') {
            selectProfile({
                type: 'admin',
                role: roleOption.rawRole,
                context: roleOption.context
            });
        } else {
            selectProfile({
                type: 'school',
                role: roleOption.rawLink.role,
                escuela: roleOption.rawLink.escuela,
                escuela_id: roleOption.rawLink.escuela_id,
                role_id: roleOption.rawLink.role_id,
                context: roleOption.context
            });
        }
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-secondary-100 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full space-y-8 animate-fadeIn">
                <div className="text-center space-y-4">
                    <div className="inline-flex p-4 bg-white rounded-3xl shadow-sm border border-secondary-200 mb-2">
                        <User className="w-12 h-12 text-primary-600" />
                    </div>
                    <h1 className="text-4xl font-black text-secondary-900 tracking-tight uppercase">
                        Seleccionar Perfil
                    </h1>
                    <p className="text-secondary-500 text-lg font-medium">
                        Hola <span className="text-primary-600 font-bold">{user?.nombre}</span>, elige con qué rol deseas operar hoy.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => handleSelect(role)}
                            className="group bg-white p-6 rounded-3xl border border-secondary-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all flex items-center justify-between text-left active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 ${role.color}`}>
                                    {role.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight">
                                        {role.displayName}
                                    </h3>
                                    <p className="text-secondary-500 font-bold uppercase text-xs tracking-widest mt-1">
                                        {role.context}
                                    </p>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-secondary-50 flex items-center justify-center text-secondary-300 group-hover:text-primary-600 group-hover:bg-primary-50 transition-all">
                                <ChevronRight className="w-6 h-6" />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-center pt-4">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-secondary-400 font-bold uppercase text-xs tracking-widest hover:text-red-600 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión y Salir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectRole;
