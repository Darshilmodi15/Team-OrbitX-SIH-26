import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/services/api', () => ({ loginUser: vi.fn(), registerUser: vi.fn(), getUserProfile: vi.fn(), setAuthFailureHandler: vi.fn() }));
import { getUserProfile, loginUser } from '@/services/api';
import { SessionProvider, useSession } from '@/lib/orca/session';

const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;
const authResult = { access_token: 'header.payload.signature', user: { id: 'u1', name: 'Meera', email: 'm@example.com', role: 'USER' } };

describe('session lifecycle', () => {
  beforeEach(() => { vi.mocked(getUserProfile).mockReset(); vi.mocked(loginUser).mockReset(); });

  it('logs in and stores a remembered session without storing the password', async () => {
    vi.mocked(loginUser).mockResolvedValue(authResult);
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.signIn({ contact: 'm@example.com', password: 'private-password', remember: true }));
    expect(result.current.user?.name).toBe('Meera');
    expect(localStorage.getItem('orca.auth.token')).toBe(authResult.access_token);
    expect(JSON.stringify(localStorage)).not.toContain('private-password');
  });

  it('restores a valid profile on reload', async () => {
    localStorage.setItem('orca.auth.token', authResult.access_token);
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
    act(() => result.current.signOut());
    expect(result.current.user).toBeNull();
    expect(sessionStorage.getItem('orca.auth.session')).toBeNull();
  });
});
