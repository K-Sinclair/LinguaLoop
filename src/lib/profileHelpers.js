export function normalizeUsername(value) {
  if (typeof value !== 'string') return '';

  return value.trim().toLowerCase();
}

export function isValidUsername(value) {
  return /^[a-z0-9][a-z0-9._-]{2,29}$/.test(normalizeUsername(value));
}

export function getProfileInitials(displayName, email) {
  const base = displayName?.trim() || email?.trim() || '';
  if (!base) return 'L';

  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}
