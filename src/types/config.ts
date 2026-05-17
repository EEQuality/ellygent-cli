export interface EllygentConfig {
  apiUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  defaultOrg?: string;
  defaultProject?: string;
}

export type ConfigKey = keyof EllygentConfig;
