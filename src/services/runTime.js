/** 83456 -> "1:23.456"; one hour or more -> "1:02:03.456". */
export function formatRunTime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const total = Math.floor(ms);
  const millis = String(total % 1000).padStart(3, '0');
  const seconds = Math.floor(total / 1000) % 60;
  const minutes = Math.floor(total / 60000) % 60;
  const hours = Math.floor(total / 3600000);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}.${millis}` : `${minutes}:${ss}.${millis}`;
}
