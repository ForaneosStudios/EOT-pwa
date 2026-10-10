# Echoes of the Throne - Cliente Web PWA

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

### 4. Flujo de Navegación e Interacción del Usuario

El diagrama de flujo detalla la experiencia de usuario dentro de la PWA, estructurando los permisos de visualización y el ciclo de vida de la sesión:

- **Vista Inicial Pública:** El acceso para invitados es limitado. Los usuarios no autenticados solo pueden visualizar una versión resumida de la historia y algunas imágenes representativas del archivo, con el objetivo de redirigirlos al botón de inicio de sesión.

- **Proceso de Autenticación y Registro:** Para crear una cuenta nueva, el flujo intercepta al usuario con un modal obligatorio de términos y condiciones. Al ingresar las credenciales, el formulario se envía para la validación del token JWT. Si es exitoso, el usuario pasa al entorno privado.

- **Navegación Privada de Usuarios:** Con la sesión activa, el usuario desbloquea la navegación completa desde el panel de inicio. Esto incluye el acceso a las Crónicas, el catálogo de El Archivo, su Perfil personal y el apartado de Logros.

- **Interactuar en el Foro y Modo Offline (Caché):** Los usuarios autenticados pueden acceder al detalle del foro para responder a los hilos de la comunidad. Dado que tanto los foros como los logros provienen de la base de datos, el Service Worker intercepta estas consultas; si no hay internet, sirve los datos directamente desde la caché local para asegurar el acceso continuo a esta información.

## Documentación Visual

- **Esquema de Base de Datos:** [Ver diagrama `database_schema.png`](docs/database_schema.png) (Detalla las relaciones entre `users`, `achievements`, y la jerarquía de `categories`, `threads` y `posts`).
- **Flujo de Navegación del Usuario:** [Ver diagrama `user_flow.png`](docs/user_flow.png) (Muestra la vista pública, el registro y la autenticación con JWT, la navegación privada y el modo offline).
- **Arquitectura de Ecosistema:** [Ver diagrama `network_architecture.png`](docs/network_architecture.png) (Ilustra el puente orquestador entre EOT_backend y los clientes EOT_frontend, Unity y la App Móvil).
