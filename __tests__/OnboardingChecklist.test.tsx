import {
  getDismissed,
  setDismissed,
} from '@/lib/hooks/useOnboardingChecklist';

const mockUsePayments = jest.fn();
const mockUseSettlements = jest.fn();
const mockUseMerchantProfile = jest.fn();
const mockUseMerchantBankAccount = jest.fn();
const mockUseAuthStore = jest.fn();

jest.mock('@/lib/api/hooks', () => ({
  usePayments: (...args: unknown[]) => mockUsePayments(...args),
  useSettlements: (...args: unknown[]) => mockUseSettlements(...args),
  useMerchantProfile: (...args: unknown[]) => mockUseMerchantProfile(...args),
  useMerchantBankAccount: (...args: unknown[]) => mockUseMerchantBankAccount(...args),
}));

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: (...args: unknown[]) => mockUseAuthStore(...args),
}));

const defaultMockState = {
  data: [],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePayments.mockReturnValue(defaultMockState);
  mockUseSettlements.mockReturnValue(defaultMockState);
  mockUseMerchantProfile.mockReturnValue(defaultMockState);
  mockUseMerchantBankAccount.mockReturnValue(defaultMockState);
  mockUseAuthStore.mockReturnValue({ user: { id: 'u1', kybStatus: 'none' } });
  localStorage.clear();
});

describe('getDismissed / setDismissed', () => {
  it('returns false when no stored value exists', () => {
    expect(getDismissed()).toBe(false);
  });

  it('returns true after setDismissed(true)', () => {
    setDismissed(true);
    expect(getDismissed()).toBe(true);
  });

  it('returns false after setDismissed(false)', () => {
    setDismissed(true);
    setDismissed(false);
    expect(getDismissed()).toBe(false);
  });

  it('returns false after setDismissed(false) when already false', () => {
    setDismissed(false);
    expect(getDismissed()).toBe(false);
  });
});
