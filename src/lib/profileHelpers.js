export function normalizeUsername(value) {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';

  const sanitized = trimmed.replace(/[^a-z0-9._-]/g, '');
  return sanitized.length ? sanitized : '';
}

export function isMissingUsernameColumnError(error) {
  const message = error?.message || '';
  const lower = message.toLowerCase();

  return lower.includes('column') && lower.includes('does not exist');
}

export async function canUseUsernameColumn(supabaseClient) {
  try {
    const { error } = await supabaseClient.from('profiles').select('username').limit(1).maybeSingle();

    if (!error) {
      return { available: true, error: null };
    }

    return {
      available: !isMissingUsernameColumnError(error),
      error,
    };
  } catch (error) {
    return {
      available: !isMissingUsernameColumnError(error),
      error,
    };
  }
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
