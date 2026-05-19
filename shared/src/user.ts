export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  created_at: string;
}
