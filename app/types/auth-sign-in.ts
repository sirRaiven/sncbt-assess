export interface IdentifierSignInResponse {
  ok: true;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  expiresIn: number;
  tokenType: string;
}
