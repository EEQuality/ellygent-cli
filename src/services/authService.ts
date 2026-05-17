import { password, input } from "@inquirer/prompts";
import { AuthApiClient } from "../api/authApiClient.js";
import { ConfigStore, normalizeApiUrl } from "../config/configStore.js";

export interface LoginOptions {
  apiUrl?: string;
  email?: string;
  password?: string;
  pat?: string;
}

export class AuthService {
  constructor(private readonly configStore: ConfigStore) {}

  async login(options: LoginOptions = {}): Promise<{ apiUrl: string; email?: string }> {
    const current = await this.configStore.load();
    const apiUrl = normalizeApiUrl(
      options.apiUrl ||
        (await input({
          message: "Ellygent API URL",
          default: current.apiUrl || "http://localhost:8000"
        }))
    );

    // Check if PAT is provided (environment variable or option)
    const patToken = options.pat || process.env.ELLYGENT_PAT;
    
    if (patToken) {
      // PAT authentication - no email/password needed
      const trimmedPat = patToken.trim();
      
      if (!trimmedPat.startsWith('elly_pat_')) {
        throw new Error('Invalid PAT format. Personal Access Tokens must start with "elly_pat_"');
      }
      
      // Store PAT as the access token (it's already a bearer token)
      await this.configStore.save({
        ...current,
        apiUrl,
        accessToken: trimmedPat,
        refreshToken: undefined // PATs don't use refresh tokens
      });
      
      return { apiUrl };
    }

    // Email/password authentication (existing flow)
    const email = (options.email ||
      (await input({
        message: "Email"
      }))).trim();

    const userPassword =
      options.password ||
      (await password({
        message: "Password",
        mask: "*"
      }));

    const tokenResponse = await new AuthApiClient(apiUrl).login(email, userPassword);

    await this.configStore.save({
      ...current,
      apiUrl,
      accessToken: tokenResponse.access,
      refreshToken: tokenResponse.refresh
    });

    return { apiUrl, email };
  }
}
