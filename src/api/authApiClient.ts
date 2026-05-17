import { endpoints } from "./endpoints.js";
import { HttpClient } from "./httpClient.js";

export interface TokenResponse {
  access: string;
  refresh?: string;
}

export class AuthApiClient {
  private readonly http: HttpClient;

  constructor(apiUrl: string) {
    this.http = new HttpClient({ apiUrl });
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    return this.http.postJson<TokenResponse>(endpoints.auth.token, {
      email,
      password
    });
  }
}
