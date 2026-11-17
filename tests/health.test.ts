import { describe, expect, it } from "vitest";
import { api } from "./helpers.js";

describe("health checks", () => {
  it("GET /health answers without the database", async () => {
    const res = await api().get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, status: "ok" });
  });

  it("GET /health/db checks the database", async () => {
    const res = await api().get("/health/db");
    expect(res.status).toBe(200);
    expect(res.body.database).toBe("ok");
  });
});
