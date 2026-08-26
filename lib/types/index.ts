export type Role = 'merchant' | 'admin';

export type BusinessType = 'individual' | 'sole_proprietor' | 'llc' | 'corporation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  businessName?: string;
  kybStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  address?: string;
  registrationNumber?: string;
}

export type AuthSessionStatus = 'active' | 'revoked' | 'expired';

export interface AuthSession {
  id: string;
  device: string;
  ipAddress: string;
  lastActivityAt: string;
  expiresAt: string;
  status: AuthSessionStatus;
  isCurrent: boolean;
  revokedAt?: string | null;
}

export interface AuthSessionsResponse {
  active: AuthSession[];
  history: AuthSession[];
}

export interface AuthLoginResponse {
  ok: boolean;
  revokedSessionCount?: number;
}

export interface AssetBalance {
  assetCode: string;
  balance: string;
  assetIssuer?: string;
  usdEquivalent?: number;
}

export interface MerchantProfile {
  businessName: string;
  businessType: BusinessType;
  country: string;
  industry: string;
  websiteUrl: string | null;
  contactEmail: string;
  phoneNumber: string | null;
  logoUrl: string | null;
}

export interface MerchantBankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode?: string;
}
