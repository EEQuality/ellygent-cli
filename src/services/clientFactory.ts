import { ContextApiClient } from "../api/contextApiClient.js";
import { ConfigStore } from "../config/configStore.js";

export class ClientFactory {
  constructor(private readonly configStore: ConfigStore) {}

  async contextClient(): Promise<ContextApiClient> {
    const config = await this.configStore.load();
    if (!config.apiUrl) {
      throw new Error("No Ellygent API URL configured. Run `ellygent auth login` or `ellygent config set api-url <url>`.");
    }
    if (!config.accessToken) {
      throw new Error("No Ellygent access token configured. Run `ellygent auth login --token <PAT>`.");
    }
    return new ContextApiClient(config.apiUrl, config.accessToken);
  }
}
