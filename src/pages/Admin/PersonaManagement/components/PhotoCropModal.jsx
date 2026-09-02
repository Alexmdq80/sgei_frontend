import { X } from "lucide-react";
import Cropper from "react-easy-crop";

/**
 * Modal de recorte de foto con react-easy-crop.
 */
export default function PhotoCropModal({
  isOpen,
  imageSrc,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-secondary-900/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Recortar foto"
    >
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-secondary-700 uppercase tracking-widest">
            Recortar Foto
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
        <div className="relative w-full h-80 bg-secondary-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="px-6 py-4 space-y-3">
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-full accent-primary-600"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-xl font-bold uppercase text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-primary-700"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
