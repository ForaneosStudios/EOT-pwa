// Legal texts of the PWA. Bump LEGAL_VERSION whenever either text changes: it is stored with each
// account's acceptance so we can tell which version a player agreed to.
export const LEGAL_VERSION = '2026-11-26';

const CONTACT = 'fierroernesto5@gmail.com';

export const legalDocuments = {
  terminos: {
    title: 'Términos y condiciones',
    eyebrow: 'Echoes of the Throne · PWA',
    updated: LEGAL_VERSION,
    intro: 'Estos términos regulan el uso de la aplicación web progresiva de Echoes of the Throne (eot-pwa.vercel.app), en adelante «la PWA». Al crear una cuenta o usarla aceptas estos términos y el aviso de privacidad.',
    sections: [
      { title: '1. Uso del servicio', items: [
        'Debes dar datos verdaderos, mantener tu contraseña en secreto y responder por la actividad de tu cuenta.',
        'Tu nombre de usuario no puede ser ofensivo, imitar a administradores ni incluir datos personales de otras personas.',
        'El foro y el chat son para convivir: no publiques contenido ilegal, de odio, acoso, spam o que infrinja derechos de terceros, ni uses el chat para acosar o enviar contenido sexual no solicitado.',
        'No intentes acceder a la API o a la base de datos sin autorización, saturar el servicio ni eludir sus límites de peticiones.',
        'Si usas una foto de perfil, debe ser tuya (o contar con el permiso de la persona que aparece en ella) y no puede ser ofensiva, ilegal ni mostrar a terceros sin su consentimiento.',
        'Podemos moderar o eliminar contenido, incluida tu foto de perfil, y suspender cuentas que incumplan estas reglas.',
      ] },
      { title: '2. Contenido de los usuarios', paragraphs: [
        'Conservas la titularidad de lo que publicas. Nos concedes una licencia no exclusiva, gratuita y limitada a mostrarlo dentro de la PWA mientras esté publicado. Puedes eliminar tu contenido en cualquier momento.',
        'Foto de perfil (opcional): puedes tomarte una foto con la cámara de tu dispositivo para usarla como retrato. Al aceptarlo confirmas que quieres que se muestre junto a tu nombre de usuario a otros jugadores y a cualquier persona que consulte el foro o el ranking, tenga o no cuenta. Puedes quitarla cuando quieras desde tu perfil o elegir un avatar del catálogo, y no es obligatoria para usar la PWA.',
      ] },
      { title: '3. Disponibilidad', paragraphs: [
        'La PWA se ofrece «tal cual». Puede haber interrupciones por mantenimiento o por los límites de los planes gratuitos de alojamiento. El modo sin conexión muestra la última información guardada en tu dispositivo, que puede no estar actualizada.',
      ] },
      { title: '4. Propiedad intelectual', paragraphs: [
        'El contenido de la PWA (textos, arte, marca y código) es propiedad de Foráneos Studios o de sus licenciantes. Te concedemos una licencia personal y revocable para usarla.',
      ] },
      { title: '5. Limitación de responsabilidad', paragraphs: [
        'En la medida que permita la ley, no respondemos por daños indirectos, pérdida de datos o interrupciones del servicio. Nada de esto limita derechos irrenunciables que te reconozca la ley de tu país.',
      ] },
      { title: '6. Edad', paragraphs: [
        'El servicio está dirigido a personas de 15 años o más. Si eres menor, debes contar con la autorización de tu madre, padre o tutor.',
      ] },
      { title: '7. Ley aplicable y jurisdicción', paragraphs: [
        'Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a los tribunales competentes de Chihuahua, Chihuahua, sin perjuicio de los derechos que te reconozca la ley de tu país de residencia.',
      ] },
      { title: '8. Cambios', paragraphs: [
        'Podemos actualizar estos documentos. La versión vigente se publica con su fecha y, si el cambio es sustancial, te avisaremos antes de que entre en vigor.',
      ] },
      { title: '9. Contacto', paragraphs: [`Para dudas sobre estos documentos: ${CONTACT}.`] },
    ],
  },

  privacidad: {
    title: 'Aviso de privacidad',
    eyebrow: 'Echoes of the Throne · PWA',
    updated: LEGAL_VERSION,
    intro: 'Responsable del tratamiento: Foráneos Studios, con domicilio en Universidad Tecnológica de Chihuahua, Chihuahua, Chihuahua, México, y correo de privacidad ' + CONTACT + '. Este aviso explica qué datos recabamos al usar la PWA, para qué los usamos, con quién se comparten y cómo ejercer tus derechos.',
    sections: [
      { title: '1. Datos que recabamos', table: {
        head: ['Categoría', 'Datos', 'Cuándo'],
        rows: [
          ['Cuenta', 'Correo, nombre de usuario y contraseña (la gestiona y cifra Supabase Auth; el backend no la guarda), identificador y rol.', 'Al registrarte o iniciar sesión.'],
          ['Perfil', 'Avatar elegido de un catálogo y fechas de creación y edición.', 'Al crear o editar tu perfil.'],
          ['Foto de perfil (opcional)', 'Una imagen de tu rostro de 256 × 256 px tomada con la cámara de tu dispositivo y la fecha en que aceptaste mostrarla. Se guarda sin metadatos (ubicación, modelo del dispositivo, etc.).', 'Solo si presionas «Tomar foto con la cámara» y aceptas.'],
          ['Foro y chat', 'Temas, comentarios, respuestas, mensajes privados (solo visibles para sus participantes) y reportes con su motivo.', 'Al usar el foro, el chat o reportar contenido.'],
          ['Progreso', 'Logros, mejor tiempo y ranking que consultes en la PWA.', 'Cuando el juego o tú actualizan tus datos.'],
          ['Datos técnicos', 'Dirección IP en registros de seguridad de los servidores, navegador y versión de la PWA.', 'Automáticamente al conectarte.'],
          ['En tu dispositivo', 'Sesión del navegador, caché de lecturas por cuenta para verla sin conexión y cola de acciones pendientes.', 'Se borra al cerrar sesión.'],
        ],
      }, paragraphs: ['No recabamos datos sensibles ni datos de pago.'] },
      { title: '2. Para qué usamos tus datos', items: [
        'Prestar el servicio: crear y mantener tu cuenta y mostrar tus logros, tu ranking, el foro y el chat.',
        'Mostrar tu foto de perfil, si decides ponerla, junto a tu nombre de usuario en el foro y el ranking. No la usamos para identificarte, para reconocimiento facial ni para publicidad.',
        'Funcionar sin conexión: guardar en tu dispositivo la última información consultada, separada por cuenta, y enviar después las acciones hechas sin internet.',
        'Seguridad: limitar intentos de recuperación de contraseña, evitar publicaciones duplicadas y detectar uso indebido.',
        'Comunicaciones del servicio: correos de confirmación y de recuperación de contraseña. No enviamos publicidad sin tu consentimiento.',
      ], paragraphs: ['No usamos tus datos para publicidad personalizada ni para decisiones automatizadas con efectos jurídicos sobre ti.'] },
      { title: '3. Almacenamiento en tu dispositivo', paragraphs: [
        'La PWA guarda en tu dispositivo la información que consultas (logros, ranking, foro y perfil) para mostrarla sin conexión. Esa caché pertenece a una sola cuenta: se borra al cerrar sesión y cuando otra cuenta inicia sesión en el mismo dispositivo. También puedes borrarla limpiando los datos del sitio en tu navegador.',
        'Cámara: la PWA solo pide acceso a la cámara cuando presionas «Tomar foto con la cámara» y la enciende únicamente mientras la ventana de captura está abierta. No grabamos video ni guardamos la imagen en tu galería. Si no hay internet, la foto que elegiste espera en la cola de acciones pendientes de tu dispositivo hasta enviarse. Puedes revocar el permiso en los ajustes de tu navegador en cualquier momento.',
      ] },
      { title: '4. Con quién compartimos tus datos', table: {
        head: ['Proveedor', 'Función', 'Ubicación'],
        rows: [
          ['Supabase', 'Autenticación, base de datos, sesiones y almacenamiento de las fotos de perfil.', 'Estados Unidos'],
          ['Render', 'Alojamiento de la API.', 'Estados Unidos'],
          ['Vercel', 'Alojamiento de la PWA.', 'Global'],
          ['Better Stack', 'Monitoreo de disponibilidad y registros técnicos.', 'Por confirmar'],
          ['Brevo', 'Envío de correos de recuperación de contraseña.', 'Unión Europea / Estados Unidos'],
        ],
      }, paragraphs: [
        'Los proveedores actúan por cuenta nuestra y se rigen por sus propios contratos de procesamiento de datos. No vendemos ni cedemos tus datos a terceros. Solo se muestran públicamente tu nombre de usuario, avatar (o tu foto de perfil, si la pones) y tiempos; nunca tu correo.',
        'Importante: la foto de perfil es pública. Cualquier persona que consulte el foro o el ranking, tenga o no cuenta, puede verla y copiarla; por eso es opcional y solo se sube si lo aceptas expresamente.',
        'Algunos proveedores almacenan datos fuera de México. Al usar el servicio consientes esas transferencias, realizadas con proveedores que ofrecen medidas de seguridad equivalentes.',
      ] },
      { title: '5. Conservación', items: [
        'Datos de cuenta, foro y progreso: mientras la cuenta esté activa.',
        'Foto de perfil: hasta que la quites desde tu perfil, elijas un avatar del catálogo o se elimine tu cuenta; en cualquiera de esos casos se borra del almacenamiento de inmediato. Una copia ya descargada por otra persona queda fuera de nuestro control.',
        'Tras eliminar la cuenta, los datos se marcan como eliminados de inmediato y se borran definitivamente en 15 días, salvo obligación legal.',
        'Tokens de recuperación de contraseña: 10 minutos de validez y se eliminan después de un día.',
        'Registros técnicos de servidor: 7 días.',
      ] },
      { title: '6. Tus derechos (ARCO)', paragraphs: [
        `Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición, revocar tu consentimiento o pedir la eliminación de tu cuenta escribiendo a ${CONTACT} con tu nombre de usuario, el correo registrado, el derecho que quieres ejercer y una identificación oficial. Responderemos en un máximo de 20 días hábiles. Además, puedes quitar tu foto de perfil y revocar ese consentimiento en cualquier momento desde tu perfil, sin escribirnos. Si tu derecho no fue atendido, puedes acudir al órgano garante competente.`,
        'Si vives en la Unión Europea, Reino Unido u otro país con legislación equivalente, también tienes derecho a la portabilidad de tus datos y a presentar una reclamación ante tu autoridad de protección de datos.',
      ] },
      { title: '7. Cookies y tecnologías similares', paragraphs: [
        'Usamos Vercel y Better Stack para alojar la PWA, medir su rendimiento y vigilar su disponibilidad. Estos servicios pueden registrar datos técnicos como dirección IP, navegador y páginas consultadas. No usamos cookies de publicidad.',
      ] },
      { title: '8. Menores de edad', paragraphs: [
        'El servicio está dirigido a personas de 15 años o más. Si eres menor, debes usarlo con autorización de tu madre, padre o tutor, quien también debe autorizar que se publique tu foto de perfil.',
      ] },
      { title: '9. Seguridad', paragraphs: [
        'Usamos conexiones cifradas (HTTPS), contraseñas gestionadas por Supabase Auth, control de acceso por roles, tokens de corta duración y pruebas de seguridad automatizadas. Si una vulneración afecta tus datos, te lo notificaremos sin demora.',
      ] },
      { title: '10. Cambios a este aviso', paragraphs: [
        'Publicaremos cualquier cambio con su fecha y, si es sustancial, te avisaremos antes de que entre en vigor.',
      ] },
    ],
  },
};
