import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import {
  FoldersStoreContext,
  FoldersStore,
  useFoldersStore,
} from "@/store/folders";
import { Folder } from "@/types";

const makeFolder = (id: number): Folder => ({
  id,
  name: `folder-${id}`,
  created_at: 0,
  position: id,
});

describe("FoldersStoreContext — default value", () => {
  it("exposes empty folders, false toast, and empty input value", () => {
    const { result } = renderHook(() => useFoldersStore());
    expect(result.current.folders).toEqual([]);
    expect(result.current.maxFoldersToast).toBe(false);
    expect(result.current.folderNameInputValue).toBe("");
  });
});

describe("useFoldersStore — reads from context", () => {
  it("returns values provided by a plain context provider", () => {
    const folder = makeFolder(1);

    const customValue: FoldersStore = {
      folders: [folder],
      maxFoldersToast: true,
      folderNameInputValue: "new folder",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(FoldersStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useFoldersStore(), { wrapper });

    expect(result.current.folders).toEqual([folder]);
    expect(result.current.maxFoldersToast).toBe(true);
    expect(result.current.folderNameInputValue).toBe("new folder");
  });

  it("returns multiple folders", () => {
    const folders = [makeFolder(1), makeFolder(2), makeFolder(3)];

    const customValue: FoldersStore = {
      folders,
      maxFoldersToast: false,
      folderNameInputValue: "",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(FoldersStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useFoldersStore(), { wrapper });

    expect(result.current.folders).toHaveLength(3);
    expect(result.current.folders[1].name).toBe("folder-2");
  });
});
