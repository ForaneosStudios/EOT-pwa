import { useState } from 'react';

const DEFAULT_AVATAR = '/avatars/avatar-1.svg';

// A player's portrait: a catalog silhouette or their camera photo. If the photo cannot be loaded
// (offline, removed) it falls back to the default silhouette instead of a broken image.
export default function UserAvatar({ src, username, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const shown = src && src !== failedSrc ? src : DEFAULT_AVATAR;
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-gold-dim bg-crimson/25 ${className}`}>
    <img src={shown} alt={`Avatar de ${username}`} loading="lazy" decoding="async" referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
  </span>;
}
