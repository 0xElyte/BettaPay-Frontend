import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const notify = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  silent: jest.fn(),
};

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => notify,
}));

import { SubscribeForm } from '../SubscribeForm';

/**
 * The regression this guards: the form used to flip straight to "You're
 * subscribed" on submit, with no request and no record. Success must now be
 * reachable only through a server acknowledgement.
 */

function mockFetch(response: { ok: boolean; status: number; body: unknown }) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: async () => response.body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

async function submit(email: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email address for status updates/i), email);
  await user.click(screen.getByRole('button', { name: /subscribe/i }));
  return user;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SubscribeForm', () => {
  it('posts to the subscribe endpoint and confirms only after the ack', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 201,
      body: { status: 'created', message: "You're subscribed." },
    });

    render(<SubscribeForm />);
    await submit('ops@acme.com');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/status/subscribe');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'ops@acme.com' });

    expect(await screen.findByText(/you're subscribed/i)).toBeInTheDocument();
    expect(notify.success).toHaveBeenCalledTimes(1);
  });

  it('shows no success toast when the server rejects the request', async () => {
    mockFetch({
      ok: false,
      status: 500,
      body: { error: 'Subscription service unavailable.' },
    });

    render(<SubscribeForm />);
    await submit('ops@acme.com');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /subscription service unavailable/i,
    );
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledTimes(1);
    // Still on the form, so the subscriber can retry.
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('shows no success toast when the request never reaches the server', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    render(<SubscribeForm />);
    await submit('ops@acme.com');

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't reach/i);
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('tells the subscriber when the address is already on the list', async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: {
        status: 'duplicate',
        message: 'That email is already subscribed to status updates.',
      },
    });

    render(<SubscribeForm />);
    await submit('ops@acme.com');

    expect(await screen.findByText(/already subscribed/i)).toBeInTheDocument();
    expect(notify.info).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('rejects an invalid address without contacting the server', async () => {
    const fetchMock = mockFetch({ ok: true, status: 201, body: { status: 'created' } });

    render(<SubscribeForm />);
    await submit('not-an-email');

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('marks the field invalid and links it to the error message', async () => {
    mockFetch({ ok: true, status: 201, body: { status: 'created' } });

    render(<SubscribeForm />);
    await submit('nope');

    const input = screen.getByLabelText(/email address for status updates/i);
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(input).toHaveAttribute('aria-describedby', 'subscribe-error');
  });
});
