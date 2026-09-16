import { MemoryRouter, Routes, Route } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
vi.mock('@/components/orca/AppShell', () => ({ AppShell: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
vi.mock('@/lib/orca/session', () => ({ useSession: () => ({ user: { id: 'u1' }, location: { coords: { lat: 20.9, lon: 70.3 } } }) }));
vi.mock('@/lib/orca/snapshot', async (original) => ({ ...await original<any>(), useMarineSnapshot: () => ({ snapshot:undefined, adopt:vi.fn(), refetch:vi.fn() }) }));
vi.mock('@/services/api', () => ({ fetchConversations: vi.fn(), fetchConversation: vi.fn(), createConversation: vi.fn(), sendChatMessage: vi.fn(), deleteConversation: vi.fn(), transcribeVoiceAudio: vi.fn(), synthesizeVoiceAudio: vi.fn() }));
import { createConversation, fetchConversations, fetchConversation, sendChatMessage } from '@/services/api';
import AssistantPage from '@/pages/AssistantPage';
beforeEach(() => {
  vi.mocked(fetchConversation).mockReset();
  vi.mocked(fetchConversations).mockResolvedValue([]);
  vi.mocked(createConversation).mockResolvedValue({ id: 'c1' });
  vi.mocked(sendChatMessage).mockResolvedValue({ answer: 'Provider result', language: 'en' });
  Element.prototype.scrollIntoView = vi.fn();
});
const mount = (path = "/assistant") => render(<MemoryRouter initialEntries={[path]}><I18nProvider><Routes><Route path="/assistant" element={<AssistantPage />} /><Route path="/assistant/c/:conversationId" element={<AssistantPage />} /></Routes></I18nProvider></MemoryRouter>);
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


it('restores the exact conversation from its URL, including older conversations', async () => {
  vi.mocked(fetchConversation).mockResolvedValue({ id: 'older', title: 'Old trip', updated_at: new Date().toISOString(), messages: [{ id: 'm1', role: 'assistant', content: 'Persisted trip advice', created_at: new Date().toISOString() }] });
  mount('/assistant/c/older');
  expect(await screen.findByText('Persisted trip advice')).toBeInTheDocument();
  expect(fetchConversation).toHaveBeenCalledWith('older');
  expect(sendChatMessage).not.toHaveBeenCalled();
});

it('does not display another conversation when the requested URL is denied', async () => {
  vi.mocked(fetchConversation).mockRejectedValue(new Error('404'));
  mount('/assistant/c/denied');
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByText('Persisted trip advice')).not.toBeInTheDocument();
});


it('reload of a failed request retries the persisted request ID without a duplicate user bubble',async()=>{
  vi.mocked(fetchConversation).mockResolvedValue({id:'retry-thread',title:'Retry',updated_at:new Date().toISOString(),messages:[{id:'server-user',role:'user',content:'Explain waves',created_at:new Date().toISOString(),metadata:{request_id:'durable-attempt',request_language:'en',requested_time:null}}]});
  mount('/assistant/c/retry-thread');
  await waitFor(()=>expect(screen.getByPlaceholderText('Ask anything about your coastal safety…')).toHaveValue('Explain waves'));
  fireEvent.keyDown(screen.getByPlaceholderText('Ask anything about your coastal safety…'),{key:'Enter'});
  await waitFor(()=>expect(sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({request_id:'durable-attempt',session_id:'retry-thread',message:'Explain waves'})));
  expect(screen.getAllByText('Explain waves')).toHaveLength(1);
});

it('voice yields an editable transcript and submits only through the normal text pipeline',async()=>{
  const {transcribeVoiceAudio}=await import('@/services/api');
  vi.mocked(transcribeVoiceAudio).mockResolvedValue({transcript:'Test spoken question',language:'en',english_transcript:'Test spoken question',is_mock:false,source:'sarvam_saaras_v3'});
  Object.defineProperty(window,'isSecureContext',{configurable:true,value:true});
  const stop=vi.fn();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn().mockResolvedValue({getTracks:()=>[{stop}]})}});
  class Recorder{
    static isTypeSupported(){return true;}
    state='inactive';mimeType='audio/webm';ondataavailable:any;onstop:any;
    start(){this.state='recording';}
    stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['isolated audio fixture'])});void this.onstop?.();}
  }
  vi.stubGlobal('MediaRecorder',Recorder);
  mount();fireEvent.click(screen.getByRole('button',{name:'Record voice'}));
  fireEvent.click(await screen.findByRole('button',{name:'Done Speaking'}));
  const input=screen.getByPlaceholderText('Ask anything about your coastal safety…');
  await waitFor(()=>expect(input).toHaveValue('Test spoken question'));
  expect(screen.getByText(/Transcript ready/)).toBeVisible();expect(sendChatMessage).not.toHaveBeenCalled();
  fireEvent.change(input,{target:{value:'Edited spoken question'}});fireEvent.keyDown(input,{key:'Enter'});
  await waitFor(()=>expect(sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({message:'Edited spoken question'})));
  expect(stop).toHaveBeenCalled();vi.unstubAllGlobals();
});
