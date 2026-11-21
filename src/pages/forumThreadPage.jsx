import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/landing/sidebar.jsx';
import { navigationItems } from '../components/landing/navigation.js';
import { apiClient, getApiErrorMessage } from '../services/apiClient.js';
import { ForumThreadSkeleton } from '../components/feedback/contentSkeletons.jsx';
import { forumMutations } from '../services/mutations.js';
import { outbox } from '../services/offline/index.js';
import { OUTBOX_STATUS_LABELS, QUEUED_MESSAGE, canRetry, outboxErrorMessage, retryLabel } from '../services/offline/messages.js';
import { useOutbox, useOutboxSynced } from '../hooks/useOutbox.js';

// Runs a mutation, reports queued/sent/failed through the callbacks and blocks repeated clicks.
function useMutationRunner(setError, setNotice) {
  const [busy, setBusy] = useState(false);
  async function run(mutation, { onSent, fallback, queuedMessage = QUEUED_MESSAGE } = {}) {
    if (busy) return null;
    setBusy(true);
    setError('');
    try {
      const result = await mutation();
      if (result.status === 'queued') setNotice(queuedMessage);
      else { setNotice(''); await onSent?.(result.data); }
      return result;
    } catch (error) {
      setError(getApiErrorMessage(error, fallback));
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

function PendingItem({ item, onError }) {
  const editable = item.status !== 'sending' && typeof item.data?.content === 'string';
  async function guarded(action) {
    try { await action(); } catch { onError('No se pudo actualizar la acción pendiente. Inténtalo de nuevo.'); }
  }
  async function edit() {
    const content = window.prompt('Editar antes de enviar', item.data.content);
    if (content?.trim()) await guarded(() => outbox.update(item.id, { ...item.data, content: content.trim() }));
  }
  return <article className="mt-3 border border-dashed border-warning bg-panel p-4 opacity-80">
    <p className="text-xs text-warning">{item.label} · {OUTBOX_STATUS_LABELS[item.status] || item.status}{item.lastError ? ` · ${outboxErrorMessage(item.lastError)}` : ''}</p>
    {item.data?.content && <p className="mt-2 whitespace-pre-wrap">{item.data.content}</p>}
    <div className="mt-3 flex gap-3 text-xs">
      {editable && <button type="button" onClick={() => void edit()} className="text-gold">Editar</button>}
      {canRetry(item) && <button type="button" onClick={() => void guarded(() => outbox.retry(item.id))} className="text-gold">{retryLabel(item)}</button>}
      {item.status !== 'sending' && <button type="button" onClick={() => void guarded(() => outbox.discard(item.id))} className="text-error">Descartar</button>}
    </div>
  </article>;
}

function Post({ post, thread, user, refresh, pendingByPost, onError, onNotice, depth = 0 }) {
  const [replies, setReplies] = useState(null); const [text, setText] = useState(''); const [showReply, setShowReply] = useState(false);
  const { busy, run } = useMutationRunner(onError, onNotice);
  const mine = post.userId === user.userId; const moderator = thread.userId === user.userId;
  const pending = pendingByPost.get(post.postId) || [];
  const pendingDelete = pending.some((item) => item.meta?.kind === 'post:delete');
  async function reply(e) {
    e.preventDefault();
    const result = await run(() => forumMutations.createPost({ threadId: thread.threadId, userId: user.userId, parentPostId: post.postId, content: text }),
      { fallback: 'No se pudo enviar la respuesta.', onSent: () => { setReplies(null); refresh(); } });
    if (result) { setText(''); setShowReply(false); }
  }
  async function remove() { await run(() => forumMutations.deletePost(post.postId, thread.threadId), { fallback: 'No se pudo eliminar el comentario.', onSent: refresh }); }
  async function edit() { const content = window.prompt('Editar comentario', post.content); if (content?.trim()) await run(() => forumMutations.updatePost(post.postId, content.trim(), thread.threadId), { fallback: 'No se pudo editar el comentario.', onSent: refresh }); }
  async function report() { const reason = window.prompt('Motivo del reporte'); if (reason?.trim()) await run(() => forumMutations.reportPost(post.postId, reason.trim(), thread.threadId), { fallback: 'No se pudo enviar el reporte.', onSent: () => onNotice('Reporte enviado.') }); }
  async function loadReplies() {
    try { const { data } = await apiClient.get('/posts/page', { params: { threadId: thread.threadId, parentPostId: post.postId, page: 0, size: 5 } }); setReplies(data); }
    catch (error) { onError(getApiErrorMessage(error, 'No se pudieron cargar las respuestas.')); }
  }
  return <article className={`border border-gold-dim bg-panel p-4 ${depth ? 'ml-5 mt-3' : ''} ${pendingDelete ? 'opacity-50' : ''}`}><p className="text-xs text-gold">{post.username} · {new Date(post.createdAt).toLocaleString('es-MX')}{post.isEdited ? ' · editado' : ''}{pendingDelete ? ' · eliminación pendiente' : ''}</p><p className="mt-2 whitespace-pre-wrap">{post.content}</p>{!thread.isLocked && !pendingDelete && <div className="mt-3 flex gap-3 text-xs"><button type="button" onClick={()=>setShowReply(!showReply)} className="text-gold">Responder</button>{mine && <button type="button" disabled={busy} onClick={edit} className="text-gold disabled:opacity-60">Editar</button>}{(mine || moderator) && <button type="button" disabled={busy} onClick={remove} className="text-error disabled:opacity-60">Eliminar</button>}{!mine && <button type="button" disabled={busy} onClick={report} className="text-warning disabled:opacity-60">Reportar</button>}</div>}{showReply && <form onSubmit={reply} className="mt-3 flex gap-2"><input value={text} onChange={(e)=>setText(e.target.value)} required maxLength="500" className="flex-1 border border-gold-dim bg-void p-2" placeholder="Escribe una respuesta"/><button type="submit" disabled={busy} className="border border-gold px-3 text-gold disabled:opacity-60">Enviar</button></form>}{pending.filter((item) => item.meta?.kind !== 'post:delete').map((item) => <PendingItem key={item.id} item={item} onError={onError} />)}<button type="button" onClick={loadReplies} className="mt-3 text-xs text-gold">{replies ? 'Actualizar respuestas' : 'Ver respuestas'}</button>{replies?.content?.map((reply)=><Post key={reply.postId} post={reply} thread={thread} user={user} refresh={refresh} pendingByPost={pendingByPost} onError={onError} onNotice={onNotice} depth={depth+1}/>)}</article>;
}

export default function ForumThreadPage({ user, onLogout }) {
  const { threadId } = useParams(); const location = useLocation(); const navigate = useNavigate(); const forumPath = `/forum${location.state?.forumSearch ?? ''}`; const [thread,setThread]=useState(null); const [posts,setPosts]=useState({content:[]}); const [content,setContent]=useState(''); const [page,setPage]=useState(0); const [error,setError]=useState(''); const [notice,setNotice]=useState(''); const [reports,setReports]=useState([]);
  const { busy, run } = useMutationRunner(setError, setNotice);
  const { items: outboxItems } = useOutbox();
  const threadItems = outboxItems.filter((item) => item.meta?.threadId === threadId);
  // Pending replies and edits are shown under the post they belong to; nothing can reply to them
  // until the server has created them and given them an id.
  const pendingByPost = new Map();
  for (const item of threadItems) {
    const postId = item.meta?.parentPostId || item.meta?.postId;
    if (postId) pendingByPost.set(postId, [...(pendingByPost.get(postId) || []), item]);
  }
  const pendingRootPosts = threadItems.filter((item) => item.meta?.kind === 'post:create' && !item.meta?.parentPostId);
  const pendingThreadChanges = threadItems.filter((item) => item.meta?.kind?.startsWith('thread:'));
  const load=()=>Promise.all([apiClient.get(`/threads/${threadId}`),apiClient.get('/posts/page',{params:{threadId,page,size:10}})]).then(([a,b])=>{setThread(a.data);setPosts(b.data);}).catch((e)=>setError(getApiErrorMessage(e,'No se pudo cargar el hilo.')));
  useEffect(()=>{void load(); // The page and route define the exact resource request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[threadId,page]);
  useOutboxSynced(({ item }) => { if (item?.meta?.threadId === threadId) void load(); });
  async function publish(e){e.preventDefault();const result=await run(()=>forumMutations.createPost({threadId,userId:user.userId,content}),{fallback:'No se pudo publicar.',onSent:load});if(result)setContent('');}
  async function lock(){await run(()=>forumMutations.lockThread(threadId,!thread.isLocked),{fallback:'No se pudo cambiar el estado de la conversación.',onSent:load});}
  async function editThread(){const title=window.prompt('Editar título',thread.title);const content=window.prompt('Editar contenido',thread.content);if(title?.trim()&&content?.trim()){await run(()=>forumMutations.updateThread(threadId,{title:title.trim(),content:content.trim()}),{fallback:'No se pudo editar el tema.',onSent:load});}}
  async function deleteThread(){if(window.confirm('¿Eliminar esta conversación?')){const result=await run(()=>forumMutations.deleteThread(threadId,thread.title),{fallback:'No se pudo eliminar el tema.'});if(result)void navigate(forumPath);}}
  async function loadReports(){try{const {data}=await apiClient.get(`/threads/${threadId}/reports`);setReports(data.content||[]);}catch(e){setError(getApiErrorMessage(e,'No se pudieron cargar los reportes.'));}}
  if(!thread)return <div className="flex min-h-screen flex-col bg-void md:flex-row"><Sidebar navItems={navigationItems}/><main className="flex-1 px-6 py-8"><div className="mx-auto max-w-4xl"><div className="mb-5 flex items-center justify-between"><Link to={forumPath} className="border border-gold-dim px-3 py-2 text-xs uppercase text-gold">← Volver al foro</Link><button type="button" onClick={onLogout} className="text-gold">Cerrar sesión</button></div><ForumThreadSkeleton />{error&&<p role="alert" className="mt-4 text-error">{error}</p>}</div></main></div>;
  return <div className="flex min-h-screen flex-col bg-void md:flex-row"><Sidebar navItems={navigationItems}/><main className="flex-1 px-6 py-8"><div className="mx-auto max-w-4xl"><div className="mb-5 flex items-center justify-between"><Link to={forumPath} className="border border-gold-dim px-3 py-2 text-xs uppercase text-gold">← Volver al foro</Link><div className="flex justify-end"><button type="button" onClick={onLogout} className="text-gold">Cerrar sesión</button></div></div><article className="border border-gold-dim bg-panel p-6"><p className="text-xs text-gold">{thread.username} {thread.isLocked ? '· Conversación cerrada' : ''}</p><h1 className="mt-2 font-display text-2xl">{thread.title}</h1><p className="mt-4 whitespace-pre-wrap">{thread.content}</p>{thread.userId===user.userId&&<div className="mt-4 flex gap-3"><button type="button" disabled={busy} onClick={lock} className="border border-gold px-3 py-2 text-xs text-gold disabled:opacity-60">{thread.isLocked?'Reabrir':'Cerrar conversación'}</button>{!thread.isLocked&&<button type="button" disabled={busy} onClick={editThread} className="text-gold disabled:opacity-60">Editar tema</button>}<button type="button" disabled={busy} onClick={deleteThread} className="text-error disabled:opacity-60">Eliminar tema</button><button type="button" onClick={loadReports} className="text-warning">Revisar reportes</button></div>}{pendingThreadChanges.map((item)=><p key={item.id} className="mt-3 text-xs text-warning">{item.label} · {OUTBOX_STATUS_LABELS[item.status]}{item.lastError?` · ${outboxErrorMessage(item.lastError)}`:''}</p>)}</article>{reports.map((report)=><p key={report.reportId} className="mt-2 border border-warning p-2 text-sm">Reporte de {report.reporterUsername}: {report.reason} · {report.status}</p>)}{error&&<p role="alert" className="mt-4 text-error">{error}</p>}{notice&&<output className="mt-4 block text-warning">{notice}</output>}<section className="mt-6">{posts.content.map((post)=><Post key={post.postId} post={post} thread={thread} user={user} refresh={load} pendingByPost={pendingByPost} onError={setError} onNotice={setNotice}/>)}{pendingRootPosts.map((item)=><PendingItem key={item.id} item={item} onError={setError}/>)}</section>{!thread.isLocked&&<form onSubmit={publish} className="mt-6 border border-gold-dim bg-panel p-5"><textarea required maxLength="500" value={content} onChange={(e)=>setContent(e.target.value)} className="min-h-24 w-full border border-gold-dim bg-void p-3" placeholder="Escribe un comentario"/><button type="submit" disabled={busy} className="mt-3 border border-gold bg-crimson px-4 py-2 disabled:opacity-60">Publicar comentario</button></form>}<div className="mt-5 flex gap-4"><button type="button" disabled={posts.first} onClick={()=>setPage(page-1)} className="text-gold">Anterior</button><button type="button" disabled={posts.last} onClick={()=>setPage(page+1)} className="text-gold">Siguiente</button></div></div></main></div>;
}
