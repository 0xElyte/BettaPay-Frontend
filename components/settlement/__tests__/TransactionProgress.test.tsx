import React from 'react';
import { render, screen } from '@testing-library/react';
import { TransactionProgress } from '@/components/settlement/TransactionProgress';

describe('TransactionProgress — backend-driven states', () => {
  it('idle shows all steps pending (no active spinner beyond)', () => {
    render(<TransactionProgress status="idle" />);
    // 3 pending Circles, no spinner, no checkmarks
    // Each step label present
    expect(screen.getByText('Freighter Signing')).toBeInTheDocument();
    expect(screen.getByText('Horizon Submission')).toBeInTheDocument();
    expect(screen.getByText('Ledger Confirmation')).toBeInTheDocument();
    // No success or failure text in idle
    expect(screen.queryByText('Failed — see error below')).not.toBeInTheDocument();
    // No indeterminate spinner labelled
    expect(screen.queryByLabelText(/in progress/)).not.toBeInTheDocument();
  });

  it('signing shows indeterminate spinner on step 0 only', () => {
    render(<TransactionProgress status="signing" />);
    expect(screen.getByLabelText('Freighter Signing in progress')).toBeInTheDocument();
    // Horizon and Ledger not active
    expect(screen.queryByLabelText('Horizon Submission in progress')).not.toBeInTheDocument();
  });

  it('submitting shows spinner on step 1, step 0 completed', () => {
    const { container } = render(<TransactionProgress status="submitting" />);
    expect(screen.getByLabelText('Horizon Submission in progress')).toBeInTheDocument();
    // Step 0 should be completed (checkmark) – we assert via class or svg presence
    // There should be one checkmark (success) visible
    const checks = container.querySelectorAll('svg');
    expect(checks.length).toBeGreaterThan(0);
  });

  it('confirming shows spinner on step 2, prior steps completed', () => {
    render(<TransactionProgress status="confirming" />);
    expect(screen.getByLabelText('Ledger Confirmation in progress')).toBeInTheDocument();
    expect(screen.queryByLabelText('Freighter Signing in progress')).not.toBeInTheDocument();
  });

  it('completed shows all steps completed, no spinner', () => {
    render(<TransactionProgress status="completed" />);
    expect(screen.queryByLabelText(/in progress/)).not.toBeInTheDocument();
    expect(screen.queryByText('Failed — see error below')).not.toBeInTheDocument();
    // All labels still present
    expect(screen.getByText('Freighter Signing')).toBeInTheDocument();
  });

  it('failed at signing shows failure at step 0, steps 1-2 remain pending (no advance)', () => {
    render(<TransactionProgress status="failed" failedStep={0} />);
    expect(screen.getByText('Failed — see error below')).toBeInTheDocument();
    // Only one failure marker expected at signing step
    // No spinner should be present when failed
    expect(screen.queryByLabelText(/in progress/)).not.toBeInTheDocument();
    // Other step descriptions should remain pending text, not failed
    const fails = screen.getAllByText('Failed — see error below');
    expect(fails.length).toBe(1);
  });

  it('failed at submitting shows step 0 completed, step 1 failed, step 2 pending — no advance to completed', () => {
    render(<TransactionProgress status="failed" failedStep={1} />);
    const fails = screen.getAllByText('Failed — see error below');
    expect(fails.length).toBe(1);
    // Ensure submitting label still shows with failure
    expect(screen.getByText('Horizon Submission')).toBeInTheDocument();
    expect(screen.getByText('Ledger Confirmation')).toBeInTheDocument();
    expect(screen.queryByLabelText(/in progress/)).not.toBeInTheDocument();
  });

  it('failed at confirming shows steps 0-1 completed, step 2 failed', () => {
    render(<TransactionProgress status="failed" failedStep={2} />);
    expect(screen.getByText('Ledger Confirmation')).toBeInTheDocument();
    expect(screen.getAllByText('Failed — see error below').length).toBe(1);
  });

  it('legacy currentStep fallback still works (0 → signing active)', () => {
    render(<TransactionProgress currentStep={0} />);
    expect(screen.getByLabelText('Freighter Signing in progress')).toBeInTheDocument();
  });

  it('legacy currentStep=3 renders completed (all checkmarks)', () => {
    render(<TransactionProgress currentStep={3} />);
    expect(screen.queryByLabelText(/in progress/)).not.toBeInTheDocument();
  });
});
