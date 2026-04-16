export interface LoginRequest{
    email:string;
    password:string;
}

export interface RegisterRequest{
    fullName:string;
    email:string;
    password:string;
    confirmPassword:string;
    mobileNumber:string;
    address:string;
    profileUrl:string;
    profileImage?: File | null;
    gender:string;
    interests:string[];
    preferredContactMethod:string;
}

export interface AuthResponse{
    userId:string;
    fullName:string;
    email:string;
    role: 'Admin'|'User';
    profileUrl?: string | null;
    token: string;
    expiresAt: string;
}