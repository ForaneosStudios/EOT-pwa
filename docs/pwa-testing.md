# Verificación de la PWA

Para probar instalación y conexión sin depender del modo de desarrollo:

1. Ejecuta `npm ci`, `npm run build` y `npm run preview` en localhost, o publica
   el build en un entorno HTTPS. Abre la aplicación en un navegador compatible.
2. Espera a que se active el service worker y verifica que el manifiesto y sus
   iconos se carguen. En navegadores compatibles aparecerá la opción «Instalar»;
   el navegador puede ofrecer su propio menú de instalación.
3. Visita la aplicación con conexión, desactiva la red desde las herramientas
   del navegador y recarga. El shell previamente almacenado debe abrirse y se
   debe mostrar el aviso de conexión. Los datos remotos y el inicio de sesión
   requieren conexión; una indicación de conexión no garantiza que el servidor
   esté disponible.
4. Reactiva la red y verifica que el aviso desaparezca.
5. Con sesión iniciada y sin red, publica un comentario: queda como pendiente en
   el aviso superior. Al reactivar la red se envía una sola vez.
6. Para comprobar que no hay duplicados, usa throttling «Slow 3G», publica y corta
   la red antes de la respuesta. Al reconectar, la respuesta repetida debe llevar
   `Idempotency-Replayed: true` y el comentario debe existir una sola vez.

Las escrituras de la API se encolan con una Idempotency-Key (ver
`docs/tecnica/04-pwa-calidad-y-pruebas.md`, sección «Cola de escrituras offline e
idempotencia»). Las operaciones de autenticación nunca se almacenan para reenvío.

## Pruebas end-to-end (Playwright)

```
npm run test:e2e          # compila la app, la sirve y ejecuta todos los specs
npm run test:e2e:ui       # modo interactivo
npm run test:e2e:report   # abre el último reporte HTML
```

Corren en Chromium contra el build de producción (service worker y manifiesto reales). Supabase y la API
se simulan en la red del navegador (`e2e/support/mockBackend.js`), de modo que no dependen de servicios
externos ni de credenciales. El mock guarda las peticiones recibidas y puede fallar a propósito (conexión
caída, respuesta perdida, `STALE_WRITE`), lo que permite probar la cola offline con la red cortada de verdad.

| Spec | Cubre |
|---|---|
| `public.spec.js` | Portada, anclas, imágenes, rutas desconocidas y protegidas |
| `auth.spec.js` | Login, registro, sesión, cierre de sesión, roles y sesión expirada |
| `forum.spec.js` | Hilos, comentarios, edición, borrado y reportes |
| `offline-queue.spec.js` | Cola offline, reenvío único, respuesta perdida, duplicados, orden, dos pestañas, `STALE_WRITE`, cierre de sesión con pendientes |
| `pwa.spec.js` | Manifiesto, iconos, service worker, shell sin conexión, sin caché de la API |
| `responsive.spec.js` | Diseño en teléfono (proyecto `mobile`): sin scroll lateral, objetivos táctiles, menú, diálogos |
