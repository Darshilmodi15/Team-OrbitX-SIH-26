import { render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

afterEach(() => { vi.unstubAllEnvs(); delete window.google; });

it('uses the configured audience and ignores Google callbacks while submitting', async () => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client');
  let callback!: (response: {credential: string}) => void;
  const initialize = vi.fn(config => { callback = config.callback; });
  const renderButton = vi.fn();
  window.google = {accounts: {id: {initialize, renderButton}}};
  const onSuccess = vi.fn();
  const view = render(<GoogleSignInButton onSuccess={onSuccess} />);
  await waitFor(() => expect(renderButton).toHaveBeenCalledOnce());
  expect(initialize).toHaveBeenCalledWith(expect.objectContaining({client_id: 'test-client', auto_select: false}));
  view.rerender(<GoogleSignInButton onSuccess={onSuccess} disabled />);
  callback({credential:'blocked-token'});
  expect(onSuccess).not.toHaveBeenCalled();
  view.rerender(<GoogleSignInButton onSuccess={onSuccess} />);
  callback({credential:'verified-by-server-next'});
  expect(onSuccess).toHaveBeenCalledWith('verified-by-server-next');
  expect(initialize).toHaveBeenCalledOnce();
  view.unmount();
  callback({credential:'late-token'});
  expect(onSuccess).toHaveBeenCalledTimes(1);
});

it('does not display a pretend Google button without a client ID', () => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
  const {container} = render(<GoogleSignInButton onSuccess={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
