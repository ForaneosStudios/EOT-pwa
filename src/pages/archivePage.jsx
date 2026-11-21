import { useMemo, useState } from 'react';
import Sidebar from '../components/landing/sidebar.jsx';
import { navigationItems } from '../components/landing/navigation.js';
import herederoBase from '../assets/concept/heredero-base.jpeg';
import herederoCorrompido from '../assets/concept/heredero-corrompido.jpeg';
import herederoEvolucion from '../assets/concept/heredero-evolucion.jpeg';
import mejorasConcepto from '../assets/concept/sistema-mejoras-concepto.jpeg';
import mejorasFinal from '../assets/concept/sistema-mejoras-final.jpeg';
import bestiaConcepto from '../assets/concept/bestia-concepto.jpeg';

const pieces = [
  { id: 'base', category: 'Personajes', title: 'El Heredero sin rostro', stage: 'Silueta inicial', image: herederoBase, author: 'Ernesto', role: 'Dirección del proyecto', note: 'Quitamos el rostro para que el personaje no llegara con una identidad resuelta. El vacío también cuenta la historia del jugador.', fit: 'contain' },
  { id: 'corruption', category: 'Personajes', title: 'La corrupción observa', stage: 'Exploración descartada', image: herederoCorrompido, author: 'Judith', role: 'Arte y narrativa visual', note: 'Los ojos son recuerdos que ya no pertenecen al Heredero. Queríamos que el cuerpo comenzara a mirar de vuelta.', fit: 'contain', discarded: true },
  { id: 'evolution', category: 'Personajes', title: 'El precio de evolucionar', stage: 'Dirección final', image: herederoEvolucion, author: 'Rochín', role: 'Diseño de personaje', note: 'La asimetría fue intencional: un brazo conserva al personaje original y el otro muestra que cada mejora deja una cicatriz.', fit: 'contain' },
  { id: 'beast', category: 'Criaturas', title: 'La bestia de las grietas', stage: 'Enemigo de la demo', image: bestiaConcepto, author: 'Aceves', role: 'Criaturas y combate', note: 'La diseñamos baja y cargada hacia el frente para que su peligro se leyera incluso como silueta. Las placas guían la vista hasta la mandíbula.' },
  { id: 'upgrade-a', category: 'Objetos', title: 'Medir el poder', stage: 'Propuesta de interfaz', image: mejorasConcepto, author: 'Iván', role: 'Experiencia e interfaz', note: 'La primera propuesta hacía explícito el costo de cada mejora y nos ayudó a entender qué información era realmente necesaria.', discarded: true },
  { id: 'upgrade-b', category: 'Objetos', title: 'Una lectura más clara', stage: 'Interfaz refinada', image: mejorasFinal, author: 'Iván', role: 'Experiencia e interfaz', note: 'La versión refinada convierte la progresión en una lectura inmediata: rojo es poder ganado; gris, todo lo que todavía falta.' },
];

const categories = [
  ['Todo', 'El archivo completo'],
  ['Personajes', 'Bocetos del heredero'],
  ['Escenarios', 'Arquitectura del inframundo'],
  ['Criaturas', 'Bestiario y enemigos'],
  ['Objetos', 'Reliquias e interfaz'],
];

export default function ArchivePage() {
  const [category, setCategory] = useState('Todo');
  const [discardedOnly, setDiscardedOnly] = useState(false);
  const visiblePieces = useMemo(() => pieces.filter((piece) => (category === 'Todo' || piece.category === category) && (!discardedOnly || piece.discarded)), [category, discardedOnly]);

  return (
    <div className="flex min-h-dvh flex-col bg-void md:flex-row">
      <Sidebar navItems={navigationItems} />
      <main className="flex-1 px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <div className="page-enter mx-auto max-w-6xl">
          <header className="border-b border-gold-dim pb-5">
            <p className="font-display text-xs uppercase tracking-wide text-gold">Registro V · La forja del reino</p>
            <h1 className="mt-3 font-display text-3xl uppercase text-parchment sm:text-4xl">El Archivo Prohibido</h1>
            <p className="mt-3 text-sm text-muted">Explora el arte conceptual y los caminos que no llegaron al trono.</p>
          </header>

          <section className="mt-7" aria-labelledby="concept-categories-title">
            <h2 id="concept-categories-title" className="font-display text-sm uppercase text-parchment">Arte conceptual</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.slice(1).map(([name, description]) => {
                const count = pieces.filter((piece) => piece.category === name).length;
                return <button key={name} type="button" onClick={() => { setCategory(name); setDiscardedOnly(false); }} className={`group border p-3 text-left transition-colors ${category === name && !discardedOnly ? 'border-crimson bg-crimson/20' : 'border-gold-dim bg-panel hover:border-gold'}`}><div className="grid h-24 place-items-center border border-gold-dim bg-[#3a2428] font-display text-2xl text-gold">◇</div><span className="mt-3 flex items-center justify-between font-display text-xs uppercase text-parchment"><span>{name}</span><small className="text-gold">{count || '—'}</small></span><span className="mt-1 block text-[10px] text-muted">{description}</span></button>;
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => { setCategory('Todo'); setDiscardedOnly(false); }} className="border border-gold-dim px-5 py-3 font-display text-xs uppercase text-parchment hover:border-gold">Ver todo el archivo</button>
              <button type="button" onClick={() => { setCategory('Todo'); setDiscardedOnly(true); }} className={`border px-5 py-3 font-display text-xs uppercase ${discardedOnly ? 'border-crimson bg-crimson text-parchment' : 'border-crimson bg-crimson-light text-parchment'}`}>Ver ideas descartadas →</button>
            </div>
          </section>

          <section className="mt-10" aria-live="polite">
            <div className="flex items-end justify-between border-b border-gold-dim pb-3"><div><p className="font-display text-xs uppercase text-gold">{discardedOnly ? 'Caminos descartados' : category}</p><h2 className="mt-2 font-display text-xl uppercase text-parchment">Notas de la forja</h2></div><span className="text-xs text-muted">{visiblePieces.length} piezas</span></div>
            {visiblePieces.length > 0 ? <div className="mt-5 grid gap-5 lg:grid-cols-2">{visiblePieces.map((piece) => <figure key={piece.id} className="overflow-hidden border border-gold-dim bg-panel"><div className="grid h-72 place-items-center overflow-hidden bg-[#130d0d]"><img src={piece.image} alt={piece.title} className={`h-full w-full ${piece.fit === 'contain' ? 'object-contain p-5' : 'object-cover'}`} /></div><figcaption className="p-5"><p className="font-display text-[10px] uppercase tracking-wider text-gold">{piece.stage}</p><h3 className="mt-2 font-display text-lg uppercase text-parchment">{piece.title}</h3><blockquote className="mt-4 border-l border-crimson pl-4 font-serif text-sm italic leading-6 text-muted">“{piece.note}”</blockquote><p className="mt-4 font-display text-[10px] uppercase tracking-wider text-gold">{piece.author} · {piece.role}</p></figcaption></figure>)}</div> : <div className="mt-5 border border-gold-dim bg-panel p-10 text-center"><p className="font-display text-sm uppercase text-parchment">Este registro todavía está sellado</p><p className="mt-2 text-xs text-muted">El material de escenarios se incorporará cuando esté listo para el archivo.</p></div>}
          </section>
        </div>
      </main>
    </div>
  );
}
