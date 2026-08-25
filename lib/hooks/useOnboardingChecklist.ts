"use client";

import { useMemo } from 'react';
import { usePayments, useSettlements, useMerchantProfile, useMerchantBankAccount } from '@/lib/api/hooks';
import { useAuthStore } from '@/lib/store/authStore';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  ctaLabel: string;
}

export interface OnboardingChecklistState {
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  isLoading: boolean;
}

const STORAGE_KEY = 'bp-onboarding-checklist-dismissed';

export function getDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDismissed(dismissed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (dismissed) {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable — ignore
  }
}

export function useOnboardingChecklist(): OnboardingChecklistState {
  const { user } = useAuthStore();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { isLoading: settlementsLoading } = useSettlements();
  // profile data is fetched to drive future checklist items (e.g. business info complete)
  const { isLoading: profileLoading } = useMerchantProfile(user?.id);
  const { data: bankAccount, isLoading: bankLoading } = useMerchantBankAccount(user?.id);

  const isLoading = paymentsLoading || settlementsLoading || profileLoading || bankLoading;

  const items = useMemo<ChecklistItem[]>(() => {
    const kybStatus = user?.kybStatus;
    const kycComplete = kybStatus === 'approved';

    const hasSettlementRule = Boolean(bankAccount);

    const hasPaymentLink = payments.length > 0;

    const webhookTested = false;

    return [
      {
        id: 'kyc',
        label: 'Complete identity verification',
        description: kycComplete
          ? 'Your identity has been verified.'
          : 'Submit your identity documents to comply with regulations.',
        completed: kycComplete,
        href: '/settings',
        ctaLabel: kycComplete ? 'View Profile' : 'Complete KYC',
      },
      {
        id: 'settlement',
        label: 'Set up settlement rule',
        description: hasSettlementRule
          ? 'Your bank account is configured for settlements.'
          : 'Add your bank account to receive USDC → NGN settlements.',
        completed: hasSettlementRule,
        href: '/settlement',
        ctaLabel: hasSettlementRule ? 'View Settlement' : 'Configure Settlement',
      },
      {
        id: 'payment-link',
        label: 'Create your first payment link',
        description: hasPaymentLink
          ? `You have ${payments.length} active payment link${payments.length === 1 ? '' : 's'}.`
          : 'Create a payment link to start accepting crypto payments.',
        completed: hasPaymentLink,
        href: '/payments',
        ctaLabel: hasPaymentLink ? 'Manage Links' : 'Create Payment Link',
      },
      {
        id: 'webhook',
        label: 'Test webhook integration',
        description: webhookTested
          ? 'Your webhook endpoint has been tested successfully.'
          : 'Send a test event to verify your webhook endpoint works.',
        completed: webhookTested,
        href: '/developers',
        ctaLabel: webhookTested ? 'View Webhooks' : 'Test Webhook',
      },
    ];
  }, [user?.kybStatus, bankAccount, payments]);

  const completedCount = useMemo(
    () => items.filter((item) => item.completed).length,
    [items],
  );

  return {
    items,
    completedCount,
    totalCount: items.length,
    isComplete: completedCount === items.length,
    isLoading,
  };
}
