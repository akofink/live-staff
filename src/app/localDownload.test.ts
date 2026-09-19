import { describe, expect, it, vi } from "vitest";
import { saveLocalTextFile } from "./localDownload";

const file = {
  name: "live-staff-pitch-history.csv",
  type: "text/csv",
  contents: "concert_midi\n60\n",
};

describe("saveLocalTextFile", () => {
  it("downloads a local blob and never uses a network URL", async () => {
    const anchor = { href: "", download: "" };
    const createObjectURL = vi.fn(() => "blob:local-history");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();

    const result = await saveLocalTextFile(file, {
      createObjectURL,
      revokeObjectURL,
      createAnchor: () => anchor as HTMLAnchorElement,
      click,
    });

    expect(result).toBe("downloaded");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchor.download).toBe(file.name);
    expect(anchor.href).toBe("blob:local-history");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-history");
  });

  it("shares a local file when the browser accepts file shares", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const result = await saveLocalTextFile(file, {
      createObjectURL: vi.fn(),
      revokeObjectURL: vi.fn(),
      createAnchor: () => ({ href: "", download: "" }) as HTMLAnchorElement,
      click: vi.fn(),
      canShare: () => true,
      share,
    });

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0][0].files[0]).toMatchObject({ name: file.name, type: file.type });
  });

  it("falls back to download when share fails for a reason other than cancel", async () => {
    const click = vi.fn();
    const result = await saveLocalTextFile(file, {
      createObjectURL: vi.fn(() => "blob:local-history"),
      revokeObjectURL: vi.fn(),
      createAnchor: () => ({ href: "", download: "" }) as HTMLAnchorElement,
      click,
      canShare: () => true,
      share: vi.fn().mockRejectedValue(new Error("share unavailable")),
    });

    expect(result).toBe("downloaded");
    expect(click).toHaveBeenCalledOnce();
  });

  it("does not download after the user cancels a share sheet", async () => {
    const click = vi.fn();

    await expect(saveLocalTextFile(file, {
      createObjectURL: vi.fn(),
      revokeObjectURL: vi.fn(),
      createAnchor: () => ({ href: "", download: "" }) as HTMLAnchorElement,
      click,
      canShare: () => true,
      share: vi.fn().mockRejectedValue(new DOMException("canceled", "AbortError")),
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(click).not.toHaveBeenCalled();
  });
});
