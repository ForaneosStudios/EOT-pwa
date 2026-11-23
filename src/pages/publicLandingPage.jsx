import { Link } from 'react-router-dom';
import heroImage from '../assets/echoes-throne-hero.jpg';
import heirImage from '../assets/concept/heredero-evolucion.jpeg';
import beastImage from '../assets/concept/bestia-concepto.jpeg';
import relicImage from '../assets/concept/sistema-mejoras-final.jpeg';
import throneCinematic from '../assets/landing-throne-cinematic.jpg';
import dungeonGameplay from '../assets/landing-dungeon-gameplay.jpg';
import eotLogo from '../assets/eot-logo-transparent.png';
import foraneosLogo from '../assets/foraneos-studio-logo-transparent.png';
import promoBanner from '../assets/eot-promo-banner.jpeg';
import { usePwaInstall } from '../components/pwa/pwaInstallContext.js';

const worldGallery = [
  { image: heirImage, alt: 'Concepto del Heredero transformado', label: 'El Heredero', className: 'public-gallery-feature' },
  { image: beastImage, alt: 'Concepto de la bestia de las grietas', label: 'Criaturas de las grietas' },
  { image: relicImage, alt: 'Concepto visual del sistema de mejoras', label: 'Reliquias y poder' },
];

const chapters = [
  {
    number: 'I',
    title: 'Un reino que recuerda',
    text: 'Explora los vestigios de una corona perdida y reconstruye una historia contada entre ruinas, ecos y juramentos.',
  },
  {
    number: 'II',
    title: 'Cada paso deja huella',
    text: 'Registra tus hallazgos, desbloquea logros y convierte cada descubrimiento en una página de tu propio códice.',
  },
  {
    number: 'III',
    title: 'Nadie desciende solo',
    text: 'Comparte teorías, secretos y relatos con otros herederos en un espacio creado para la comunidad.',
  },
];

const processSteps = [
  ['01', 'Concepción', 'Una idea nacida de la exploración, la memoria y el peso de un trono vacío.'],
  ['02', 'Mundo visual', 'Escenarios, símbolos, sprites y atmósferas construyen una identidad oscura y ceremonial.'],
  ['03', 'Desarrollo', 'La experiencia evoluciona mediante prototipos, integración y decisiones centradas en el jugador.'],
  ['04', 'Pruebas', 'Cada recorrido se valida, se refina y vuelve a levantarse con más claridad.'],
];

