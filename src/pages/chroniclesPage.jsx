import Sidebar from '../components/landing/sidebar.jsx';
import { navigationItems } from '../components/landing/navigation.js';
import herederoBase from '../assets/concept/heredero-base.jpeg';
import bestiaConcepto from '../assets/concept/bestia-concepto.jpeg';
import throneScene from '../assets/echoes-throne-hero.jpg';

const chapters = [
  { number: 'I', title: 'La caída', active: true },
  { number: 'II', title: 'El juramento roto' },
  { number: 'III', title: 'La ciudad sin rostro' },
  { number: 'IV', title: 'Sangre de la corona' },
  { number: 'V', title: 'El último eco' },
];

const loreCards = [
  { title: 'El Heredero', description: 'El protagonista de la leyenda.', image: herederoBase, imageClass: 'object-contain p-5' },
  { title: 'El Inframundo', description: 'Un reino de cenizas y secretos.', image: throneScene, imageClass: 'object-cover' },
  { title: 'La Bestia de las Grietas', description: 'El primer guardián del camino.', image: bestiaConcepto, imageClass: 'object-cover' },
];

export default function ChroniclesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-void md:flex-row">
      <Sidebar navItems={navigationItems} />
      <main className="flex-1 px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <div className="page-enter mx-auto max-w-6xl">
          <header className="border-b border-gold-dim pb-5">
            <p className="font-display text-xs uppercase tracking-wide text-gold">Registro IV · Los orígenes</p>
            <h1 className="mt-3 font-display text-3xl uppercase text-parchment sm:text-4xl">Crónicas del Inframundo</h1>
            <p className="mt-3 text-sm text-muted">Historias prohibidas, personajes y lugares que forjaron el reino.</p>
          </header>

          <section className="mt-7 border border-gold-dim bg-panel p-5 sm:p-7" aria-labelledby="chapter-one-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-xs uppercase text-gold">Capítulo I · La caída</p>
              <span className="border border-crimson bg-crimson/20 px-3 py-1 font-display text-[10px] uppercase tracking-wider text-parchment">Contenido de la demo</span>
            </div>
            <h2 id="chapter-one-title" className="mt-4 font-display text-xl uppercase text-parchment">El príncipe destronado</h2>
            <p className="mt-5 max-w-4xl text-sm leading-7 text-muted">Un príncipe demoníaco es despojado de su trono, encarcelado y renace en el cuerpo de un demonio menor. Su destino será recuperar el poder perdido y absorber las almas que se interpongan en su camino.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {['Despertar en la prisión', 'El primer eco', 'La bestia guardiana', 'La transformación'].map((beat, index) => <div key={beat} className="border-l border-gold-dim pl-3"><span className="font-display text-[10px] text-gold">0{index + 1}</span><p className="mt-1 text-xs uppercase text-parchment">{beat}</p></div>)}
            </div>
          </section>

          <nav className="mt-5" aria-label="Capítulos de la historia">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {chapters.map((chapter) => <li key={chapter.number} className={`min-h-20 border px-3 py-3 ${chapter.active ? 'border-crimson bg-crimson/30' : 'border-gold-dim bg-panel-deep opacity-45'}`}><span className="font-display text-xs text-gold">{chapter.number}</span><p className="mt-2 font-display text-[11px] uppercase text-parchment">{chapter.title}</p>{!chapter.active && <small className="mt-1 block text-[9px] uppercase tracking-wider text-muted">Sellado</small>}</li>)}
            </ol>
          </nav>

          <section className="mt-9" aria-labelledby="people-places-title">
            <h2 id="people-places-title" className="font-display text-sm uppercase text-parchment">Personajes y lugares</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {loreCards.map((card) => <article key={card.title} className="border border-gold-dim bg-panel p-3"><div className="grid h-40 place-items-center overflow-hidden border border-gold-dim bg-[#3a2428]"><img src={card.image} alt="" className={`h-full w-full ${card.imageClass}`} /></div><h3 className="mt-4 font-display text-sm uppercase text-parchment">{card.title}</h3><p className="mt-2 text-xs text-muted">{card.description}</p></article>)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
