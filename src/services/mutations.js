// Every write the PWA makes to the API goes through here, so it gets an Idempotency-Key, offline
// queueing and duplicate protection. Each function resolves to { status: 'sent', data } or
// { status: 'queued', item } and rejects only when the server refused the request outright.
// Supabase Auth calls (login, sign-up, passwords) are never queued and do not belong here.
import { sendMutation } from './offline/index.js';

const send = (method, url, data, label, meta) => sendMutation({ method, url, data, label, meta });

export const forumMutations = {
  createThread: ({ userId, title, content }) =>
    send('POST', '/threads', { userId, title, content }, `Nuevo tema: ${title}`, { kind: 'thread:create' }),
  updateThread: (threadId, { title, content }) =>
    send('PUT', `/threads/${threadId}`, { title, content }, `Editar tema: ${title}`, { kind: 'thread:update', threadId }),
  deleteThread: (threadId, title = '') =>
    send('DELETE', `/threads/${threadId}`, undefined, `Eliminar tema ${title}`.trim(), { kind: 'thread:delete', threadId }),
  lockThread: (threadId, locked) =>
    send('PATCH', `/threads/${threadId}/lock`, { locked }, locked ? 'Cerrar conversación' : 'Reabrir conversación',
      { kind: 'thread:lock', threadId }),
  createPost: ({ threadId, userId, content, parentPostId }) =>
    send('POST', '/posts', { threadId, userId, parentPostId, content },
      parentPostId ? 'Responder comentario' : 'Nuevo comentario', { kind: 'post:create', threadId, parentPostId }),
  updatePost: (postId, content, threadId) =>
    send('PUT', `/posts/${postId}`, { content }, 'Editar comentario', { kind: 'post:update', threadId, postId }),
  deletePost: (postId, threadId) =>
    send('DELETE', `/posts/${postId}`, undefined, 'Eliminar comentario', { kind: 'post:delete', threadId, postId }),
  reportPost: (postId, reason, threadId) =>
    send('POST', `/posts/${postId}/reports`, { reason }, 'Reportar comentario', { kind: 'post:report', threadId, postId }),
};

export const adminMutations = {
  deleteUser: (account) =>
    send('DELETE', `/users/${account.userId}`, undefined, `Eliminar cuenta ${account.username}`, { kind: 'admin:user:delete' }),
  deleteThread: (thread) => forumMutations.deleteThread(thread.threadId, thread.title),
  lockThread: (thread, locked) => forumMutations.lockThread(thread.threadId, locked),
  createAchievement: (payload) =>
    send('POST', '/achievements', payload, `Nuevo logro: ${payload.achName}`, { kind: 'admin:achievement:create' }),
  createCategory: (payload) =>
    send('POST', '/categories', payload, `Nueva categoría: ${payload.categoryName}`, { kind: 'admin:category:create' }),
  deleteCategory: (category) =>
    send('DELETE', `/categories/${category.categoryId}`, undefined, `Eliminar categoría ${category.categoryName}`,
      { kind: 'admin:category:delete' }),
};

export const profileMutations = {
  updateAvatar: (profilePicture) =>
    send('PATCH', '/users/me/profile-picture', { profilePicture }, 'Cambiar retrato', { kind: 'profile:avatar' }),
};
