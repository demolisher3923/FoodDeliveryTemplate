export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  address: string;
  gender: string;
  preferredContactMethod: string;
  role: 'Admin' | 'User';
  profileUrl?: string | null;
  interests: string[];
}

export interface UpdateUserProfileRequest {
  fullName: string;
  mobileNumber: string;
  address: string;
  gender: string;
  preferredContactMethod: string;
  interests: string[];
  profileUrl?: string;
  profileImage?: File | null;
}

export interface AdminUserListItem {
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  role: 'Admin' | 'User';
  isActive: boolean;
  createdAt: string;
  profileUrl?: string | null;
}
