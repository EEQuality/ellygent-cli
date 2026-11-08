import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigStore, defaultConfigPath } from "../config/configStore.js";
import { ContextApiClient } from "../api/contextApiClient.js";
import { SandboxService } from "./sandboxService.js";

const device = { device_code: "device-secret", user_code: "ABCD-EFGH", verification_uri: "https://app.example/sandbox/cli", expires_in: 60, interval: 2 };
const token = { access_token: "elly_sb_secret", token_type: "Bearer", project_identifier: "sandbox-a", organization_identifier: "Ellygent-Trial-Organization", expires_at: "2030-01-02T00:00:00Z" };
const response = (value: unknown, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers });

describe("sandbox pairing", () => {
  let directory: string;
  let store: ConfigStore;
  let now: number;
  let sleep: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "ellygent-sandbox-test-"));
    store = new ConfigStore(join(directory, "sandbox.json"), false);
    now = Date.parse("2030-01-01T00:00:00Z");
    sleep = vi.fn(async (milliseconds: number) => { now += milliseconds; });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
  const options = { project: "sandbox-a", apiUrl: "https://api.example" };
  const connect = (store: ConfigStore, show = vi.fn()) => new SandboxService(store, { now: () => now, sleep }).connect(options, show);

  it("pairs without normal credentials, stores mode 0600, then reuses existing context APIs", async () => {
    vi.stubEnv("ELLYGENT_TOKEN", "elly_pat_environment");
    vi.stubEnv("ELLYGENT_API_URL", "https://other.example");
    const patStore = new ConfigStore(join(directory, "normal.json"), false);
    await patStore.save({ accessToken: "elly_pat_preserved", apiUrl: "https://normal.example/api" });
    const before = await readFile(patStore.path, "utf8");
    fetchMock.mockResolvedValueOnce(response(device)).mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response({ system_definitions: [], specifications: [] }));
    const show = vi.fn();
    expect(await connect(store, show)).toEqual({ project: "sandbox-a", expiresAt: token.expires_at });
    expect(show).toHaveBeenCalledWith({ userCode: device.user_code, verificationUri: device.verification_uri, expiresIn: 60 });
    const config = await store.load();
    expect(config.accessToken).toBe(token.access_token);
    expect(config.defaultProject).toBe("sandbox-a");
    expect(config.defaultOrg).toBe(token.organization_identifier);
    expect((await stat(store.path)).mode & 0o777).toBe(0o600);
    expect(await readFile(patStore.path, "utf8")).toBe(before);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example/api/v1/sandbox/cli/device/");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "omit", redirect: "error", body: JSON.stringify({ project_identifier: "sandbox-a" }) });
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ device_code: "device-secret" }));
    await new ContextApiClient(config.apiUrl!, config.accessToken!).getContents("sandbox-a", "main");
    expect(fetchMock.mock.calls[2][1].headers.get("Authorization")).toBe("Bearer elly_sb_secret");
    expect(fetchMock.mock.calls[2][1].redirect).toBe("error");
  });

  it("accepts the canonical project binding returned by the device endpoint", async () => {
    fetchMock.mockResolvedValueOnce(response({ ...device, project_identifier: "sandbox-a" })).mockResolvedValueOnce(response(token));
    const service = new SandboxService(store, { now: () => now, sleep });
    expect(await service.connect({ ...options, project: "c307162c-f904-4bd8-90bc-0f920bbcdba7" }, vi.fn())).toEqual({ project: "sandbox-a", expiresAt: token.expires_at });
    expect((await store.load()).defaultProject).toBe("sandbox-a");
  });

  it("waits before polling, honors pending, slow_down and Retry-After", async () => {
    fetchMock.mockResolvedValueOnce(response(device))
      .mockResolvedValueOnce(response({ error: "authorization_pending" }, 400))
      .mockResolvedValueOnce(response({ error: "slow_down" }, 400))
      .mockResolvedValueOnce(response({}, 429, { "retry-after": "12" }))
      .mockResolvedValueOnce(response(token));
    await connect(store);
    expect(sleep.mock.calls.map(call => call[0])).toEqual([2000, 2000, 7000, 12000]);
  });

  it.each(["expired_token", "invalid_grant", "access_denied"])("rejects %s without persisting a credential", async error => {
    fetchMock.mockResolvedValueOnce(response(device)).mockResolvedValueOnce(response({ error }, 400));
    await expect(connect(store)).rejects.toThrow("expired, was denied, or has already been used");
    expect(await store.exists()).toBe(false);
  });

  it("stops at local expiration without another poll", async () => {
    fetchMock.mockResolvedValueOnce(response({ ...device, expires_in: 3 })).mockResolvedValueOnce(response({ error: "authorization_pending" }, 400));
    await expect(connect(store)).rejects.toThrow("pairing expired");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await store.exists()).toBe(false);
  });

  it("protects normal configuration and refuses replacing existing credentials", async () => {
    await expect(connect(new ConfigStore(defaultConfigPath(), false))).rejects.toThrow("separate-sandbox-file");
    await expect(connect(new ConfigStore(join(directory, "env.json")))).rejects.toThrow("separate-sandbox-file");
    await store.save({ accessToken: "elly_pat_existing" });
    await expect(connect(store)).rejects.toThrow("already has a credential");
    expect((await store.load()).accessToken).toBe("elly_pat_existing");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { ...token, project_identifier: "sandbox-b" },
    { ...token, access_token: "elly_pat_wrong" },
    { ...token, expires_at: "2000-01-01T00:00:00Z" },
    { ...token, token_type: "Basic" }
  ])("rejects malformed or misbound credentials", async value => {
    fetchMock.mockResolvedValueOnce(response(device)).mockResolvedValueOnce(response(value));
    await expect(connect(store)).rejects.toThrow("invalid sandbox credential");
    expect(await store.exists()).toBe(false);
  });

  it.each([
    { ...device, verification_uri: "http://evil.example/sandbox/cli" },
    { ...device, verification_uri: "https://app.example/sandbox/cli?token=secret" },
    { ...device, interval: 0 }, { ...device, expires_in: -1 }
  ])("rejects unsafe device responses before displaying instructions", async value => {
    fetchMock.mockResolvedValueOnce(response(value));
    const show = vi.fn();
    await expect(connect(store, show)).rejects.toThrow();
    expect(show).not.toHaveBeenCalled();
    expect(await store.exists()).toBe(false);
  });

  it("does not include server secrets in failure messages", async () => {
    fetchMock.mockResolvedValueOnce(response(device)).mockResolvedValueOnce(response({ secret: "device-secret elly_sb_secret" }, 500));
    await expect(connect(store)).rejects.toThrow("Sandbox pairing failed (HTTP 500)");
  });

  it("handles network failure without storing credentials or leaking the original error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("device-secret"));
    await expect(connect(store)).rejects.toThrow("Could not reach the sandbox pairing service");
    expect(await store.exists()).toBe(false);
  });
});
