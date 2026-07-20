import { describe, it, expect } from "vitest";
import { extractAdapterErrorMessage } from "@/api/services/adapter-service";

describe("extractAdapterErrorMessage — ekstraksi pesan adapter (A7)", () => {
  it("mengambil payload.detail", () => {
    expect(extractAdapterErrorMessage({ detail: "Invalid or missing input parameters." }, 400)).toBe(
      "Invalid or missing input parameters.",
    );
  });

  it("mengambil payload.error", () => {
    expect(extractAdapterErrorMessage({ error: "Layer not found" }, 404)).toBe("Layer not found");
  });

  it("mengambil payload.message bila detail/error kosong", () => {
    expect(extractAdapterErrorMessage({ message: "Connection refused" }, 502)).toBe("Connection refused");
  });

  it("mengambil pesan nested errors.message", () => {
    expect(extractAdapterErrorMessage({ errors: { message: "nested boom" } }, 500)).toBe("nested boom");
  });

  it("mengambil string payload apa adanya", () => {
    expect(extractAdapterErrorMessage("plain text error", 500)).toBe("plain text error");
  });

  it("fallback generik berisi status bila payload tak dikenal", () => {
    expect(extractAdapterErrorMessage(null, 503)).toBe("Adapter request failed (503)");
    expect(extractAdapterErrorMessage({ foo: "bar" }, 418)).toBe("Adapter request failed (418)");
  });

  it("mengutamakan detail di atas message", () => {
    expect(extractAdapterErrorMessage({ detail: "d", message: "m" }, 400)).toBe("d");
  });
});
