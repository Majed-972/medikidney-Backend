export interface IPasswordReset {
  reset_id: number;
  email: string;
  otp_code: string;
  expires_at: Date;
  is_verified: boolean;
  user_id?: number;
}
