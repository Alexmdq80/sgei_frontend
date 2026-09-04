import {
  UserPlus,
  X,
  User,
  Trash2,
  Camera,
  IdCard,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
} from "lucide-react";
import { DOC_TIPO_DNI, DOC_TIPO_INDOCUMENTADO } from "../utils/constants";

/**
 * Patrón admitido para apellido/nombre/nombre_alternativo (accesibilidad):
 * letras (incl. tildes, diéresis y ñ), espacios, apóstrofes y guiones.
 */
const NAME_INPUT_PATTERN = "[A-Za-zÁÉÍÓÚáéíóúÑñÜü\\s'\\-]*";
const NAME_INPUT_TITLE =
  "Solo letras (incluye tildes, diéresis y ñ), espacios, apóstrofes y guiones.";

/**
 * Sanitiza nombres/apellidos: elimina números y caracteres especiales y
 * normaliza a mayúsculas.
 */
const sanitizeName = (value) =>
  value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, "").toUpperCase();

/**
 * Modal de creación/edición de persona con Stepper de 4 pasos.
 */
export default function PersonaFormModal({
  isOpen,
  isEditMode,
  isEmailLocked,
  isSavingPersona,
  formData,
  currentStep,
  catalogs: {
    sexos,
    generos,
    docTipos,
    docSituaciones,
    nacions,
    provincias,
    departamentos,
    localidades,
  },
  fotoPreview,
  fotoInputRef,
  onFieldChange,
  onFileChange,
  onTakePhoto,
  onDeleteFoto,
  onInputChange,
  onViveChange,
  onSituacionChange,
  onTipoDocumentoChange,
  onProvinciaChange,
  onDepartamentoChange,
  onClose,
  onSubmit,
  onNextStep,
  onPrevStep,
}) {
  // Estado de vida
  const esFallecida = Number(formData.vive_si) === 0;

  // Lógica reactiva entre Situación del Documento y Tipo de Documento
  const situacionActual = docSituaciones.find(
    (s) => String(s.id) === String(formData.documento_situacion_id),
  );
  const noPoseeSituacion = /no posee/i.test(situacionActual?.nombre || "");
  const poseeDni = !!formData.documento_situacion_id && !noPoseeSituacion;
  const esDni = String(formData.documento_tipo_id) === DOC_TIPO_DNI;
  const esIndocumentado =
    String(formData.documento_tipo_id) === DOC_TIPO_INDOCUMENTADO;
  const tipoOptions = noPoseeSituacion
    ? docTipos.filter(
        (t) =>
          String(t.id) !== DOC_TIPO_DNI ||
          String(formData.documento_tipo_id) === DOC_TIPO_DNI,
      )
    : docTipos;
  const tipoDoc = docTipos.find(
    (t) => String(t.id) === String(formData.documento_tipo_id),
  );
  const etiquetaNumeroDocumento = !tipoDoc
    ? "Número de Documento"
    : /dni/i.test(tipoDoc.nombre)
      ? "Nº de DNI"
      : /cpi/i.test(tipoDoc.nombre)
        ? "Nº de CPI"
        : /extranjero/i.test(tipoDoc.nombre)
          ? "Nº de Documento Extranjero"
          : /pasaporte/i.test(tipoDoc.nombre)
            ? "Nº de Pasaporte"
            : "Nº de Documento";

  // Etapas del Stepper según estado de vida
  const todasLasEtapas = [
    { n: 1, label: "Identidad", Icon: User },
    { n: 2, label: "Documento", Icon: IdCard },
    { n: 3, label: "Nacimiento", Icon: MapPin },
    { n: 4, label: "Sexo y Género", Icon: Heart },
    { n: 5, label: "Contacto y Resumen", Icon: CheckCircle2 },
  ];
  const etapasVisibles = esFallecida
    ? todasLasEtapas.filter((s) => s.n <= 2)
    : todasLasEtapas;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={
        isEditMode ? "Modificar registro de persona" : "Registrar persona"
      }
    >
      <div className="h-[85vh] max-h-[760px] min-h-[580px] w-full max-w-4xl overflow-hidden flex flex-col bg-white rounded-3xl shadow-2xl border border-secondary-100 animate-scaleIn">
        <div className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 px-8 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-black border-2 border-white/40 shadow-lg">
              {formData.apellido?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                {isEditMode ? "Modificar Registro" : "Registrar Persona"}
              </h2>
              <p className="text-white/80 text-sm font-medium">
                {isEditMode
                  ? `${formData.apellido}, ${formData.nombre}`
                  : "Alta en el Padrón"}
              </p>
            </div>
          </div>
        </div>

        {/* Estado de Vida */}
        <div className="px-8 py-3 border-b border-secondary-100 bg-white flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black text-secondary-700 uppercase">
              Estado de Vida
            </p>
            <p className="text-[10px] text-secondary-500 font-medium">
              {esFallecida
                ? "Persona fallecida: solo se registran datos de identidad."
                : "Persona con vida: se registran todos los datos."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-black uppercase ${esFallecida ? "text-red-600" : "text-green-600"}`}
            >
              {esFallecida ? "Fallecido/a" : "Con vida"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!esFallecida}
                onChange={(e) => onViveChange(e.target.checked)}
              />
              <div className="w-11 h-6 bg-secondary-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        {/* Stepper */}
        <div className="px-8 py-4 border-b border-secondary-100 bg-secondary-50/50">
          <div className="flex items-center">
            {etapasVisibles.map(({ n, label, Icon: StepIcon }, idx) => (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep === n
                        ? "bg-primary-600 border-primary-600 text-white shadow-lg scale-110"
                        : currentStep > n
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-white border-secondary-300 text-secondary-400"
                    }`}
                  >
                    {currentStep > n ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      currentStep === n
                        ? "text-primary-700"
                        : "text-secondary-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < etapasVisibles.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                      currentStep > n ? "bg-green-500" : "bg-secondary-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              if (currentStep < etapasVisibles.length) {
                e.preventDefault();
                onNextStep();
              }
            }
          }}
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
          <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-6">
            {/* STEP 1: IDENTIDAD */}
            {currentStep === 1 && (
              <section>
                <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Datos de Identidad
                </h3>
                {!esFallecida && (
                  <div className="mb-6 flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <input
                        type="file"
                        ref={fotoInputRef}
                        onChange={onFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary-100 shadow-lg bg-secondary-100 flex items-center justify-center">
                        {fotoPreview ? (
                          <img
                            src={fotoPreview}
                            crossOrigin="use-credentials"
                            alt="Foto de perfil"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary-600 font-black text-4xl">
                            {(
                              formData.apellido?.charAt(0) || "?"
                            ).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fotoInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-95"
                      >
                        <UserPlus className="w-4 h-4" /> Subir Archivo
                      </button>
                      <button
                        type="button"
                        onClick={onTakePhoto}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                      >
                        <Camera className="w-4 h-4" /> Tomar Foto
                      </button>
                      {fotoPreview && (
                        <button
                          type="button"
                          onClick={onDeleteFoto}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {isEditMode && isEmailLocked && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                    Esta persona tiene un usuario vinculado. Los campos DNI y
                    Email están bloqueados para preservar la integridad del
                    vínculo.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Apellido *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      pattern={NAME_INPUT_PATTERN}
                      title={NAME_INPUT_TITLE}
                      value={formData.apellido}
                      onChange={(e) =>
                        onFieldChange("apellido", sanitizeName(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      pattern={NAME_INPUT_PATTERN}
                      title={NAME_INPUT_TITLE}
                      value={formData.nombre}
                      onChange={(e) =>
                        onFieldChange("nombre", sanitizeName(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Nombre Alternativo / Social
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      pattern={NAME_INPUT_PATTERN}
                      title={NAME_INPUT_TITLE}
                      value={formData.nombre_alternativo}
                      onChange={(e) =>
                        onFieldChange(
                          "nombre_alternativo",
                          sanitizeName(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Nacionalidad
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.nacionalidad_nacion_id}
                      onChange={onInputChange}
                      name="nacionalidad_nacion_id"
                    >
                      <option value="">Seleccionar...</option>
                      {nacions.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 2: DOCUMENTACIÓN Y CUIL */}
            {currentStep === 2 && (
              <section>
                <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                  <IdCard className="w-4 h-4" /> Documentación y CUIL
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Situación del Documento
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.documento_situacion_id}
                      onChange={onSituacionChange}
                    >
                      <option value="">Seleccionar...</option>
                      {docSituaciones.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Tipo de Documento *
                    </label>
                    <select
                      disabled={isEmailLocked || poseeDni}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none ${
                        isEmailLocked || poseeDni
                          ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                          : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                      }`}
                      value={formData.documento_tipo_id}
                      onChange={onTipoDocumentoChange}
                    >
                      <option value="">Seleccionar...</option>
                      {tipoOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                    {poseeDni && (
                      <p
                        id="tipo-doc-hint"
                        className="text-[10px] font-semibold text-primary-600 mt-1"
                      >
                        Por poseer DNI, el tipo de documento queda fijado
                        automáticamente como DNI.
                      </p>
                    )}
                  </div>

                  {esIndocumentado ? (
                    <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs font-bold text-amber-700">
                        Persona registrada como INDOCUMENTADA. Se generará
                        automáticamente un identificador provisorio (ej.
                        IND-000001). No se solicitan trámite ni CUIL.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                          {etiquetaNumeroDocumento}
                        </label>
                        <input
                          type="text"
                          disabled={isEmailLocked}
                          className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none ${
                            isEmailLocked
                              ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                              : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                          }`}
                          value={formData.documento_numero}
                          onChange={onInputChange}
                          name="documento_numero"
                        />
                      </div>
                      {esDni && !esFallecida && (
                        <div className="md:col-span-2 p-4 bg-secondary-50 border border-secondary-200 rounded-xl">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                                Nº de Trámite
                              </label>
                              <input
                                type="text"
                                disabled={isEmailLocked}
                                className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none ${
                                  isEmailLocked
                                    ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                                    : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                                }`}
                                value={formData.tramite}
                                onChange={onInputChange}
                                name="tramite"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2 block">
                                CUIL
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  maxLength={2}
                                  placeholder="20"
                                  className="w-16 px-3 py-2 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 text-center focus:ring-2 focus:ring-primary-500 outline-none"
                                  value={formData.CUIL_prefijo}
                                  onChange={(e) =>
                                    onFieldChange(
                                      "CUIL_prefijo",
                                      e.target.value.replace(/\D/g, ""),
                                    )
                                  }
                                />
                                <span className="text-secondary-400 font-black">
                                  -
                                </span>

                                {/* AQUÍ VA EL READONLY: */}
                                <input
                                  type="text"
                                  readOnly
                                  tabIndex={-1}
                                  placeholder="DNI"
                                  className="flex-1 px-3 py-2 bg-secondary-100 border border-secondary-300 rounded-xl text-sm font-bold text-secondary-600 text-center cursor-not-allowed outline-none"
                                  value={formData.documento_numero}
                                />

                                <span className="text-secondary-400 font-black">
                                  -
                                </span>
                                <input
                                  type="text"
                                  maxLength={1}
                                  placeholder="8"
                                  className="w-14 px-3 py-2 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 text-center focus:ring-2 focus:ring-primary-500 outline-none"
                                  value={formData.CUIL_sufijo}
                                  onChange={(e) =>
                                    onFieldChange(
                                      "CUIL_sufijo",
                                      e.target.value.replace(/\D/g, ""),
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* STEP 3: LUGAR DE NACIMIENTO */}
            {!esFallecida && currentStep === 3 && (
              <section>
                <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Fecha y Lugar de Nacimiento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.nacimiento_fecha}
                      onChange={onInputChange}
                      name="nacimiento_fecha"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      País
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.nacion_id}
                      onChange={onInputChange}
                      name="nacion_id"
                    >
                      <option value="">Seleccionar...</option>
                      {nacions.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Provincia
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.provincia_id}
                      onChange={(e) => onProvinciaChange(e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      {provincias.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Departamento
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
                      value={formData.departamento_id}
                      onChange={(e) => onDepartamentoChange(e.target.value)}
                      disabled={!formData.provincia_id}
                    >
                      <option value="">Seleccionar...</option>
                      {departamentos.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Localidad
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
                      value={formData.localidad_id}
                      onChange={onInputChange}
                      name="localidad_id"
                      disabled={!formData.departamento_id}
                    >
                      <option value="">Seleccionar...</option>
                      {localidades.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 4: SEXO Y GÉNERO */}
            {!esFallecida && currentStep === 4 && (
              <section>
                <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Sexo y Género
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Sexo
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.sexo_id}
                      onChange={onInputChange}
                      name="sexo_id"
                    >
                      <option value="">Seleccionar...</option>
                      {sexos.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Género
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.genero_id}
                      onChange={onInputChange}
                      name="genero_id"
                    >
                      <option value="">Seleccionar...</option>
                      {generos.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 5: CONTACTO Y RESUMEN */}
            {!esFallecida && currentStep === 5 && (
              <section className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Contacto y Resumen
                  </h3>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Email de Contacto
                    </label>
                    <input
                      type="email"
                      disabled={isEmailLocked}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold lowercase outline-none ${
                        isEmailLocked
                          ? "bg-secondary-100 text-secondary-400 cursor-not-allowed"
                          : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                      }`}
                      value={formData.email}
                      onChange={(e) =>
                        onFieldChange("email", e.target.value.toLowerCase())
                      }
                    />
                  </div>
                </div>

                <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-secondary-500 uppercase tracking-widest flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Ficha de Resumen
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Nombre
                      </p>
                      <p className="font-black text-secondary-900 uppercase">
                        {formData.apellido} {formData.nombre}
                      </p>
                    </div>
                    {formData.nombre_alternativo && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                          Nombre Social
                        </p>
                        <p className="font-bold text-secondary-900 uppercase">
                          {formData.nombre_alternativo}
                        </p>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Documento
                      </p>
                      <p className="font-bold text-secondary-900 uppercase">
                        {formData.documento_numero
                          ? `${formData.documento_numero}`
                          : "—"}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Sexo / Género
                      </p>
                      <p className="font-bold text-secondary-900 uppercase">
                        {sexos.find(
                          (s) => String(s.id) === String(formData.sexo_id),
                        )?.nombre || "—"}{" "}
                        /{" "}
                        {generos.find(
                          (g) => String(g.id) === String(formData.genero_id),
                        )?.nombre || "—"}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Fecha de Nacimiento
                      </p>
                      <p className="font-bold text-secondary-900">
                        {formData.nacimiento_fecha || "—"}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Lugar de Nacimiento
                      </p>
                      <p className="font-bold text-secondary-900 uppercase">
                        {nacions.find(
                          (n) => String(n.id) === String(formData.nacion_id),
                        )?.nombre || "—"}
                        {formData.localidad_id && " · "}
                        {localidades.find(
                          (l) => String(l.id) === String(formData.localidad_id),
                        )?.nombre || ""}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Email
                      </p>
                      <p className="font-bold text-secondary-900 lowercase">
                        {formData.email || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
          {/* Footer del Stepper */}
          <div className="px-8 py-4 border-t border-secondary-100 bg-white flex items-center gap-3 mt-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all active:scale-[0.98]"
            >
              Cancelar
            </button>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={onPrevStep}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-secondary-300 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-100 transition-all active:scale-[0.98]"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
            )}
            <div className="flex-1" />
            {currentStep < etapasVisibles.length ? (
              <button
                key="btn-next"
                type="button"
                onClick={onNextStep}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-[0.98] shadow-lg"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                key="btn-submit"
                type="submit"
                disabled={isSavingPersona}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSavingPersona
                  ? "Guardando..."
                  : isEditMode
                    ? "Guardar Cambios"
                    : "Guardar Registro"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
