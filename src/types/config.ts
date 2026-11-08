export interface EllygentConfig {
  apiUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  defaultOrg?: string;
  defaultProject?: string;
}

export type ConfigKey = keyof EllygentConfig;
