export type UserRole = 'BUYER' | 'SELLER';

export type JwtUser = {
  sub: string;
  role: UserRole;
  email: string;
  name: string | null;
};
