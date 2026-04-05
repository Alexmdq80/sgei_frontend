import React, { useState, useEffect } from 'react';

/**
 * Componente de Modal para Confirmaciones y Prompts.
 * Reemplaza window.confirm y window.prompt con una interfaz Tailwind moderna.
 */
const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message = "", 
    confirmText = "Confirmar", 
    cancelText = "Cancelar",
    variant = "primary", // primary, danger, success, warning
    showInput = false,
    inputPlaceholder = "Escribe aquí...",
    initialInputValue = "",
    isLoading = false
}) => {
    const [inputValue, setInputValue] = useState(initialInputValue);

    useEffect(() => {
        if (isOpen) setInputValue(initialInputValue);
    }, [isOpen, initialInputValue]);

    if (!isOpen) return null;

    const variantClasses = {
        primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-primary-200",
        danger: "bg-red-600 hover:bg-red-700 text-white shadow-red-200",
        success: "bg-green-600 hover:bg-green-700 text-white shadow-green-200",
        warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200",
    };

    const iconClasses = {
        primary: "text-primary-600 bg-primary-50",
        danger: "text-red-600 bg-red-50",
        success: "text-green-600 bg-green-50",
        warning: "text-amber-600 bg-amber-50",
    };

    const handleConfirm = () => {
        if (showInput) {
            onConfirm(inputValue);
        } else {
            onConfirm();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-secondary-100">
                <div className="p-8">
                    {/* Icono y Título */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${iconClasses[variant]}`}>
                            {variant === 'danger' && (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            )}
                            {variant === 'primary' && (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {variant === 'success' && (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            {variant === 'warning' && (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-secondary-900 leading-tight">{title}</h2>
                        {message && <p className="text-secondary-500 mt-2 font-medium">{message}</p>}
                    </div>

                    {/* Input Opcional (Prompt) */}
                    {showInput && (
                        <div className="mb-6">
                            <textarea
                                className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-secondary-800 resize-none h-24"
                                placeholder={inputPlaceholder}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Botones de Acción */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 bg-secondary-100 text-secondary-600 rounded-2xl font-bold hover:bg-secondary-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-6 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${variantClasses[variant]}`}
                        >
                            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
