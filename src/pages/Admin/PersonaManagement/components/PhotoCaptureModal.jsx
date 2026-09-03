import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Modal de captura de foto desde la cámara.
 */
export default function PhotoCaptureModal({
  isOpen,
  stream,
  videoRef,
  onClose,
  onCapture,
}) {
  useEffect(() => {
    if (videoRef?.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-secondary-900/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Tomar foto con la cámara"
    >
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-secondary-700 uppercase tracking-widest">
            Tomar Foto
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-80 object-cover bg-secondary-900 scale-x-[-1]"
        />
        <div className="px-6 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-xl font-bold uppercase text-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onCapture}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-primary-700"
          >
            Capturar
          </button>
        </div>
      </div>
    </div>
  );
}
