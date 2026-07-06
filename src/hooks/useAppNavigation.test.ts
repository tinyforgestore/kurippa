import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAppNavigation } from "./useAppNavigation";
import type { ClipboardItem } from "@/types";

const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

const item: ClipboardItem = {
  id: 1,
  kind: "text",
  text: "hello",
  html: null,
  rtf: null,
  image_path: null,
  source_app: null,
  created_at: 0,
  pinned: false,
  folder_id: null,
  qr_text: null,
  image_width: null,
  image_height: null,
};

describe("useAppNavigation", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("toHistory navigates to /", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toHistory();
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("toPasteAs navigates with item state", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toPasteAs(item);
    expect(navigateMock).toHaveBeenCalledWith("/paste-as", { state: { item } });
  });

  it("toSeparatorPicker navigates to /separator-picker", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toSeparatorPicker();
    expect(navigateMock).toHaveBeenCalledWith("/separator-picker");
  });

  it("toFolderNameInput navigates with mode/targetId/pickerItemId state", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toFolderNameInput("rename", 7, 42);
    expect(navigateMock).toHaveBeenCalledWith("/folder-name-input", {
      state: { mode: "rename", targetId: 7, pickerItemId: 42, pickerItemIds: null },
    });
  });

  it("toFolderNameInput passes nulls through", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toFolderNameInput("create", null, null);
    expect(navigateMock).toHaveBeenCalledWith("/folder-name-input", {
      state: { mode: "create", targetId: null, pickerItemId: null, pickerItemIds: null },
    });
  });

  it("toFolderNameInput carries pickerItemIds for the multi path", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toFolderNameInput("create", null, null, [1, 2, 3]);
    expect(navigateMock).toHaveBeenCalledWith("/folder-name-input", {
      state: { mode: "create", targetId: null, pickerItemId: null, pickerItemIds: [1, 2, 3] },
    });
  });

  it("toMultiAction navigates to /multi-action", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toMultiAction();
    expect(navigateMock).toHaveBeenCalledWith("/multi-action");
  });

  it("toFolderPickerMulti navigates with itemIds state", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toFolderPickerMulti([1, 2, 3]);
    expect(navigateMock).toHaveBeenCalledWith("/folder-picker", {
      state: { itemIds: [1, 2, 3] },
    });
  });

  it("toFolderDelete navigates with target state", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toFolderDelete({ id: 3, name: "drafts" });
    expect(navigateMock).toHaveBeenCalledWith("/folder-delete", {
      state: { target: { id: 3, name: "drafts" } },
    });
  });

  it("toFolderPicker navigates with itemId state", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toFolderPicker(99);
    expect(navigateMock).toHaveBeenCalledWith("/folder-picker", {
      state: { itemId: 99 },
    });
  });

  it("toPinnedDelete navigates with count state", () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.toPinnedDelete(4);
    expect(navigateMock).toHaveBeenCalledWith("/pinned-delete", {
      state: { count: 4 },
    });
  });
});
