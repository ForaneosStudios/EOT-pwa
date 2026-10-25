# Echoes of the Throne - Cliente Web PWA

## Autenticación con Supabase

1. Copia `.env.example` a `.env.local`. Usa la URL y la clave **publishable** del
   proyecto Supabase y la URL de la API Spring. Nunca coloques una clave secreta
   o `service_role` en variables `VITE_`.
2. En Supabase, configura Authentication → URL Configuration: establece el
   origen de la aplicación y agrega la URL exacta de confirmación a Redirect
   URLs. Para este entorno de ejemplo es `http://localhost:3000/auth/confirm`.
   En producción utiliza la URL HTTPS real de la aplicación.
3. Inicia el backend con el issuer de ese mismo proyecto y permite el origen del
   frontend en `APP_CORS_ALLOWED_ORIGINS`. Inicia el frontend con:

   ```powershell
   npm install
   npm run dev -- --port 3000 --strictPort
   ```

El registro solicita confirmación por correo si el proyecto la exige. La página
`/auth/confirm` muestra el resultado y permite reenviar el enlace; el primer
inicio de sesión crea el perfil de Spring usando el nombre elegido al registrarse.
Si el nombre ya existe, el perfil no puede crearse automáticamente y el usuario
necesita elegir otro o solicitar asistencia. La PWA usa exclusivamente la clave
publicable, mientras Supabase gestiona los tokens de sesión.

El enlace solo funciona en un navegador que pueda acceder al origen configurado:
`localhost` siempre se refiere al propio dispositivo. La plantilla del correo
se administra por separado en Supabase y no se cambia con este frontend.

Repositorio principal para el cliente web de la comunidad, diseñado como una Aplicación Web Progresiva (PWA) utilizando React, Vite y Tailwind CSS.

## Propuesta de Arquitectura e Interfaz

### 1. Consumo de API y Gestión de Datos

La aplicación opera como un cliente independiente (`EOT_frontend`) que consume servicios RESTful de una única fuente de verdad (`EOT_backend`).

- **Integración de Endpoints:** La comunicación de red se gestiona mediante **Axios**, estandarizando las peticiones HTTP hacia el servidor de Spring Boot.
- **Intercepción y Seguridad:** La autenticación se delega a Supabase. Se implementa un interceptor global en Axios que extrae el JWT de la sesión actual y lo inyecta automáticamente en la cabecera `Authorization` de cada solicitud enviada al backend.
- **Renderizado Dinámico:** Los componentes de React procesan las respuestas JSON para construir la interfaz en tiempo real. Esto incluye el renderizado recursivo de la tabla `posts` para el foro y la consulta a la base de datos de la tabla `user_achievements` para mostrar el progreso de logros en tiempo real.

### 2. Estrategia PWA (Soporte Offline y Configuración Integrada)

La conversión a PWA se gestiona en tiempo de compilación utilizando el ecosistema de Workbox, centralizando tanto las estrategias de caché como los metadatos de instalación directamente en la configuración de Vite.

- **Estrategias de Caché Híbridas:**
  - _Cache-First (App Shell):_ Todos los recursos estáticos (HTML, JS y utilidades de Tailwind) se almacenan en el dispositivo durante la instalación. Esto asegura que la estructura visual cargue de inmediato al abrirse.
  - _Network-First (API):_ Las consultas a la base de datos (foro, perfiles y **logros**) intentan siempre acceder a la red. Si el usuario pierde conexión, el Service Worker intercepta el fallo y devuelve la última versión de los datos guardada en caché, permitiendo consultar los logros y leer el foro sin internet.

