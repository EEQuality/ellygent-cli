import { password, input } from "@inquirer/prompts";
import { getServerUrlFromApiBase } from "../api/baseUrl.js";
import { ContextApiClient } from "../api/contextApiClient.js";
import { ConfigStore, normalizeApiUrl } from "../config/configStore.js";

export interface LoginOptions {
  apiUrl?: string;
  token?: string;
}

export class AuthService {
  constructor(private readonly configStore: ConfigStore) {}

  async login(options: LoginOptions = {}): Promise<{ apiUrl: string }> {
    const current = await this.configStore.load();
    const defaultServerUrl = current.apiUrl
      ? getServerUrlFromApiBase(current.apiUrl)
      : "https://www.ellygent.com";
    const apiUrl = normalizeApiUrl(
      options.apiUrl ||
        (await input({
          message: "Ellygent server URL\nEnter the Ellygent server URL, for example https://www.ellygent.com. Do not include /api; the CLI adds it automatically.",
          default: defaultServerUrl
        }))
    );

    const token = await this.resolveToken(options, current);
    const trimmedToken = token.trim();

    if (!trimmedToken.startsWith("elly_pat_")) {
      throw new Error('Invalid PAT format. Personal Access Tokens must start with "elly_pat_"');
    }

    // Validate the token before saving anything locally.
    await new ContextApiClient(apiUrl, trimmedToken).listOrganizations();

    await this.configStore.save({
      ...current,
      apiUrl,
      accessToken: trimmedToken,
      refreshToken: undefined
    });

    return { apiUrl };
  }

  private async resolveToken(options: LoginOptions, current: Awaited<ReturnType<ConfigStore["load"]>>): Promise<string> {
    const explicitToken = options.token?.trim();
    if (explicitToken) {
      return explicitToken;
    }

    const envToken = process.env.ELLYGENT_TOKEN?.trim();
    if (envToken) {
      return envToken;
    }

    const storedToken = current.accessToken?.trim();
    if (storedToken) {
      return storedToken;
    }

    return password({
      message: "Personal Access Token",
      mask: "*"
    });
  }
}
