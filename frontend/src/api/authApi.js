const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function getToken()    { return localStorage.getItem('access'); }
export function getRefresh()  { return localStorage.getItem('refresh'); }

export function logout() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
}

// ─── Token refresh ────────────────────────────────────────────────────────────

let _refreshPromise = null; // deduplicate concurrent refresh attempts

async function tryRefresh() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refresh = getRefresh();
    if (!refresh) { logout(); return false; }
    try {
      const res = await fetch(`${BASE}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) { logout(); return false; }
      const data = await res.json();
      localStorage.setItem('access', data.access);
      if (data.refresh) localStorage.setItem('refresh', data.refresh);
      return true;
    } catch {
      logout();
      return false;
    }
  })();

  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
  }
}

// ─── Core fetch wrapper — auto-refreshes on 401 ───────────────────────────────

async function authedFetch(path, options = {}) {
  const withAuth = () => ({
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${getToken()}`,
    },
  });

  let res = await fetch(`${BASE}${path}`, withAuth());

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (!refreshed) {
      const err = new Error('Your session has expired. Please sign in again.');
      err.code = 'session_expired';
      throw err;
    }
    res = await fetch(`${BASE}${path}`, withAuth());
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || 'Request failed');
  return data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function login(username, password) {
  const res = await fetch(`${BASE}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Invalid username or password.');
  localStorage.setItem('access', data.access);
  localStorage.setItem('refresh', data.refresh);
  return data;
}

export async function register(username, password, sleeper_username, extra = {}) {
  const res = await fetch(`${BASE}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, sleeper_username, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || 'Registration failed.');
  return data;
}

export async function fetchMe() {
  return authedFetch('/me/');
}

export async function updateProfile(data) {
  return authedFetch('/me/', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// ── Season / Organizer API ────────────────────────────────────────────────────

export const fetchSeasons = () =>
  fetch(`${BASE}/seasons/`).then((r) => r.json());

export const createSeason = (data) =>
  authedFetch('/seasons/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const patchSeason = (year, data) =>
  authedFetch(`/seasons/${year}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const fetchOrganizer = (year) =>
  authedFetch(`/seasons/${year}/organizer/`);

export const createPlannedLeague = (year, data) =>
  authedFetch(`/seasons/${year}/planned-leagues/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const patchPlannedLeague = (id, data) =>
  authedFetch(`/planned-leagues/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const deletePlannedLeague = (id) =>
  authedFetch(`/planned-leagues/${id}/`, { method: 'DELETE' });

export const assignMember = (leagueId, memberId) =>
  authedFetch(`/planned-leagues/${leagueId}/assign/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: memberId }) });

export const unassignMember = (leagueId, memberId) =>
  authedFetch(`/planned-leagues/${leagueId}/assign/${memberId}/`, { method: 'DELETE' });

export const toggleSeasonDues = (year, memberId) =>
  authedFetch(`/seasons/${year}/dues/${memberId}/`, { method: 'PATCH' });
