import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTimeoutModal } from '../SessionTimeoutModal';

jest.mock('@/lib/utils/announce', () => ({
  announce: jest.fn(),
}));

describe('SessionTimeoutModal Component', () => {
  it('renders standard countdown when secondsRemaining > 60', () => {
    render(
      <SessionTimeoutModal
        open={true}
        secondsRemaining={180}
        onExtend={jest.fn()}
        onLogout={jest.fn()}
      />
    );

    expect(screen.getByText('Session Expiring')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Extend Session/i })).toBeInTheDocument();
  });

  it('renders re-authentication grace prompt in the final minute (<= 60s)', () => {
    render(
      <SessionTimeoutModal
        open={true}
        secondsRemaining={45}
        onExtend={jest.fn()}
        onLogout={jest.fn()}
      />
    );

    expect(screen.getByText('Re-authenticate Session')).toBeInTheDocument();
    expect(screen.getByText('0:45')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter password to verify/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Re-authenticate & Stay Logged In/i })).toBeInTheDocument();
  });

  it('calls onExtend when extend button is clicked', async () => {
    const user = userEvent.setup();
    const handleExtend = jest.fn();

    render(
      <SessionTimeoutModal
        open={true}
        secondsRemaining={120}
        onExtend={handleExtend}
        onLogout={jest.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Extend Session/i }));
    expect(handleExtend).toHaveBeenCalledTimes(1);
  });

  it('calls onLogout when logout button is clicked', async () => {
    const user = userEvent.setup();
    const handleLogout = jest.fn();

    render(
      <SessionTimeoutModal
        open={true}
        secondsRemaining={120}
        onExtend={jest.fn()}
        onLogout={handleLogout}
      />
    );

    await user.click(screen.getByRole('button', { name: /Logout/i }));
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });
});
