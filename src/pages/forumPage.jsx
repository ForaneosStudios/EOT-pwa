import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/landing/sidebar.jsx';
import PageHeader from '../components/landing/pageHeader.jsx';
import { navigationItems } from '../components/landing/navigation.js';
import { apiClient, getApiErrorMessage } from '../services/apiClient.js';
import LoadingIndicator from '../components/feedback/loadingIndicator.jsx';

const TITLE_LIMITS = { min: 5, max: 120 };
const CONTENT_LIMITS = { min: 10, max: 2000 };

function FieldHint({ value, limits, label }) {
  const valid = value.length >= limits.min && value.length <= limits.max;
  return <p className={`mt-1 text-xs ${valid || value.length === 0 ? 'text-muted' : 'text-error'}`}>{label}: {limits.min}–{limits.max} caracteres · {value.length}/{limits.max}</p>;
}

function filtersFromSearch(searchParams) {
  return {
    title: searchParams.get('title') || '',
    author: searchParams.get('author') || '',
    mine: searchParams.get('mine') === 'true',
    page: Math.max(0, Number(searchParams.get('page') || 0) || 0),
  };
}

export default function ForumPage({ user, onLogout, message }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearch(searchParams), [searchParams]);
  const [draftFilters, setDraftFilters] = useState(filters);
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [form, setForm] = useState({ title: '', content: '' });
  const [creating, setCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const updateFilters = useCallback((nextFilters, replace = false) => {
    const next = new URLSearchParams();
    if (nextFilters.title) next.set('title', nextFilters.title);
    if (nextFilters.author) next.set('author', nextFilters.author);
    if (nextFilters.mine) next.set('mine', 'true');
    if (nextFilters.page > 0) next.set('page', String(nextFilters.page));
    setSearchParams(next, { replace });
  }, [setSearchParams]);

  useEffect(() => { setDraftFilters(filters); }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = { ...draftFilters, page: 0 };
      if (next.title !== filters.title || next.author !== filters.author || next.mine !== filters.mine) updateFilters(next, true);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [draftFilters, filters, updateFilters]);

  useEffect(() => {
    let active = true;
    setState((value) => ({ ...value, loading: true, error: '' }));
    apiClient.get('/threads/search', {
      params: { title: filters.title || undefined, author: filters.author || undefined, participantId: filters.mine ? user.userId : undefined, page: filters.page, size: 10 },
    }).then(({ data }) => active && setState({ loading: false, data, error: '' }))
      .catch((error) => active && setState({ loading: false, data: null, error: getApiErrorMessage(error, 'No se pudieron cargar las conversaciones.') }));
    return () => { active = false; };
  }, [filters, user.userId]);

  const titleValid = form.title.trim().length >= TITLE_LIMITS.min && form.title.trim().length <= TITLE_LIMITS.max;
  const contentValid = form.content.trim().length >= CONTENT_LIMITS.min && form.content.trim().length <= CONTENT_LIMITS.max;
  const forumSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

  async function create(event) {
    event.preventDefault();
    if (!titleValid || !contentValid) return;
    setCreating(true);
    try {
      await apiClient.post('/threads', { userId: user.userId, title: form.title.trim(), content: form.content.trim() });
      setForm({ title: '', content: '' });
      setIsModalOpen(false);
      updateFilters({ ...filters, page: 0 });
    } catch (error) {
      setState((value) => ({ ...value, error: getApiErrorMessage(error, 'No se pudo crear el tema.') }));
    } finally { setCreating(false); }
  }

  const threads = state.data?.content || [];
  return <div className="flex min-h-screen flex-col bg-void md:flex-row"><Sidebar navItems={navigationItems}/><main className="flex-1 px-6 py-8 md:px-10"><div className="page-enter mx-auto max-w-5xl">
    <div className="flex justify-end"><button onClick={onLogout} className="border border-gold-dim px-4 py-2 font-display text-xs uppercase text-gold">Cerrar sesión</button></div>
    <PageHeader eyebrow="Registro III · Voces del reino" title="El Consejo de las Almas" subtitle="Comparte teorías, preguntas y descubrimientos con otros herederos." />
    {message && <p className="text-error">{message}</p>}
    <section className="forum-filter-bar sticky top-0 z-20 -mx-6 mt-6 border-y border-gold-dim bg-void/95 px-6 py-4 backdrop-blur md:-mx-10 md:px-10"><div className="mx-auto flex max-w-5xl flex-wrap items-end gap-3">
      <div className="flex flex-1 flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs uppercase text-gold-dim">Título<input value={draftFilters.title} onChange={(event) => setDraftFilters((value) => ({ ...value, title: event.target.value }))} placeholder="Buscar por título" className="border border-gold-dim bg-panel p-3 normal-case text-main" /></label>
        <label className="grid gap-1 text-xs uppercase text-gold-dim">Autor<input value={draftFilters.author} onChange={(event) => setDraftFilters((value) => ({ ...value, author: event.target.value }))} placeholder="Buscar por autor" className="border border-gold-dim bg-panel p-3 normal-case text-main" /></label>
        <label className="flex h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draftFilters.mine} onChange={(event) => setDraftFilters((value) => ({ ...value, mine: event.target.checked }))}/> Donde participé</label>
      </div>
      <button onClick={() => setIsModalOpen(true)} className="h-11 border border-gold bg-crimson px-4 font-display text-xs uppercase">+ Nuevo tema</button>
    </div></section>
    {state.error && <p role="alert" className="mt-4 text-error">{state.error}</p>}
    {state.loading ? <LoadingIndicator label="Cargando conversaciones..." /> : <section className="mt-6">
      {threads.length === 0 ? <div className="forum-empty border border-gold-dim bg-panel p-8 text-center"><h2 className="font-display text-lg text-gold">No se encontraron conversaciones</h2><p className="mt-2 text-sm text-muted">Prueba con otros filtros o inicia la primera conversación.</p></div> : <div className="forum-results grid gap-3">{threads.map((thread) => <Link key={thread.threadId} to={`/forum/${thread.threadId}`} state={{ forumSearch }} className="forum-card border border-gold-dim bg-panel p-5 hover:border-gold"><p className="text-xs uppercase text-gold">{thread.categoryName || 'Comunidad'} {thread.isLocked ? '· Cerrado' : ''}</p><h2 className="mt-2 font-display text-lg">{thread.title}</h2><p className="mt-2 text-sm text-muted">{thread.username}</p></Link>)}</div>}
      <div className="mt-6 flex gap-4"><button disabled={!state.data || state.data.first} onClick={() => updateFilters({ ...filters, page: filters.page - 1 })} className="text-gold disabled:text-muted">Anterior</button><button disabled={!state.data || state.data.last} onClick={() => updateFilters({ ...filters, page: filters.page + 1 })} className="text-gold disabled:text-muted">Siguiente</button></div>
    </section>}
  </div></main>
  {isModalOpen && <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="presentation" onMouseDown={() => !creating && setIsModalOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="new-topic-title" onMouseDown={(event) => event.stopPropagation()} className="modal-panel w-full max-w-xl border border-gold bg-panel p-6 shadow-2xl">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase text-gold">Consejo de las Almas</p><h2 id="new-topic-title" className="mt-1 font-display text-xl">Nueva conversación</h2></div><button aria-label="Cerrar" disabled={creating} onClick={() => setIsModalOpen(false)} className="text-gold">×</button></div>
    <form onSubmit={create} className="mt-5 grid gap-4"><label className="grid gap-1 font-display text-sm text-gold">Título<input autoFocus required minLength={TITLE_LIMITS.min} maxLength={TITLE_LIMITS.max} value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} className="border border-gold-dim bg-void p-3 font-sans text-main" /><FieldHint value={form.title} limits={TITLE_LIMITS} label="Título" /></label><label className="grid gap-1 font-display text-sm text-gold">Mensaje<textarea required minLength={CONTENT_LIMITS.min} maxLength={CONTENT_LIMITS.max} value={form.content} onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))} className="min-h-40 border border-gold-dim bg-void p-3 font-sans text-main" /><FieldHint value={form.content} limits={CONTENT_LIMITS} label="Mensaje" /></label><p className="text-xs text-muted">Publica solo contenido respetuoso y seguro para la comunidad.</p><div className="flex justify-end gap-3"><button type="button" disabled={creating} onClick={() => setIsModalOpen(false)} className="px-4 text-gold">Cancelar</button><button disabled={creating || !titleValid || !contentValid} className="border border-gold bg-crimson px-4 py-3 font-display text-xs uppercase disabled:opacity-50">{creating ? 'Publicando...' : 'Publicar tema'}</button></div></form>
  </section></div>}
</div>;
}
