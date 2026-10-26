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

Esta rama no implementa una cola de escrituras. Las operaciones de autenticación
no deben almacenarse para reenvío y las futuras operaciones del foro necesitan
una estrategia de identidad, confirmación y prevención de duplicados antes de
sincronizarse automáticamente. Los iconos y la política de caché de API se
incluyen en el PR de perfil y deben integrarse antes de validar la instalación
completa de esta rama.
