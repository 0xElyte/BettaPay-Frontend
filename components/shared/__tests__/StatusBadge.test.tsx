import { render, screen } from '@testing-library/react';

import { PAYMENT_STATUS } from '@/lib/utils/constants';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders a success badge with the success label and green styling', () => {
  it('renders a completed badge with the completed label and success styling', () => {
    const { container } = render(<StatusBadge status={PAYMENT_STATUS.COMPLETED} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Completed').closest('span')).toHaveClass('text-success');
    expect(screen.getByText('Completed').closest('span')).toHaveClass('text-status-ok');
  });

  it('maps the legacy "success" spelling onto the completed badge', () => {
    render(<StatusBadge status="success" />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders a pending badge with the pending label and yellow styling', () => {
    const { container } = render(<StatusBadge status={PAYMENT_STATUS.PENDING} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Pending').closest('span')).toHaveClass('text-status-warn');
  });

  it('renders a processing badge with the processing label and blue styling', () => {
    const { container } = render(<StatusBadge status={PAYMENT_STATUS.PROCESSING} />);

    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Processing').closest('span')).toHaveClass('text-status-info');
  });

  it('spins the icon while processing', () => {
    const { container } = render(<StatusBadge status={PAYMENT_STATUS.PROCESSING} />);

    expect(container.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('renders a failed badge with the failed label and destructive styling', () => {
    const { container } = render(<StatusBadge status={PAYMENT_STATUS.FAILED} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Failed').closest('span')).toHaveClass('text-status-down');
  });

  it('falls back to the provided status text when the status is unknown', () => {
    render(<StatusBadge status="custom" />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    expect(screen.getByText('custom').closest('span')).toHaveClass('bg-status-neutral-bg');
  });

  it('adds the provided className to the badge', () => {
    render(<StatusBadge status={PAYMENT_STATUS.COMPLETED} className="custom-badge" />);

    expect(screen.getByText('Completed').closest('span')).toHaveClass('custom-badge');
  });
});
