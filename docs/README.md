# Laboratorio de Pruebas 1: PWA + Backend + Base de Datos

**Universidad Tecnológica del Estado de Chihuahua**
**Proyecto:** Echoes of the Throne (EOT)
**Equipo 1, Foráneos studios:** Judith Estefanía Hernández Pérez, Jose Iván Solorio Serna, Emmanuel Ulises Rochín Vargas, Jesús Ernesto Fierro Sandoval, Jesús Eduardo Aceves Aguirre
**Materia:** 10N Aplicaciones Web Progresivas | **Docente:** Alfonso Barroso
**Carrera:** Desarrollo y Gestión de Software | **Grupo:** IDGS101N | **Fecha:** 14/10/2026

---

## 1. Objetivo

Validar la integración entre una PWA (React, Vite, Tailwind y Axios), un backend en Spring Boot con Spring Security y una base de datos PostgreSQL en Supabase: ejecución de consultas, renderización de datos, persistencia de nuevos registros, integridad de la información y comportamiento offline.

## 2. Arquitectura y entorno

| Componente | Tecnología | Versión | Puerto |
|---|---|---|---|
| Frontend | React, Tailwind, Axios, Vite (vite-plugin-pwa / Workbox) | 19.2.8 / 4.3.3 / 1.20.0 | 4173 (`vite preview`) |
| Backend | Spring Boot + Spring Security (Java 21, Maven) | 4.1.1 | 8080 |
| Base de datos | PostgreSQL en Supabase (us-east, pooler), contraseñas con BCrypt | n/a | 5432 |
| Runtime frontend | Node.js | 24.22.0 | n/a |

Entorno: Windows 11, Google Chrome 155, VS Code (`mvn spring-boot:run`), SQL Editor de Supabase y Postman. Todo en localhost.

## 3. Endpoints bajo prueba

| Método | Ruta | Descripción | Respuesta esperada |
|---|---|---|---|
| POST | `/api/v1/users` | Registro de usuario (`username`, `email`, `password`) | 201 Created |
| POST | `/api/v1/users/login` | Inicio de sesión (`email`, `password`) | 200 OK / 401 si las credenciales son inválidas |
| GET | `/api/v1/users` | Listado de usuarios (público, sin token) | 200 OK |

## 4. Scripts de carga y limpieza

En [`01-db/`](01-db/):

| Archivo | Propósito |
|---|---|
| `schema.sql` | Estructura de la tabla `users` (PK UUID, `username` y `email` UNIQUE) |
| `seed.sql` | 3 usuarios de prueba (`@lab.test`, contraseña `SuperSecretPassword123!` con hash BCrypt) |
| `cleanup.sql` | Elimina únicamente los usuarios `@lab.test` |
| `queries-evidencia.sql` | Consultas usadas antes y después del registro |

## 5. Evidencias

### Base de datos
| Captura | Descripción |
|---|---|
| [`01-db/01-antes.png`](01-db/01-antes.png) | La tabla `users` tiene 3 registros antes del envío |
| [`01-db/02-despues.png`](01-db/02-despues.png) | Después del registro la tabla tiene 4; el nuevo tiene UUID y contraseña con hash BCrypt |

### Logs del backend
| Captura | Descripción |
|---|---|
| [`02-backend/01-consola-spring-boot.png`](02-backend/01-consola-spring-boot.png) | Consultas `select` (listado y validación de username/email) e `insert` ejecutados por Hibernate |

### Frontend y PWA
| Captura | Descripción |
|---|---|
| [`03-frontend/01-get-postman.png`](03-frontend/01-get-postman.png) | GET `/api/v1/users`: 200 OK en 229 ms con los 3 usuarios del seed (Postman) |
| [`03-frontend/02-network-post-headers.png`](03-frontend/02-network-post-headers.png) | Network: POST `/api/v1/users`, 201 Created |
| [`03-frontend/03-network-post-timing.png`](03-frontend/03-network-post-timing.png) | Timing del POST: espera del servidor 989.23 ms, total 1.09 s |
| [`03-frontend/04-service-worker-registro.png`](03-frontend/04-service-worker-registro.png) | Registro de `/sw.js` con scope `/` |
| [`03-frontend/05-service-worker-activo.png`](03-frontend/05-service-worker-activo.png) | Service Worker #543 "activated and is running" |
| [`03-frontend/06-local-storage-sesion.png`](03-frontend/06-local-storage-sesion.png) | Local storage con la clave `eot.session` |
| [`03-frontend/07-offline-network.png`](03-frontend/07-offline-network.png) | Modo Offline: la petición `login` queda detenida (Stalled) |
| [`03-frontend/08-offline-login.png`](03-frontend/08-offline-login.png) | Sin conexión la app avisa "Necesitas internet para iniciar sesión" |

## 6. Resultados

| Operación | Herramienta | Status | Latencia total | Tiempo en backend | Tamaño |
|---|---|---|---|---|---|
| GET listado | Postman | 200 OK | 229.34 ms | 43.12 ms | ≈ 1 KB |
| POST registro | DevTools (Network) | 201 Created | 1.09 s | 989.23 ms | 1.4 KB |

## 7. Limitaciones y mejoras

- JWT y sesiones incompletos: el login responde con los datos del usuario y `accessToken` queda en `null`.
- Todos los endpoints son públicos (`permitAll`), incluido `GET /api/v1/users`, que expone correos.
- Sin conexión el login y el registro no se completan; falta estrategia de caché y sincronización offline.
- Faltan roles de usuario y vistas diferenciadas.
- Mejoras: JWT correcto (expiración, refresh, header `Authorization`), roles ADMIN/USER, proteger el listado y agregar caché y sincronización offline para datos no sensibles.

## 8. Conclusiones

Se validó la integración entre la PWA, el backend y Supabase: el GET respondió 200 OK con los usuarios almacenados y el POST respondió 201 Created y persistió el registro (la tabla pasó de 3 a 4 registros). Se comprobó la integridad (hash BCrypt, UUID, restricciones UNIQUE y validación de duplicados antes de insertar). El Service Worker se registra y permanece activo, y sin conexión la aplicación informa que necesita internet para iniciar sesión.

## 9. Cómo reproducir

```powershell
# Variables de entorno (PowerShell)
$env:SUPABASE_DB_URL  = "jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres"
$env:SUPABASE_DB_USER = "postgres.<ref-del-proyecto>"
$env:SUPABASE_DB_PASS = "<contraseña>"

mvn spring-boot:run                  # backend
npm run build && npm run preview     # frontend -> http://localhost:4173
```

Antes de probar, ejecutar `01-db/cleanup.sql` y `01-db/seed.sql` en Supabase.
