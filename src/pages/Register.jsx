import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import documentoTipoService from '../services/documentoTipoService';

/**
 * Página de Registro Público para SGEI.
 */
const Register = () => {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        documento_tipo_id: '',
        documento_numero: '',
        password: '',
        password_confirmation: ''
    });

    const [documentoTipos, setDocumentoTipos] = useState([]);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [successMessage, setSuccessMessage] = useState(null);

    const navigate = useNavigate();

    /**
     * Cargar tipos de documento al montar.
     */
    useEffect(() => {
        const fetchDocumentoTipos = async () => {
            try {
                const data = await documentoTipoService.getAll();
                setDocumentoTipos(data);
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, documento_tipo_id: data[0].id }));
                }
            } catch (err) {
                console.error("Error cargando tipos de documento:", err);
                setError("No se pudieron cargar los datos necesarios. Intente recargar.");
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchDocumentoTipos();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Limpiar errores específicos al escribir
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setValidationErrors({});
        setIsSubmitting(true);

        try {
            await authService.register(formData);
            setSuccessMessage("¡Registro exitoso! Por favor, revisa tu correo para verificar tu cuenta.");
            setTimeout(() => navigate('/login'), 5000);
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData?.errors) {
                setValidationErrors(errorData.errors);
                setError("Por favor, corrija los errores en el formulario.");
            } else {
                setError(errorData?.error || "Ocurrió un error inesperado durante el registro.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (successMessage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-100 px-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-secondary-200 p-10 text-center">
                    <div className="inline-block p-4 bg-green-50 rounded-full mb-6 text-green-600">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-secondary-900 mb-4">{successMessage}</h2>
                    <p className="text-secondary-600 mb-8">Serás redirigido al login en unos segundos...</p>
                    <Link to="/login" className="text-primary-600 font-bold hover:underline">Ir al Login ahora</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-100 px-4 py-12 font-sans">
            <div className="max-w-xl w-full bg-white rounded-xl shadow-lg border border-secondary-200 p-8 md:p-10">
                
                {/* Cabecera */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Crear Cuenta SGEI</h1>
                    <p className="text-secondary-500 mt-2 font-medium">Completa tus datos para registrarte</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm rounded-r-lg animate-fadeIn">
                            <span className="font-semibold">{error}</span>
                        </div>
                    )}

                    {/* Nombre de Usuario */}
                    <div>
                        <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Nombre de Usuario (Alias)</label>
                        <input
                            type="text"
                            name="nombre"
                            required
                            className={`block w-full px-4 py-3 border rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 outline-none transition-all ${validationErrors.nombre ? 'border-red-500 focus:ring-red-200' : 'border-secondary-300 focus:ring-primary-500'}`}
                            placeholder="Ej: juanito_sgei"
                            value={formData.nombre}
                            onChange={handleChange}
                        />
                        {validationErrors.nombre && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{validationErrors.nombre[0]}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Correo Electrónico</label>
                        <input
                            type="email"
                            name="email"
                            required
                            className={`block w-full px-4 py-3 border rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 outline-none transition-all ${validationErrors.email ? 'border-red-500 focus:ring-red-200' : 'border-secondary-300 focus:ring-primary-500'}`}
                            placeholder="ejemplo@correo.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
                        {validationErrors.email && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{validationErrors.email[0]}</p>}
                    </div>

                    {/* Documento (Fila) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Tipo de Documento</label>
                            <select
                                name="documento_tipo_id"
                                required
                                disabled={isLoadingData}
                                className="block w-full px-3 py-3 border border-secondary-300 rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all appearance-none"
                                value={formData.documento_tipo_id}
                                onChange={handleChange}
                            >
                                {isLoadingData ? (
                                    <option>Cargando...</option>
                                ) : (
                                    documentoTipos.map(tipo => (
                                        <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Número de Documento</label>
                            <input
                                type="text"
                                name="documento_numero"
                                required
                                className={`block w-full px-4 py-3 border rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 outline-none transition-all ${validationErrors.documento_numero ? 'border-red-500 focus:ring-red-200' : 'border-secondary-300 focus:ring-primary-500'}`}
                                placeholder="Solo números"
                                value={formData.documento_numero}
                                onChange={handleChange}
                            />
                            {validationErrors.documento_numero && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{validationErrors.documento_numero[0]}</p>}
                        </div>
                    </div>

                    {/* Contraseñas (Fila) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Contraseña</label>
                            <input
                                type="password"
                                name="password"
                                required
                                className={`block w-full px-4 py-3 border rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 outline-none transition-all ${validationErrors.password ? 'border-red-500 focus:ring-red-200' : 'border-secondary-300 focus:ring-primary-500'}`}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            {validationErrors.password && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{validationErrors.password[0]}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Confirmar</label>
                            <input
                                type="password"
                                name="password_confirmation"
                                required
                                className="block w-full px-4 py-3 border border-secondary-300 rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                placeholder="••••••••"
                                value={formData.password_confirmation}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || isLoadingData}
                            className={`w-full flex justify-center py-3.5 px-4 rounded-lg shadow-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none transition-all active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed shadow-none' : ''}`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Registrando...
                                </span>
                            ) : 'Crear mi Cuenta'}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-secondary-500 text-sm font-medium">
                        ¿Ya tienes una cuenta? {' '}
                        <Link to="/login" className="text-primary-600 font-bold hover:underline">
                            Inicia Sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
