import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/landing/sidebar.jsx';
import PageHeader from '../components/landing/pageHeader.jsx';
import FormField from '../components/formField.jsx';
import { navigationItems } from '../components/landing/navigation.js';
import { apiClient, getApiErrorMessage } from '../services/apiClient.js';
import { updatePassword } from '../services/authService.js';

const avatars = Array.from({ length: 6 }, (_, index) => `/avatars/avatar-${index + 1}.svg`);
const passwordIsValid = (value) => value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
const formatDate = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(value)) : 'Fecha no disponible';

function ProfileAvatar({ src, username, className = '' }) {
  return <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-gold bg-crimson/25 ${className}`}>
    {src ? <img src={src} alt={`Avatar de ${username}`} className="h-full w-full object-cover" /> : <span aria-hidden="true" className="font-display text-4xl text-gold">♛</span>}
  </div>;
}

export default function ProfilePage({ user, onLogout, onUserUpdate, message }) {
  const [state, setState] = useState({ loading: true, achievements: [], error: '' });
  const [attempt, setAttempt] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState(user.profilePicture || avatars[0]);
  const [avatarStatus, setAvatarStatus] = useState({ saving: false, message: '', error: '' });
  const [passwords, setPasswords] = useState({ password: '', confirmation: '' });
  const [passwordStatus, setPasswordStatus] = useState({ saving: false, message: '', error: '' });

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/user-achievements/me', { signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Respuesta inválida');
      setState({ loading: false, achievements: data, error: '' });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ loading: false, achievements: [], error: getApiErrorMessage(error, 'No se pudo cargar el progreso.') });
    });
    return () => controller.abort();
  }, [attempt, user.userId]);

  const unlockedAchievements = state.achievements.filter((achievement) => achievement.isUnlocked === true);

  async function saveAvatar() {
    if (selectedAvatar === user.profilePicture) return;
    setAvatarStatus({ saving: true, message: '', error: '' });
    try {
      const { data } = await apiClient.patch('/users/me/profile-picture', { profilePicture: selectedAvatar });
      onUserUpdate(data);
      setAvatarStatus({ saving: false, message: 'Retrato actualizado.', error: '' });
    } catch (error) {
      setAvatarStatus({ saving: false, message: '', error: getApiErrorMessage(error, 'No se pudo actualizar el retrato.') });
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    if (!passwordIsValid(passwords.password)) {
      setPasswordStatus({ saving: false, message: '', error: 'Usa al menos 8 caracteres, una mayúscula y un número.' });
      return;
    }
    if (passwords.password !== passwords.confirmation) {
      setPasswordStatus({ saving: false, message: '', error: 'Las contraseñas no coinciden.' });
      return;
    }
    setPasswordStatus({ saving: true, message: '', error: '' });
    try {
      await updatePassword(passwords.password);
      setPasswords({ password: '', confirmation: '' });
      setPasswordStatus({ saving: false, message: 'Contraseña actualizada.', error: '' });
    } catch (error) {
      setPasswordStatus({ saving: false, message: '', error: getApiErrorMessage(error, 'No se pudo actualizar la contraseña.') });
    }
  }

  const retry = () => { setState((current) => ({ ...current, loading: true, error: '' })); setAttempt((value) => value + 1); };

  return <div className="flex min-h-screen flex-col bg-void md:flex-row">
    <Sidebar navItems={navigationItems} />
    <main className="flex-1 px-6 py-8 md:px-10">
      <div className="page-enter mx-auto max-w-5xl">
        <div className="flex justify-end"><button type="button" onClick={onLogout} className="border border-gold-dim px-4 py-2 font-display text-xs uppercase text-gold hover:border-gold">Cerrar sesión</button></div>
        <PageHeader eyebrow="Registro VI · Identidad" title="El Perfil del Heredero" subtitle="Tu identidad y tus hazañas dentro del reino." />
        {message && <p role="alert" className="mt-4 text-error">{message}</p>}

        <section className="mt-8 border border-gold-dim bg-panel p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <ProfileAvatar src={user.profilePicture || avatars[0]} username={user.username} className="h-28 w-28" />
            <div><h2 className="font-display text-xl uppercase text-parchment">{user.username}</h2><p className="mt-3 text-muted">Jugador de Echoes of the Throne</p>{state.loading ? <output className="mt-4 block text-gold">Cargando logros...</output> : <p className="mt-4 font-display uppercase text-gold">{unlockedAchievements.length} logros desbloqueados</p>}</div>
          </div>
          <dl className="mt-7 grid gap-4 border-t border-gold-dim pt-6 text-sm sm:grid-cols-2"><div><dt className="font-display text-xs uppercase text-gold">Correo electrónico</dt><dd className="mt-1 break-all text-parchment">{user.email || 'No disponible'}</dd></div><div><dt className="font-display text-xs uppercase text-gold">Miembro desde</dt><dd className="mt-1 text-parchment">{formatDate(user.createdAt)}</dd></div></dl>
        </section>

        <section className="mt-6 border border-gold-dim bg-panel p-6 sm:p-7" aria-labelledby="avatar-title">
          <h2 id="avatar-title" className="font-display text-lg uppercase text-parchment">Retrato del heredero</h2><p className="mt-2 text-sm text-muted">Elige una silueta del catálogo.</p>
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">{avatars.map((avatar, index) => <button key={avatar} type="button" onClick={() => { setSelectedAvatar(avatar); setAvatarStatus({ saving: false, message: '', error: '' }); }} aria-label={`Seleccionar silueta ${index + 1}`} aria-pressed={selectedAvatar === avatar} className={`aspect-square overflow-hidden border p-1 transition-colors ${selectedAvatar === avatar ? 'border-crimson bg-crimson/20' : 'border-gold-dim hover:border-gold'}`}><img src={avatar} alt="" className="h-full w-full" /></button>)}</div>
          <button type="button" disabled={avatarStatus.saving || selectedAvatar === user.profilePicture} onClick={saveAvatar} className="mt-5 border border-gold bg-crimson px-5 py-3 font-display text-xs uppercase text-parchment hover:bg-crimson-light disabled:opacity-60">{avatarStatus.saving ? 'Guardando...' : 'Guardar retrato'}</button>
          {avatarStatus.message && <p role="status" className="mt-3 text-success">{avatarStatus.message}</p>}{avatarStatus.error && <p role="alert" className="mt-3 text-error">{avatarStatus.error}</p>}
        </section>

        <section className="mt-6 border border-gold-dim bg-panel p-6 sm:p-7" aria-labelledby="password-title">
          <h2 id="password-title" className="font-display text-lg uppercase text-parchment">Cambiar contraseña</h2><p className="mt-2 text-sm text-muted">Usa al menos 8 caracteres, una mayúscula y un número.</p>
          <form onSubmit={savePassword} className="mt-5 grid gap-5 sm:max-w-lg"><FormField id="profile-password" label="Nueva contraseña" type="password" autoComplete="new-password" showPasswordToggle value={passwords.password} onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))} /><FormField id="profile-password-confirmation" label="Confirmar contraseña" type="password" autoComplete="new-password" showPasswordToggle value={passwords.confirmation} onChange={(event) => setPasswords((current) => ({ ...current, confirmation: event.target.value }))} /><button type="submit" disabled={passwordStatus.saving} className="justify-self-start border border-gold bg-crimson px-5 py-3 font-display text-xs uppercase text-parchment hover:bg-crimson-light disabled:opacity-60">{passwordStatus.saving ? 'Guardando...' : 'Actualizar contraseña'}</button></form>
          {passwordStatus.message && <p role="status" className="mt-3 text-success">{passwordStatus.message}</p>}{passwordStatus.error && <p role="alert" className="mt-3 text-error">{passwordStatus.error}</p>}
        </section>

        <section className="mt-6 border border-gold-dim bg-panel p-6 sm:p-7" aria-labelledby="achievements-title">
          <div className="flex flex-wrap items-baseline justify-between gap-3"><div><h2 id="achievements-title" className="font-display text-lg uppercase text-parchment">Logros obtenidos</h2><p className="mt-2 text-sm text-muted">Las hazañas ya grabadas en tu legado.</p></div><Link to="/achievements" className="font-display text-xs uppercase text-gold underline">Ver todos</Link></div>
          {state.error && <div className="mt-5"><p role="alert" className="text-error">{state.error}</p><button type="button" onClick={retry} className="mt-2 text-gold underline">Reintentar</button></div>}{!state.loading && !state.error && unlockedAchievements.length === 0 && <p className="mt-5 text-muted">Aún no has desbloqueado logros.</p>}
          {!state.loading && !state.error && unlockedAchievements.length > 0 && <ul className="mt-5 divide-y divide-gold-dim border-y border-gold-dim">{unlockedAchievements.map((achievement) => <li key={achievement.achId} className="flex items-center gap-4 py-4"><div className="h-12 w-12 shrink-0 overflow-hidden border border-gold bg-crimson/25">{achievement.achPicture ? <img src={achievement.achPicture} alt="" className="h-full w-full object-cover" /> : <span aria-hidden="true" className="flex h-full items-center justify-center text-gold">✦</span>}</div><div className="min-w-0"><h3 className="font-display text-sm text-parchment">{achievement.achName}</h3><p className="mt-1 text-sm text-muted">{achievement.achDescription}</p></div><time dateTime={achievement.unlockedAt || undefined} className="ml-auto shrink-0 text-right text-xs text-gold">{formatDate(achievement.unlockedAt)}</time></li>)}</ul>}
        </section>
      </div>
    </main>
  </div>;
}
