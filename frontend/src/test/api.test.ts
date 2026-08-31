import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loginUser, sendChatMessage, transcribeVoiceAudio } from '@/services/api';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

describe('authenticated API contracts', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

  it('posts credentials to the backend login endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ access_token: 'jwt', user: { id: '1' } }));
    await loginUser('fish@example.com', 'secret123');
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/api/auth/login');
    expect(JSON.parse(String(init?.body))).toEqual({ email_or_phone: 'fish@example.com', password: 'secret123' });
  });

  it('throws the backend wrong-password message', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ detail: 'Invalid password.' }, 401));
    await expect(loginUser('fish@example.com', 'wrong')).rejects.toThrow('Invalid password.');
  });

  it('sends one chat request with session and request IDs', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ answer: 'verified' }));
    await sendChatMessage({ message: 'Weather?', session_id: 's1', request_id: 'r1' });
    expect(fetch).toHaveBeenCalledOnce();
    const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(payload).toMatchObject({ message: 'Weather?', session_id: 's1', request_id: 'r1' });
  });

  it('attaches the bearer token centrally', async () => {
    sessionStorage.setItem('orca.auth.session', 'signed-jwt');
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ answer: 'ok' }));
    await sendChatMessage({ message: 'Hello' });
    const headers = new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer signed-jwt');
  });

  it('uses an extension matching the recorded MIME type', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true, transcript: 'hello' }));
    await transcribeVoiceAudio(new Blob(['audio'], { type: 'audio/mp4' }), 'en');
    const form = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    expect((form.get('file') as File).name).toBe('recording.mp4');
  });

  it('surfaces controlled STT failures', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: false, error_code: 'STT_UPSTREAM_UNAVAILABLE' }, 503));
    await expect(transcribeVoiceAudio(new Blob(['audio'], { type: 'audio/webm' }))).rejects.toThrow('503');
  });
});
