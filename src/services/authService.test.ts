import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "./authService.js";

const mocks = vi.hoisted(() => ({
  listOrganizations: vi.fn(),
  input: vi.fn(),
  password: vi.fn(),
}));

vi.mock("../api/contextApiClient.js", () => ({
  ContextApiClient: vi.fn().mockImplementation(() => ({
    listOrganizations: mocks.listOrganizations,
  })),
}));

vi.mock("@inquirer/prompts", () => ({
  input: mocks.input,
  password: mocks.password,
}));

function createConfigStore(initial: Record<string, unknown> = {}) {
  return {
    load: vi.fn().mockResolvedValue(initial),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ELLYGENT_TOKEN;
    mocks.input.mockReset();
    mocks.password.mockReset();
    mocks.listOrganizations.mockResolvedValue([]);
  });

  it("logs in with an explicit token and validates it before saving", async () => {
    process.env.ELLYGENT_TOKEN = "elly_pat_env_ignored";
    const configStore = createConfigStore({ apiUrl: "https://api.example.com/api" });
    const service = new AuthService(configStore as any);

    await service.login({
      apiUrl: "https://api.example.com",
      token: "elly_pat_explicit_123",
    });

    expect(mocks.listOrganizations).toHaveBeenCalledTimes(1);
    expect(configStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: "https://api.example.com/api",
        accessToken: "elly_pat_explicit_123",
        refreshToken: undefined,
      }),
    );
    expect(mocks.password).not.toHaveBeenCalled();
  });

  it("uses ELLYGENT_TOKEN when no explicit token is provided", async () => {
    process.env.ELLYGENT_TOKEN = "elly_pat_env_123";
    const configStore = createConfigStore({ apiUrl: "https://api.example.com/api" });
    const service = new AuthService(configStore as any);

    await service.login({
      apiUrl: "https://api.example.com",
    });

    expect(configStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "elly_pat_env_123",
      }),
    );
    expect(mocks.password).not.toHaveBeenCalled();
  });

  it("falls back to the stored token when no token is provided", async () => {
    const configStore = createConfigStore({
      apiUrl: "https://api.example.com/api",
      accessToken: "elly_pat_stored_123",
    });
    const service = new AuthService(configStore as any);

    await service.login({
      apiUrl: "https://api.example.com",
    });

    expect(configStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "elly_pat_stored_123",
      }),
    );
  });

  it("prompts only for a PAT when no token source exists", async () => {
    mocks.input.mockResolvedValue("https://www.ellygent.com");
    mocks.password.mockResolvedValue("elly_pat_prompt_123");
    const configStore = createConfigStore({});
    const service = new AuthService(configStore as any);

    await service.login({});

    expect(mocks.input).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Ellygent server URL"),
        default: "https://www.ellygent.com"
      }),
    );
    expect(mocks.password).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Personal Access Token" }),
    );
    expect(configStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "elly_pat_prompt_123",
        apiUrl: "https://www.ellygent.com/api"
      }),
    );
  });

  it("rejects non-PAT tokens before contacting the API", async () => {
    const configStore = createConfigStore({ apiUrl: "https://api.example.com/api" });
    const service = new AuthService(configStore as any);

    await expect(
      service.login({
        apiUrl: "https://api.example.com",
        token: "not-a-pat",
      }),
    ).rejects.toThrow('Invalid PAT format. Personal Access Tokens must start with "elly_pat_"');

    expect(mocks.listOrganizations).not.toHaveBeenCalled();
    expect(configStore.save).not.toHaveBeenCalled();
  });

  it("shows the stored server URL without /api in the prompt default", async () => {
    mocks.input.mockResolvedValue("https://www.ellygent.com");
    mocks.password.mockResolvedValue("elly_pat_prompt_123");
    const configStore = createConfigStore({ apiUrl: "https://www.ellygent.com/api" });
    const service = new AuthService(configStore as any);

    await service.login({});

    expect(mocks.input).toHaveBeenCalledWith(
      expect.objectContaining({
        default: "https://www.ellygent.com"
      })
    );
  });

  it("strips duplicated trailing /api segments from the stored prompt default", async () => {
    mocks.input.mockResolvedValue("https://www.ellygent.com/api/");
    mocks.password.mockResolvedValue("elly_pat_prompt_123");
    const configStore = createConfigStore({ apiUrl: "https://www.ellygent.com/api/api" });
    const service = new AuthService(configStore as any);

    await service.login({});

    expect(mocks.input).toHaveBeenCalledWith(
      expect.objectContaining({
        default: "https://www.ellygent.com"
      })
    );
    expect(configStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: "https://www.ellygent.com/api"
      })
    );
  });
});