export default function PublicLandingPage() {
  const { canInstall, install, installing } = usePwaInstall();

  return (
    <main className="public-landing bg-void text-parchment">
      <header className="public-nav">
        <a href="#inicio" className="public-brand" aria-label="Echoes of the Throne, inicio">
          <span className="public-brand-mark"><img src={eotLogo} alt="" /></span>
          <span><strong>Echoes</strong> of the Throne</span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#mundo">El mundo</a>
          <a href="#proceso">El proceso</a>
          <a href="#comunidad">Comunidad</a>
        </nav>
        <div className="public-nav-actions">
          {canInstall && <button type="button" disabled={installing} onClick={install} className="public-install">{installing ? 'Abriendo…' : 'Instalar app'}</button>}
          <Link to="/login" className="public-login">Iniciar sesión</Link>
          <Link to="/register" className="public-button public-button-small">Crear cuenta</Link>
        </div>
      </header>

      <section id="inicio" className="public-hero" style={{ '--hero-image': `url(${heroImage})` }}>
        <div className="public-hero-vignette" />
        <div className="public-hero-content">
          <p className="public-kicker">Una crónica interactiva de Foráneos Studios</p>
          <h1>El trono está vacío.<br /><em>Los ecos permanecen.</em></h1>
          <p className="public-lead">Adéntrate en un reino quebrado, reúne sus historias y deja constancia de tu paso antes de que la última memoria desaparezca.</p>
          <div className="public-hero-actions">
            <Link to="/register" className="public-button">Comenzar el viaje <span aria-hidden="true">↗</span></Link>
            <a href="#mundo" className="public-text-link">Descubrir el reino <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <p className="public-scroll-cue"><span /> Desciende para escuchar</p>
      </section>

      <section id="mundo" className="public-section public-world">
        <div className="public-section-heading">
          <p className="public-kicker">Crónicas del inframundo</p>
          <h2>Tu historia comienza<br />donde termina la leyenda.</h2>
          <p>Echoes of the Throne transforma la exploración en una memoria compartida: un lugar para descubrir el mundo, registrar hazañas y conversar sobre sus secretos.</p>
          <figure className="public-world-banner"><img src={promoBanner} loading="lazy" decoding="async" alt="Banner de Echoes of the Throne con el Heredero y los guardianes del reino" /></figure>
        </div>
        <div className="public-chapters">
          {chapters.map((chapter) => (
            <article key={chapter.number} className="public-chapter">
              <span>{chapter.number}</span>
              <div>
                <h3>{chapter.title}</h3>
                <p>{chapter.text}</p>
              </div>
            </article>
          ))}
        </div>
        <section className="public-gallery" aria-labelledby="gallery-title">
          <div className="public-gallery-heading"><p className="public-kicker">Fragmentos del reino</p><h3 id="gallery-title">La memoria también tiene rostro.</h3></div>
          <div className="public-gallery-grid">{worldGallery.map((item) => <figure key={item.label} className={item.className || ''}><img src={item.image} alt={item.alt} /><figcaption>{item.label}</figcaption></figure>)}</div>
        </section>

        <section className="public-play-showcase" aria-labelledby="play-showcase-title">
          <div className="public-showcase-heading">
            <div><p className="public-kicker">Del relato a la batalla</p><h3 id="play-showcase-title">Un reino para recorrer, combatir y recordar.</h3></div>
            <p>La caída del trono abre paso a las profundidades: descubre la historia y desciende para reclamar las almas que quedaron atrás.</p>
          </div>
          <div className="public-showcase-grid">
            <figure className="public-showcase-cinematic"><img src={throneCinematic} loading="lazy" decoding="async" alt="Cinemática de figuras reunidas ante el trono del reino" /><figcaption><span>La caída</span><strong>El trono no permanece vacío para siempre.</strong></figcaption></figure>
            <figure className="public-showcase-gameplay"><img src={dungeonGameplay} loading="lazy" decoding="async" alt="El Heredero explora una mazmorra iluminada por fuego y almas" /><figcaption><span>El descenso</span><strong>Absorbe ecos en las profundidades.</strong></figcaption></figure>
          </div>
        </section>
      </section>

      <section className="public-quote" aria-label="Declaración del proyecto">
        <div className="public-sigil" aria-hidden="true">✦</div>
        <blockquote>“Cada alma conquistada escribe una nueva página de tu historia.”</blockquote>
        <p>El Códice del Heredero</p>
      </section>

      <section id="proceso" className="public-section public-process">
        <div className="public-section-heading public-section-heading-row">
          <div>
            <p className="public-kicker">Detrás del reino</p>
            <h2>De la primera idea<br />al último eco.</h2>
          </div>
          <p>El proyecto reúne narrativa, storyboard, diseño visual, assets y pruebas en un proceso continuo de construcción y refinamiento.</p>
        </div>
        <div className="public-process-grid">
          {processSteps.map(([number, title, text]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="comunidad" className="public-community">
        <div className="public-community-copy">
          <p className="public-kicker">El consejo de almas</p>
          <h2>Un reino vive mientras alguien lo recuerde.</h2>
          <p>Crea tu perfil, conserva tus logros y forma parte de las conversaciones que mantienen viva la historia.</p>
          <Link to="/register" className="public-button">Unirme a la comunidad <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="public-community-mark">
          <img src={foraneosLogo} alt="Foráneos Studio" />
          <span>FORÁNEOS</span>
          <strong>EOT</strong>
          <span>STUDIOS</span>
        </div>
      </section>

      <footer className="public-footer">
        <p>Echoes of the Throne</p>
        <p>Proyecto de Foráneos Studios</p>
        <nav className="public-legal-links" aria-label="Documentos legales"><Link to="/terminos">Términos y condiciones</Link><Link to="/privacidad">Aviso de privacidad</Link></nav>
        <a href="#inicio" aria-label="Volver al inicio"><span className="public-footer-label">Volver al inicio </span><span aria-hidden="true">↑</span></a>
      </footer>
    </main>
  );
}
