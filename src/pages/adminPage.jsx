import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../components/landing/sidebar.jsx';
import PageHeader from '../components/landing/pageHeader.jsx';
import { navigationItems } from '../components/landing/navigation.js';
import { apiClient, getApiErrorMessage } from '../services/apiClient.js';
import { ForumThreadsSkeleton } from '../components/feedback/contentSkeletons.jsx';

const tabs = [
  { id: 'overview', label: 'Resumen' },
  { id: 'users', label: 'Cuentas' },
  { id: 'forum', label: 'Foro' },
  { id: 'content', label: 'Contenido' },
];

const blankAchievement = { achName: '', achDescription: '', achPicture: '', isAchHidden: false, targetValue: '', progressLabel: '' };
const blankCategory = { categoryName: '', description: '' };

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

export default function AdminPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({ users: [], threads: [], achievements: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [achievementForm, setAchievementForm] = useState(blankAchievement);
  const [categoryForm, setCategoryForm] = useState(blankCategory);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [users, threads, achievements, categories] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/threads/search', { params: { page: 0, size: 50 } }),
        apiClient.get('/achievements', { params: { includeHidden: true } }),
        apiClient.get('/categories'),
      ]);
      setData({ users: users.data || [], threads: threads.data?.content || [], achievements: achievements.data || [], categories: categories.data || [] });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar el panel de administración.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/users'),
      apiClient.get('/threads/search', { params: { page: 0, size: 50 } }),
      apiClient.get('/achievements', { params: { includeHidden: true } }),
      apiClient.get('/categories'),
    ]).then(([users, threads, achievements, categories]) => {
      if (active) setData({ users: users.data || [], threads: threads.data?.content || [], achievements: achievements.data || [], categories: categories.data || [] });
    }).catch((requestError) => {
      if (active) setError(getApiErrorMessage(requestError, 'No se pudo cargar el panel de administración.'));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function runAction(action, successMessage) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo completar la acción.'));
    } finally {
      setSaving(false);
    }
  }

  function removeUser(account) {
    if (account.userId === user.userId || !window.confirm(`¿Eliminar la cuenta de ${account.username}?`)) return;
    void runAction(() => apiClient.delete(`/users/${account.userId}`), 'La cuenta fue eliminada.');
  }

  function removeThread(thread) {
    if (!window.confirm(`¿Eliminar el hilo “${thread.title}”?`)) return;
    void runAction(() => apiClient.delete(`/threads/${thread.threadId}`), 'El hilo fue eliminado.');
  }

  function submitAchievement(event) {
    event.preventDefault();
    const payload = {
      ...achievementForm,
      achPicture: achievementForm.achPicture.trim() || null,
      targetValue: achievementForm.targetValue ? Number(achievementForm.targetValue) : null,
      progressLabel: achievementForm.progressLabel.trim() || null,
    };
    void runAction(async () => { await apiClient.post('/achievements', payload); setAchievementForm(blankAchievement); }, 'El logro fue añadido al catálogo.');
  }

  function submitCategory(event) {
    event.preventDefault();
    const payload = { categoryName: categoryForm.categoryName.trim(), description: categoryForm.description.trim() || null };
    void runAction(async () => { await apiClient.post('/categories', payload); setCategoryForm(blankCategory); }, 'La categoría fue creada.');
  }

  const stats = [
    ['Cuentas activas', data.users.length],
    ['Hilos del foro', data.threads.length],
    ['Logros del catálogo', data.achievements.length],
    ['Categorías', data.categories.length],
  ];

  return <div className="flex min-h-screen flex-col bg-void md:flex-row">
    <Sidebar navItems={navigationItems} />
    <main className="flex-1 px-6 py-8 md:px-10"><div className="page-enter mx-auto max-w-6xl">
      <div className="flex justify-end"><button type="button" onClick={onLogout} className="border border-gold-dim px-4 py-2 font-display text-xs uppercase text-gold hover:border-gold">Cerrar sesión</button></div>
      <PageHeader eyebrow="Registro VII · Custodia" title="Consejo de administración" subtitle="Gestiona las cuentas, la comunidad y el catálogo del reino." />
      {error && <div role="alert" className="mt-4 border border-error bg-panel p-4 text-error">{error}<button type="button" onClick={() => void load()} className="ml-3 underline">Reintentar</button></div>}
      {notice && <p role="status" className="mt-4 border border-success bg-panel p-4 text-success">{notice}</p>}

      <div className="mt-6 flex gap-5 overflow-x-auto border-b border-gold-dim" role="tablist" aria-label="Secciones de administración">
        {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 border-b-2 pb-3 font-display text-xs uppercase tracking-wide ${activeTab === tab.id ? 'border-crimson text-parchment' : 'border-transparent text-muted hover:text-parchment'}`}>{tab.label}</button>)}
      </div>

      {loading ? <ForumThreadsSkeleton count={4} /> : <>
        {activeTab === 'overview' && <section className="mt-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value]) => <article key={label} className="border border-gold-dim bg-panel p-5"><p className="font-display text-xs uppercase text-gold">{label}</p><p className="mt-3 font-display text-3xl text-parchment">{value}</p></article>)}</div><article className="mt-6 border border-gold-dim bg-panel p-5"><h2 className="font-display text-lg uppercase text-parchment">Alcance del contenido editorial</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-muted">El servicio actual permite administrar logros y categorías del foro. Crónicas y Archivo/Extras siguen siendo contenido estático del cliente: no hay endpoints de lectura o escritura para persistir ediciones desde este panel.</p></article></section>}

        {activeTab === 'users' && <section className="mt-6 overflow-x-auto border border-gold-dim bg-panel"><table className="w-full min-w-160 text-left text-sm"><caption className="sr-only">Cuentas de usuario</caption><thead className="border-b border-gold-dim text-xs uppercase text-gold"><tr><th className="p-4">Usuario</th><th className="p-4">Correo</th><th className="p-4">Rol</th><th className="p-4">Registro</th><th className="p-4"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{data.users.map((account) => <tr key={account.userId} className="border-b border-gold-dim/60 last:border-0"><td className="p-4 text-parchment">{account.username}</td><td className="p-4 text-muted">{account.email}</td><td className="p-4"><span className="border border-gold-dim px-2 py-1 text-xs text-gold">{account.role}</span></td><td className="p-4 text-muted">{formatDate(account.createdAt)}</td><td className="p-4 text-right">{account.userId === user.userId ? <span className="text-xs text-muted">Tu cuenta</span> : <button type="button" disabled={saving} onClick={() => removeUser(account)} className="text-xs text-error disabled:opacity-60">Eliminar</button>}</td></tr>)}</tbody></table></section>}

        {activeTab === 'forum' && <section className="mt-6 grid gap-3">{data.threads.length === 0 ? <p className="border border-gold-dim bg-panel p-6 text-muted">No hay conversaciones registradas.</p> : data.threads.map((thread) => <article key={thread.threadId} className="border border-gold-dim bg-panel p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase text-gold">{thread.categoryName || 'Sin categoría'} · {thread.username}</p><h2 className="mt-2 font-display text-lg text-parchment">{thread.title}</h2><p className="mt-2 line-clamp-2 text-sm text-muted">{thread.content}</p></div><div className="flex gap-3 text-xs"><button type="button" disabled={saving} onClick={() => void runAction(() => apiClient.patch(`/threads/${thread.threadId}/lock`, { locked: !thread.isLocked }), thread.isLocked ? 'El hilo fue reabierto.' : 'El hilo fue bloqueado.')} className="text-gold disabled:opacity-60">{thread.isLocked ? 'Reabrir' : 'Bloquear'}</button><button type="button" disabled={saving} onClick={() => removeThread(thread)} className="text-error disabled:opacity-60">Eliminar</button></div></div></article>)}</section>}

        {activeTab === 'content' && <section className="mt-6 grid gap-6 lg:grid-cols-2"><form onSubmit={submitAchievement} className="border border-gold-dim bg-panel p-5"><h2 className="font-display text-lg uppercase text-parchment">Añadir logro</h2><div className="mt-5 grid gap-3"><input required minLength="2" maxLength="100" value={achievementForm.achName} onChange={(event) => setAchievementForm((value) => ({ ...value, achName: event.target.value }))} placeholder="Nombre del logro" className="border border-gold-dim bg-void p-3" /><textarea required maxLength="500" value={achievementForm.achDescription} onChange={(event) => setAchievementForm((value) => ({ ...value, achDescription: event.target.value }))} placeholder="Descripción" className="min-h-24 border border-gold-dim bg-void p-3" /><input type="url" value={achievementForm.achPicture} onChange={(event) => setAchievementForm((value) => ({ ...value, achPicture: event.target.value }))} placeholder="URL de imagen (opcional)" className="border border-gold-dim bg-void p-3" /><div className="grid gap-3 sm:grid-cols-2"><input type="number" min="1" value={achievementForm.targetValue} onChange={(event) => setAchievementForm((value) => ({ ...value, targetValue: event.target.value }))} placeholder="Meta (opcional)" className="border border-gold-dim bg-void p-3" /><input maxLength="50" value={achievementForm.progressLabel} onChange={(event) => setAchievementForm((value) => ({ ...value, progressLabel: event.target.value }))} placeholder="Etiqueta de progreso" className="border border-gold-dim bg-void p-3" /></div><label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={achievementForm.isAchHidden} onChange={(event) => setAchievementForm((value) => ({ ...value, isAchHidden: event.target.checked }))} /> Ocultar hasta desbloquear</label><button disabled={saving} className="justify-self-start border border-gold bg-crimson px-4 py-3 font-display text-xs uppercase disabled:opacity-60">Guardar logro</button></div></form><form onSubmit={submitCategory} className="border border-gold-dim bg-panel p-5"><h2 className="font-display text-lg uppercase text-parchment">Categorías del foro</h2><div className="mt-5 grid gap-3"><input required minLength="2" maxLength="100" value={categoryForm.categoryName} onChange={(event) => setCategoryForm((value) => ({ ...value, categoryName: event.target.value }))} placeholder="Nombre de categoría" className="border border-gold-dim bg-void p-3" /><textarea maxLength="500" value={categoryForm.description} onChange={(event) => setCategoryForm((value) => ({ ...value, description: event.target.value }))} placeholder="Descripción (opcional)" className="min-h-24 border border-gold-dim bg-void p-3" /><button disabled={saving} className="justify-self-start border border-gold bg-crimson px-4 py-3 font-display text-xs uppercase disabled:opacity-60">Crear categoría</button></div><ul className="mt-6 divide-y divide-gold-dim border-y border-gold-dim">{data.categories.map((category) => <li key={category.categoryId} className="flex items-center justify-between gap-3 py-3"><span><strong className="font-display text-sm text-parchment">{category.categoryName}</strong><small className="mt-1 block text-muted">{category.description}</small></span><button type="button" disabled={saving} onClick={() => window.confirm(`¿Eliminar la categoría ${category.categoryName}?`) && void runAction(() => apiClient.delete(`/categories/${category.categoryId}`), 'La categoría fue eliminada.')} className="text-xs text-error disabled:opacity-60">Eliminar</button></li>)}</ul></form><article className="border border-warning bg-panel p-5 lg:col-span-2"><h2 className="font-display text-sm uppercase text-warning">Crónicas y Archivo/Extras</h2><p className="mt-2 text-sm leading-6 text-muted">No se pueden publicar cambios desde aquí todavía porque el backend no expone recursos para esas secciones. Añadir formularios sin una API produciría contenido que se pierde al recargar.</p></article></section>}
      </>}
    </div></main>
  </div>;
}
