import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError, API_URL } from "../src/api";

describe("api client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("always sends credentials so the session cookie is included", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "u1" }),
    });

    await api.me();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/auth/me`,
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("throws an ApiError carrying the status and server-provided message", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "A timer is already running. Stop it first." }),
    });

    await expect(api.timeEntries.start("project-1")).rejects.toMatchObject({
      status: 409,
      message: "A timer is already running. Stop it first.",
    });
  });

  it("treats a 204 No Content response as no body instead of parsing JSON", async () => {
    const json = vi.fn();
    (globalThis.fetch as any).mockResolvedValue({ ok: true, status: 204, json });

    const result = await api.logout();

    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it("falls back to statusText when the error body isn't valid JSON", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });

    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    await expect(api.me()).rejects.toMatchObject({ message: "Internal Server Error" });
  });
});
