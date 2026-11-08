import { resolve } from "node:path";
import { joinApiUrl } from "../api/baseUrl.js";
import { ConfigStore, defaultConfigPath, normalizeApiUrl } from "../config/configStore.js";
import { ValidationError } from "../errors/EllygentError.js";

export interface PairingInstructions {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
}

interface PairingRuntime {
  now: () => number;
  sleep: (milliseconds: number) => Promise<void>;
}

/** Device requests intentionally omit normal credentials, cookies, redirects and response-body logging. */
export class SandboxService {
  constructor(
    private readonly store: ConfigStore,
    private readonly runtime: PairingRuntime = {
      now: () => Date.now(),
      sleep: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
    }
  ) {}

  async connect(options: { project: string; apiUrl: string }, show: (instructions: PairingInstructions) => void): Promise<{ project: string; expiresAt: string }> {
    if (this.store.useEnvironment || resolve(this.store.path) === resolve(defaultConfigPath())) {
      throw new ValidationError("Use --config <separate-sandbox-file> to keep your normal PAT configuration unchanged.");
    }
    const current = await this.store.load();
    if (current.accessToken) {
      throw new ValidationError("The selected config already has a credential. Choose a new sandbox config file, or explicitly clear it with auth logout.");
    }
    const project = options.project.trim();
    if (!project) throw new ValidationError("A sandbox --project identifier is required.");
    const apiUrl = normalizeApiUrl(options.apiUrl);
    requireSecureUrl(apiUrl);
    const device = await this.post(apiUrl, "device", { project_identifier: project });
    if (!device.ok) throw new Error(`Sandbox pairing could not start (HTTP ${device.status}).`);
    const data = device.body;
    if (!isText(data.device_code) || !isText(data.user_code) || !/^[A-Z0-9-]{4,32}$/i.test(data.user_code) || !isText(data.verification_uri) ||
        !positiveInteger(data.expires_in) || data.expires_in > 3600 || !positiveInteger(data.interval) || data.interval > 3600) {
      throw new Error("Server returned invalid sandbox pairing instructions.");
    }
    const canonicalProject = isText(data.project_identifier) ? data.project_identifier : project;
    const verification = requireSecureUrl(data.verification_uri);
    if (verification.search || verification.hash) throw new Error("Server returned an unsafe verification URL.");
    show({ userCode: data.user_code, verificationUri: verification.toString(), expiresIn: data.expires_in });
    const deadline = this.runtime.now() + data.expires_in * 1000;
    let interval = data.interval * 1000;
    while (this.runtime.now() < deadline) {
      await this.runtime.sleep(Math.min(interval, deadline - this.runtime.now()));
      if (this.runtime.now() >= deadline) break;
      const token = await this.post(apiUrl, "token", { device_code: data.device_code });
      if (token.ok) {
        const credential = token.body;
        if (!isText(credential.access_token) || !credential.access_token.startsWith("elly_sb_") ||
            credential.token_type !== "Bearer" || credential.project_identifier !== canonicalProject ||
            !isText(credential.organization_identifier) || !isText(credential.expires_at) ||
            !Number.isFinite(Date.parse(credential.expires_at)) || Date.parse(credential.expires_at) <= this.runtime.now()) {
          throw new Error("Server returned an invalid sandbox credential.");
        }
        await this.store.save({ apiUrl, accessToken: credential.access_token,
          defaultOrg: credential.organization_identifier, defaultProject: canonicalProject, accessTokenExpiresAt: credential.expires_at });
        return { project: canonicalProject, expiresAt: credential.expires_at };
      }
      if (token.status === 400 && token.body.error === "authorization_pending") continue;
      if (token.status === 400 && token.body.error === "slow_down") { interval += 5000; continue; }
      if (token.status === 429) { interval = Math.max(interval + 5000, token.retryAfter * 1000); continue; }
      if (token.status === 400 && ["expired_token", "invalid_grant", "access_denied"].includes(String(token.body.error))) {
        throw new Error("Sandbox pairing expired, was denied, or has already been used. Start a new connection.");
      }
      throw new Error(`Sandbox pairing failed (HTTP ${token.status}). Start a new connection.`);
    }
    throw new Error("Sandbox pairing expired. Start a new connection.");
  }

  private async post(apiUrl: string, action: string, body: unknown) {
    let response: Response;
    try {
      response = await fetch(joinApiUrl(apiUrl, `v1/sandbox/cli/${action}/`), {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body), credentials: "omit", redirect: "error", signal: AbortSignal.timeout(30000)
      });
    } catch {
      throw new Error("Could not reach the sandbox pairing service. Check the server URL and connection.");
    }
    let data: Record<string, unknown>;
    try {
      const value: unknown = await response.json();
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
      data = value as Record<string, unknown>;
    } catch {
      throw new Error("Server returned an invalid sandbox pairing response.");
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    return { ok: response.ok, status: response.status, body: data, retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 0 };
  }
}

function isText(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function positiveInteger(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value > 0; }
function requireSecureUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new ValidationError("A valid server URL is required."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password) {
    throw new ValidationError("Sandbox pairing requires HTTPS (HTTP is allowed only for localhost development).");
  }
  return url;
}
