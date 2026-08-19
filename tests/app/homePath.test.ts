import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PATH } from "@/lib/app/homePath";

describe("DEFAULT_APP_PATH", () => {
  it("lands on Dashboard", () => {
    expect(DEFAULT_APP_PATH).toBe("/dashboard/");
  });
});
