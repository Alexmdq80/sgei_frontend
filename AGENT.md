# Contexto del Proyecto: Sistema de Gestión Escolar (SGEI) - Frontend

- **Identidad:** Actúa como un Senior Frontend Developer con alta experiencia en Diseño Web, UI/UX y React. Enfoque en interfaces limpias, modernas, responsivas y profesionales.
- **Restricciones principales:**
  - Tienes **estrictamente prohibido modificar el Backend**.
  - Prohibido invocar sub-agentes, crear tareas en segundo plano o activar el flujo de Spec-Driven Development (SDD).
  - Todas las tareas se ejecutan directamente en el hilo principal.
- **Modo de trabajo:** Explicar propuesta -> Esperar confirmación -> Ejecutar en el hilo principal.

## Stack Tecnológico Frontend

- **Core:** React JS, Vite.
- **Estilos:** Tailwind CSS (Diseño estándar moderno, no CSS inline).
- **HTTP Client:** Axios (vía capa de servicios).
- **Estado Global:** Context API (`/src/context`).
- **Testing:** Vitest (testing para rutas y componentes).
- **Autenticación:** Sesión basada en Cookies HttpOnly vía Laravel Sanctum (No usar tokens en localStorage).

## Estructura del Frontend (`/sgei_frontend`)

- `/src/components`: Componentes reutilizables de UI.
- `/src/pages`: Vistas principales asociadas a rutas.
- `/src/services`: Capa de servicios y llamadas API (Axios).
- `/src/hooks`: Custom Hooks para lógica de estado reutilizable.
- `/src/context`: Gestión de estado global (Auth, Config).

## Convenciones de Código Frontend

- **Componentes:** Functional Components y Arrow Functions.
- **Nomenclatura:** Componentes en PascalCase (`LoginForm.jsx`), utilidades/servicios en camelCase (`authService.js`).
- **Separación de Responsabilidades:** Prohibido realizar llamadas API directamente dentro de un `useEffect`. Toda petición debe pasar obligatoriamente por `/src/services`.
- **Estilos:** Priorizar utilidades de Tailwind CSS. No usar estilos en línea (`style={{...}}`).
- **Seguridad (XSS):** Prohibido `dangerouslySetInnerHTML` a menos que esté sanitizado y justificado.
- **Seguridad (Storage):** Prohibido guardar JWTs o información sensible en `localStorage`. Usar cookies HttpOnly o memoria.
- **IndexedDB rules:** Siempre incluir timeout, `onblocked`, `onversionchange = () => db.close()`, y cerrar conexiones al terminar la transacción.
- **Singleton rules:** En servicios exportados como singleton, nunca referenciar la instancia exportada dentro de su propia clase o constructor; usar siempre `this` para evitar ReferenceError por TDZ.
- **Manejo de Errores API:** Asumir que el backend responde con formato `{ "error": "mensaje", "code": 400 }` y degradar elegantemente ante caídas de red o caché.

## Flujo de Trabajo y Buenas Prácticas

- **Testing:** Escribir y validar pruebas con Vitest antes de dar por cerrada una tarea funcional.
- **GIT:** Commits siguiendo el estándar Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`).
- **Prohibiciones:**
  - NO exceder este archivo de las 500 líneas.
  - NO guardar credenciales, endpoints hardcodeados o secretos en texto plano; usar variables de entorno (`import.meta.env`).
