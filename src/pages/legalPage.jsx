import { Link, useNavigate } from 'react-router-dom';
import { legalDocuments } from '../content/legal.js';

const formatDate = (value) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

function Table({ table }) {
  return <div className="mt-3 overflow-x-auto">
    <table className="w-full border-collapse text-left text-sm">
      <thead><tr>{table.head.map((cell) => <th key={cell} className="border border-gold-dim bg-panel-deep px-3 py-2 font-display text-xs uppercase text-gold">{cell}</th>)}</tr></thead>
      <tbody>{table.rows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell} className="border border-gold-dim px-3 py-2 align-top text-parchment/90">{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

// Public page (no sign-in needed) that shows the terms or the privacy notice, with a link to the other one.
export default function LegalPage({ document: key }) {
  const doc = legalDocuments[key];
  const navigate = useNavigate();
  const other = key === 'terminos' ? { to: '/privacidad', label: 'Aviso de privacidad' } : { to: '/terminos', label: 'Términos y condiciones' };
  return <main className="min-h-dvh bg-void px-4 py-8 text-parchment sm:px-8">
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-gold-dim pb-5">
        <p className="font-display text-xs uppercase tracking-wide text-gold">{doc.eyebrow}</p>
        <h1 className="mt-3 font-display text-2xl uppercase sm:text-3xl">{doc.title}</h1>
        <p className="mt-2 text-xs text-muted">Versión del {formatDate(doc.updated)}</p>
        <nav aria-label="Documentos legales" className="mt-4 flex flex-wrap gap-x-6 text-xs uppercase">
          <button type="button" onClick={() => { void navigate(window.history.length > 1 ? -1 : '/'); }} className="inline-block cursor-pointer py-3 font-display text-gold underline">← Volver</button>
          <Link to={other.to} className="inline-block py-3 font-display text-gold underline">{other.label}</Link>
        </nav>
      </header>
      <p className="mt-6 text-sm leading-relaxed text-parchment/90">{doc.intro}</p>
      {doc.sections.map((section) => <section key={section.title} className="mt-8">
        <h2 className="font-display text-lg text-gold">{section.title}</h2>
        {section.table && <Table table={section.table} />}
        {section.items && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-parchment/90">{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
        {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-relaxed text-parchment/90">{paragraph}</p>)}
      </section>)}
    </article>
  </main>;
}