- **Configuración Centralizada (`vite.config.js`):**

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Echoes of the Throne",
        short_name: "EOT",
        description: "Foro de la comunidad y seguimiento de logros",
        theme_color: "#1a202c",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/dominio-del-backend\.com\/api\/.*/i, //En espera del dominio
            handler: "NetworkFirst",
            options: {
              cacheName: "foro-y-logros-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 días offline
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### 3. Experiencia de Usuario (UI/UX)

La vista principal prioriza la retroalimentación inmediata y la adaptabilidad de los componentes.

- **Estructuración Modular en JavaScript:** La interfaz se descompone en componentes funcionales y reutilizables de React (ej. `<CategoryList>`, `<ThreadView>`, `<PostReply>`).
- **Diseño Adaptativo:** Se prescinde de hojas de estilo CSS tradicionales en favor de **Tailwind CSS**. Mediante clases de utilidad y sistemas de cuadrícula (Grid/Flexbox), la maquetación se ajusta fluidamente a cualquier resolución móvil o de escritorio.

La interfaz visual refleja la atmósfera de fantasía oscura del juego, definida por un sistema de diseño estricto aplicable tanto en Figma como en Tailwind CSS.

#### Paleta de Colores
*   **Brand Colors (Protagonistas visuales):**
    *   `Primary / Crimson`: `#9E2A2B` (Rojo carmesí para botones y barras de progreso).
    *   `Secondary / Gold`: `#C8A97E` (Oro envejecido para iconos y bordes).
*   **UI & Surface Colors (Atmósfera oscura):**
    *   `Background / Void`: `#0C0808` (Negro profundo para el fondo de la pantalla y menú lateral).
    *   `Surface / Panel`: `#1D1D1D` (Borgoña oscuro/cacao para tarjetas, foro y contenedores).
*   **Text Colors (Tipografía legible):**
    *   `Text High / Parchment`: `#E6D5B8` (Color pergamino principal para encabezados y lectura).
    *   `Text Muted`: `#8C7D73` (Marrón/gris apagado para subtítulos y placeholders).
    *   `White`: `#FFFFFF` (Para contrastes puros ocasionales).
*   **State Colors (Colores funcionales):**
    *   `Info`: `#2F80ED` | `Success`: `#27AE60` | `Warning`: `#E2B93B` | `Error`: `#EB5757`.

#### Tipografía
**Encabezados - Cinzel (Google Fonts)**
*   **Heading 1:** 56 px | Line Height: 61.6 px *(Títulos de página principales, ej. "El Códice")*
*   **Heading 2:** 48 px | Line Height: 52.8 px
*   **Heading 3:** 40 px | Line Height: 44 px
*   **Heading 4:** 32 px | Line Height: 35.2 px *(Títulos de secciones o modales)*
*   **Heading 5:** 24 px | Line Height: 26.4 px *(Nombres de tarjetas de logros)*
*   **Heading 6:** 20 px | Line Height: 22 px *(Opciones del menú lateral)*

**Texto de Lectura - Inter (Google Fonts)**
*   **Large Text (Bold/Regular):** 20 px | Line Height: 28 px
*   **Medium Text (Bold/Regular):** 18 px | Line Height: 26 px
*   **Normal Text (Bold/Regular):** 16 px | Line Height: 24 px
*   **Small Text (Bold/Regular):** 14 px | Line Height: 22 px

#### Sistema de Cuadrícula (Grid) y Espaciado
*   **Desktop (1440px y 1024px):** 12 columnas | Gutter: 30px | Column width: 65px / 50px
*   **Tablet (768px):** 8 columnas | Gutter: 24px | Column width: 88px
*   **Mobile (320px):** 4 columnas | Gutter: 16px | Column width: 130px
*   **Spacing Scale:** 8 px, 16 px, 24 px, 32 px, 40 px, 56 px, 72 px, 80 px, 96 px, 120 px.

#### Componentes UI (Formas completamente rectangulares: **0px Corner Radius**)
*   **Textfields (Campos de texto):** Fondo transparente. Bordes de 1px (`#8C7D73` inactivo, `#C8A97E` focus, `#27AE60` success, `#E2B93B` warning, `#9E2A2B` error). Labels en Cinzel (`#C8A97E` o `#E6D5B8`). Placeholders en Inter (`#8C7D73`), texto ingresado en Inter (`#E6D5B8`).
*   **Dropdown:** Caja transparente, lista desplegada `#1D1D1D`. Opción activa fondo `#9E2A2B` con texto `#E6D5B8`.
*   **Checkbox & Radio:** Checkbox inactivo borde `#8C7D73`, activo relleno `#9E2A2B` con check `#E6D5B8`. Radio inactivo borde `#8C7D73`, activo borde `#C8A97E` y centro `#9E2A2B`.
*   **Toggle:** Fondo inactivo `#0C0808` (borde `#8C7D73`). Fondo activo `#9E2A2B` (deslizante `#C8A97E`).
*   **Tabs:** Línea base `#8C7D73`. Tab activa: texto `#E6D5B8` y línea gruesa `#9E2A2B`. Tab inactiva: texto `#8C7D73`.
*   **Pagination & Breadcrumbs:** Página/migaja actual destacada en `#9E2A2B`. Inactivas en `#8C7D73`.
*   **Date Picker:** Día seleccionado como círculo de color `#9E2A2B`.
*   **Buttons (Botones):** Todos con **0px Corner Radius** (iconos son cuadrados perfectos). 
    *   *Primary:* Fondo `#9E2A2B`, texto `#E6D5B8`.
    *   *Secondary:* Fondo `#C8A97E`, texto `#E6D5B8`.
    *   *Tipografía:* Cinzel en MAYÚSCULAS.
    *   *Outline:* Fondo transparente, bordes y texto en Crimson o Gold.

### 4. Flujo de Navegación e Interacción del Usuario

El diagrama de flujo detalla la experiencia de usuario dentro de la PWA, estructurando los permisos de visualización y el ciclo de vida de la sesión:

- **Vista Inicial Pública:** El acceso para invitados es limitado. Los usuarios no autenticados solo pueden visualizar una versión resumida de la historia y algunas imágenes representativas del archivo, con el objetivo de redirigirlos al botón de inicio de sesión.

- **Proceso de Autenticación y Registro:** Para crear una cuenta nueva, el flujo intercepta al usuario con un modal obligatorio de términos y condiciones. Al ingresar las credenciales, el formulario se envía para la validación del token JWT. Si es exitoso, el usuario pasa al entorno privado.

- **Navegación Privada de Usuarios:** Con la sesión activa, el usuario desbloquea la navegación completa desde el panel de inicio. Esto incluye el acceso a las Crónicas, el catálogo de El Archivo, su Perfil personal y el apartado de Logros.

- **Interactuar en el Foro y Modo Offline (Caché):** Los usuarios autenticados pueden acceder al detalle del foro para responder a los hilos de la comunidad. Dado que tanto los foros como los logros provienen de la base de datos, el Service Worker intercepta estas consultas; si no hay internet, sirve los datos directamente desde la caché local para asegurar el acceso continuo a esta información.

## Documentación Visual

- **Diseño UI/UX (Figma):** [Ver Primeras Pantallas y Style Guide](https://www.figma.com/design/sfKcOzBE74mSDr5pKc3yvF/Echoes-of-the-Throne-%E2%80%94-PWA-%7C-Primeras-pantallas?node-id=0-1&t=U6kaJztwZhtBkyTU-1) (Contiene los mockups de la aplicación y la guía de estilos completa).

- **Esquema de Base de Datos:** [Ver diagrama `database_schema.png`](docs/database_schema.png) (Detalla las relaciones entre `users`, `achievements`, y la jerarquía de `categories`, `threads` y `posts`).
- **Flujo de Navegación del Usuario:** [Ver diagrama `user_flow.png`](docs/user_flow.png) (Muestra la vista pública, el registro y la autenticación con JWT, la navegación privada y el modo offline).
- **Arquitectura de Ecosistema:** [Ver diagrama `network_architecture.png`](docs/network_architecture.png) (Ilustra el puente orquestador entre EOT_backend y los clientes EOT_frontend, Unity y la App Móvil).
