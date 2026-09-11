import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
vi.mock('@/components/orca/AppShell', () => ({ AppShell: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
vi.mock('@/lib/orca/session', () => ({ useSession: () => ({ user: { id: 'u1' }, location: { coords: { lat: 20.9, lon: 70.3 } } }) }));
vi.mock('@/services/api', () => ({ fetchConversations: vi.fn(), createConversation: vi.fn(), sendChatMessage: vi.fn(), deleteConversation: vi.fn(), transcribeVoiceAudio: vi.fn(), synthesizeVoiceAudio: vi.fn() }));
import { createConversation, fetchConversations, sendChatMessage } from '@/services/api';
import AssistantPage from '@/pages/AssistantPage';
beforeEach(() => {
  vi.mocked(fetchConversations).mockResolvedValue([]);
  vi.mocked(createConversation).mockResolvedValue({ id: 'c1' });
  vi.mocked(sendChatMessage).mockResolvedValue({ answer: 'Provider result', language: 'en' });
  Element.prototype.scrollIntoView = vi.fn();
});
const mount = () => render(<I18nProvider><AssistantPage /></I18nProvider>);
it('suggestion sends exactly the question the user clicked', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'What does PFZ mean?' }));
  await waitFor(() => expect(sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({ message: 'What does PFZ mean?', session_id: 'c1' })));
  expect(await screen.findByText('Provider result')).toBeInTheDocument();
});
it('typed enter submits the actual message once', async () => {
  mount();
  const input = screen.getByPlaceholderText('Ask anything about your coastal safety…');
  fireEvent.change(input, { target: { value: 'Explain waves' } });
  fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
  await waitFor(() => expect(sendChatMessage).toHaveBeenCalledTimes(1));
  expect(sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({ message: 'Explain waves' }));
});
it('conversation failure leaves an error and permits a subsequent send', async () => {
  vi.mocked(createConversation).mockRejectedValueOnce(new Error('HTTP 503'));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'What does PFZ mean?' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not start the conversation');
  fireEvent.click(screen.getByRole('button', { name: 'What does PFZ mean?' }));
  expect(await screen.findByText('Provider result')).toBeInTheDocument();
});
it('provider failure is an error, not an assistant message', async () => {
  vi.mocked(sendChatMessage).mockRejectedValueOnce(Object.assign(new Error('Provider unavailable'), { code: 'AI_PROVIDER_UNAVAILABLE' }));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'What does PFZ mean?' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ORCA’s AI provider is temporarily unavailable');
  expect(screen.queryByText('Provider result')).not.toBeInTheDocument();
});

it('keeps unrelated server errors generic without exposing technical details', async () => {
  vi.mocked(sendChatMessage).mockRejectedValueOnce(new Error('Internal database exception'));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'What does PFZ mean?' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The chat request could not be completed');
  expect(screen.queryByText('Internal database exception')).not.toBeInTheDocument();
});

it('microphone denial leaves an error and sends no audio or chat', async () => {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.stubGlobal('MediaRecorder', class {});
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Record voice' }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledWith({ audio: true }));
  expect(await screen.findByText(/Microphone unavailable/)).toBeInTheDocument();
  expect(sendChatMessage).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
