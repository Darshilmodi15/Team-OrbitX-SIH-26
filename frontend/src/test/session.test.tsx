import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/services/api', () => ({ logoutSession: vi.fn().mockResolvedValue(undefined), loginUser: vi.fn(), loginGoogle: vi.fn(), registerUser: vi.fn(), getUserProfile: vi.fn(), fetchSavedLocation: vi.fn().mockResolvedValue(null), setAuthFailureHandler: vi.fn() }));
import { getUserProfile, logoutSession, loginUser, loginGoogle, fetchSavedLocation } from '@/services/api';
import { SessionProvider, useSession } from '@/lib/orca/session';

const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;
const authResult = { access_token: 'header.payload.signature', user: { id: 'u1', name: 'Meera', email: 'm@example.com', role: 'USER' } };

describe('session lifecycle', () => {
  beforeEach(() => { vi.mocked(getUserProfile).mockReset(); vi.mocked(loginUser).mockReset(); });

  it('keeps authentication session-scoped and stores no user or chat data locally', async () => {
    vi.mocked(loginUser).mockResolvedValue(authResult);
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.signIn({ contact: 'm@example.com', password: 'private-password', remember: true }));
    expect(result.current.user?.name).toBe('Meera');
    expect(sessionStorage.getItem('orca.auth.session')).toBe(authResult.access_token);
    expect(localStorage.getItem('orca.auth.token')).toBeNull();
    expect(localStorage.getItem('orca.user')).toBeNull();
    expect(localStorage.getItem('orca_assistant_threads_v1')).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain('private-password');
  });

  it('restores a valid profile on reload', async () => {
    sessionStorage.setItem('orca.auth.session', authResult.access_token);
    vi.mocked(getUserProfile).mockResolvedValue(authResult.user);
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.user?.id).toBe('u1');
  });

  it('clears token and user state on logout', async () => {
    vi.mocked(loginUser).mockResolvedValue(authResult);
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.signIn({ contact: 'm@example.com', password: 'secret', remember: false }));
    localStorage.setItem("orca.marine.cache.v4", "old location");
    sessionStorage.setItem("orca.marine.cache.v5.u1", "selected location");
    await act(() => result.current.signOut());
    expect(localStorage.getItem("orca.marine.cache.v4")).toBeNull();
    expect(sessionStorage.getItem("orca.marine.cache.v5.u1")).toBeNull();
    expect(result.current.user).toBeNull();
    expect(logoutSession).toHaveBeenCalledWith(authResult.access_token);
    expect(sessionStorage.getItem('orca.auth.session')).toBeNull();
    expect(localStorage.getItem('orca.user')).toBeNull();
    expect(localStorage.getItem('orca.location')).toBeNull();
    expect(localStorage.getItem('orca_assistant_threads_v1')).toBeNull();
  });

  it('clears legacy account chat data while switching accounts', async () => {
    localStorage.setItem('orca_assistant_threads_v1', JSON.stringify([{ text: 'private chat' }]));
    localStorage.setItem('orca.user', JSON.stringify({ email: 'old@example.com' }));
    vi.mocked(loginUser).mockResolvedValue(authResult);
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.signIn({ contact: 'm@example.com', password: 'secret', remember: true }));
    expect(localStorage.getItem('orca_assistant_threads_v1')).toBeNull();
    expect(localStorage.getItem('orca.user')).toBeNull();
  });
});

it('clears marine cache namespaces without removing unrelated preferences', async () => {
  localStorage.setItem('orca.marine.cache.v4', 'old location');
  sessionStorage.setItem('orca.marine.cache.v5.user', 'selected location');
  localStorage.setItem('orca.language', 'gu');
  const { clearMarineCaches } = await import('@/lib/orca/marine-cache');
  clearMarineCaches();
  expect(localStorage.getItem('orca.marine.cache.v4')).toBeNull();
  expect(sessionStorage.getItem('orca.marine.cache.v5.user')).toBeNull();
  expect(localStorage.getItem('orca.language')).toBe('gu');
});

