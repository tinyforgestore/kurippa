import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useImagePreview } from "@/hooks/useImagePreview";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
const mockConvertFileSrc = vi.fn((path: string) => `asset://${path}`);
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  convertFileSrc: (path: string) => mockConvertFileSrc(path),
}));

function makeItem(id: number, image_path: string | null): ClipboardItem {
  return {
    id,
    kind: image_path ? "image" : "text",
    text: null,
    html: null,
    rtf: null,
    image_path,
    source_app: null,
    created_at: 0,
    pinned: false,
    folder_id: null,
    qr_text: null,
    image_width: null,
    image_height: null,
  };
}

describe("useImagePreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue("/resolved/path.png");
  });

  it("initial state: assetUrl null, failed false", () => {
    const item = makeItem(1, "folder/file.png");
    const { result } = renderHook(() => useImagePreview(item));
    expect(result.current.assetUrl).toBeNull();
    expect(result.current.failed).toBe(false);
  });

  it("image_path null → failed true immediately without invoking", () => {
    const item = makeItem(1, null);
    const { result } = renderHook(() => useImagePreview(item));
    expect(result.current.failed).toBe(true);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("invoke resolves → assetUrl set via convertFileSrc", async () => {
    mockInvoke.mockResolvedValue("/some/path.png");
    const item = makeItem(1, "file.png");
    const { result } = renderHook(() => useImagePreview(item));
    await waitFor(() => expect(result.current.assetUrl).toBe("asset:///some/path.png"));
    expect(result.current.failed).toBe(false);
  });

  it("invoke rejects → failed true", async () => {
    mockInvoke.mockRejectedValue(new Error("not found"));
    const item = makeItem(1, "file.png");
    const { result } = renderHook(() => useImagePreview(item));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.assetUrl).toBeNull();
  });

  it("filename extraction: nested path passes only basename to invoke", async () => {
    const item = makeItem(1, "folder/sub/file.png");
    renderHook(() => useImagePreview(item));
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled());
    expect(mockInvoke).toHaveBeenCalledWith("get_image_path", { filename: "file.png" });
  });

  it("item id change resets state and re-invokes", async () => {
    mockInvoke.mockResolvedValue("/path1.png");
    const item1 = makeItem(1, "a.png");
    const { result, rerender } = renderHook(({ item }) => useImagePreview(item), {
      initialProps: { item: item1 },
    });
    await waitFor(() => expect(result.current.assetUrl).toBe("asset:///path1.png"));

    mockInvoke.mockResolvedValue("/path2.png");
    const item2 = makeItem(2, "b.png");
    rerender({ item: item2 });

    expect(result.current.assetUrl).toBeNull();
    expect(result.current.failed).toBe(false);
    await waitFor(() => expect(result.current.assetUrl).toBe("asset:///path2.png"));
  });
});