it('starts with unlocated state on sign in until location is explicitly chosen', async () => {
  vi.mocked(loginUser).mockResolvedValue(authResult);
  const { result } = renderHook(() => useSession(), { wrapper });
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(() => result.current.signIn({contact:'m@example.com', password:'test', remember:false}));
  expect(result.current.location).toBeNull();
  expect(result.current.locationReady).toBe(true);
  const chosen = {coords:{lat:7,lon:93.6},area:'coastal' as const,source:'manual' as const,distanceToCoastKm:1};
  act(() => result.current.setLocation(chosen));
  expect(result.current.location).toEqual(chosen);
});
it('does not resurrect a session when profile restoration finishes after sign-out', async () => {
  let resolveProfile!: (value: any) => void;
  sessionStorage.setItem('orca.auth.session', authResult.access_token);
  vi.mocked(getUserProfile).mockReturnValueOnce(new Promise(resolve => { resolveProfile = resolve; }));
  const { result } = renderHook(() => useSession(), { wrapper });
  await act(() => result.current.signOut());
  await act(async () => resolveProfile(authResult.user));
  expect(result.current.user).toBeNull();
  expect(result.current.token).toBeNull();
});


it('waits for the authoritative saved location before allowing location-gated routes', async () => {
  let resolveLocation!: (value: any) => void;
  sessionStorage.setItem('orca.auth.session', authResult.access_token);
  vi.mocked(getUserProfile).mockResolvedValue(authResult.user);
  vi.mocked(fetchSavedLocation).mockReturnValueOnce(new Promise(resolve => { resolveLocation=resolve; }));
  const { result }=renderHook(()=>useSession(),{wrapper});
  await waitFor(()=>expect(result.current.user?.id).toBe('u1'));
  expect(result.current.locationReady).toBe(false);
  await act(async()=>resolveLocation({lat:18.9,lon:72.7,is_coastal_supported:true,distance_to_coast_km:13.85,coastal_region:'Maharashtra'}));
  expect(result.current.locationReady).toBe(true);
  expect(result.current.location?.coords).toEqual({lat:18.9,lon:72.7});
});
it('keeps the token and offers retry when profile storage is temporarily down',async()=>{
  sessionStorage.setItem('orca.auth.session',authResult.access_token);
  vi.mocked(getUserProfile).mockRejectedValueOnce(Object.assign(new Error('temporarily unavailable'),{status:503}));
  const {result}=renderHook(()=>useSession(),{wrapper});
  await waitFor(()=>expect(result.current.sessionError).toBe(true));
  expect(sessionStorage.getItem('orca.auth.session')).toBe(authResult.access_token);
  vi.mocked(getUserProfile).mockResolvedValueOnce(authResult.user);
  act(()=>result.current.retrySession());
  await waitFor(()=>expect(result.current.user?.id).toBe('u1'));
});


it('establishes Google login through the same session and remember preference', async () => {
  vi.mocked(loginGoogle).mockResolvedValue(authResult);
  const {result} = renderHook(() => useSession(), {wrapper});
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(() => result.current.signInGoogle('google-id-token', false, 'gu'));
  expect(loginGoogle).toHaveBeenCalledWith('google-id-token', 'gu');
  expect(result.current.user?.id).toBe('u1');
  expect(sessionStorage.getItem('orca.auth.session')).toBe(authResult.access_token);
  expect(localStorage.getItem('orca.auth.session')).toBeNull();
});

it('does not establish a session when Google verification fails', async () => {
  vi.mocked(loginGoogle).mockRejectedValue(new Error('Invalid Google token'));
  const {result} = renderHook(() => useSession(), {wrapper});
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => { await expect(result.current.signInGoogle('invalid', true)).rejects.toThrow('Invalid Google token'); });
  expect(result.current.user).toBeNull();
  expect(sessionStorage.getItem('orca.auth.session')).toBeNull();
});
