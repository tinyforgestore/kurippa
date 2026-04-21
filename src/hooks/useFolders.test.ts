import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFolders } from "@/hooks/useFolders";
import { Folder } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

function makeFolder(id: number, name = `Folder ${id}`): Folder {
  return { id, name, created_at: 0, position: id };
}

describe("useFolders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("loadFolders (on mount)", () => {
    it("invokes get_folders and populates the folders list", async () => {
      const folders = [makeFolder(1), makeFolder(2)];
      mockInvoke.mockResolvedValueOnce(folders);
      const { result } = renderHook(() => useFolders());
      await act(async () => {});
      expect(mockInvoke).toHaveBeenCalledWith("get_folders");
      expect(result.current.folders).toHaveLength(2);
    });
  });

  describe("createFolder", () => {
    it("appends the new folder to state and returns it", async () => {
      mockInvoke.mockResolvedValueOnce([]); // initial loadFolders
      const newFolder = makeFolder(10, "Work");
      mockInvoke.mockResolvedValueOnce(newFolder); // create_folder

      const { result } = renderHook(() => useFolders());
      await act(async () => {});

      let returned: Folder | undefined;
      await act(async () => {
        returned = await result.current.createFolder("Work");
      });

      expect(mockInvoke).toHaveBeenCalledWith("create_folder", { name: "Work" });
      expect(result.current.folders).toHaveLength(1);
      expect(result.current.folders[0].id).toBe(10);
      expect(returned?.id).toBe(10);
    });

    it("shows maxFoldersToast and hides it after 1500ms on max_folders_reached error", async () => {
      mockInvoke.mockResolvedValueOnce([]); // initial loadFolders
      mockInvoke.mockRejectedValueOnce("max_folders_reached");

      const { result } = renderHook(() => useFolders());
      await act(async () => {});

      await act(async () => {
        result.current.createFolder("Overflow").catch(() => {});
        await Promise.resolve();
      });

      expect(result.current.maxFoldersToast).toBe(true);

      act(() => vi.advanceTimersByTime(1500));
      expect(result.current.maxFoldersToast).toBe(false);
    });

    it("rethrows the error on max_folders_reached", async () => {
      mockInvoke.mockResolvedValueOnce([]); // initial loadFolders
      mockInvoke.mockRejectedValueOnce("max_folders_reached");

      const { result } = renderHook(() => useFolders());
      await act(async () => {});

      await expect(
        act(async () => { await result.current.createFolder("Overflow"); })
      ).rejects.toBe("max_folders_reached");
    });
  });

  describe("renameFolder", () => {
    it("updates the folder name in state", async () => {
      mockInvoke.mockResolvedValueOnce([makeFolder(1, "Old")]); // loadFolders
      mockInvoke.mockResolvedValueOnce(undefined); // rename_folder

      const { result } = renderHook(() => useFolders());
      await act(async () => {});

      await act(async () => {
        await result.current.renameFolder(1, "New");
      });

      expect(mockInvoke).toHaveBeenCalledWith("rename_folder", { id: 1, name: "New" });
      expect(result.current.folders[0].name).toBe("New");
    });
  });

  describe("deleteFolder", () => {
    it("removes the folder from state", async () => {
      mockInvoke.mockResolvedValueOnce([makeFolder(1), makeFolder(2)]); // loadFolders
      mockInvoke.mockResolvedValueOnce(undefined); // delete_folder

      const { result } = renderHook(() => useFolders());
      await act(async () => {});
      expect(result.current.folders).toHaveLength(2);

      await act(async () => {
        await result.current.deleteFolder(1, false);
      });

      expect(mockInvoke).toHaveBeenCalledWith("delete_folder", { id: 1, deleteItems: false });
      expect(result.current.folders).toHaveLength(1);
      expect(result.current.folders[0].id).toBe(2);
    });
  });

  describe("moveItemToFolder", () => {
    it("invokes move_item_to_folder with correct args", async () => {
      mockInvoke.mockResolvedValueOnce([]); // loadFolders
      const { result } = renderHook(() => useFolders());
      await act(async () => {});

      await act(async () => {
        await result.current.moveItemToFolder(5, 10);
      });

      expect(mockInvoke).toHaveBeenCalledWith("move_item_to_folder", { itemId: 5, folderId: 10 });
    });
  });

  describe("removeItemFromFolder", () => {
    it("invokes remove_item_from_folder with correct args", async () => {
      mockInvoke.mockResolvedValueOnce([]); // loadFolders
      const { result } = renderHook(() => useFolders());
      await act(async () => {});

      await act(async () => {
        await result.current.removeItemFromFolder(7);
      });

      expect(mockInvoke).toHaveBeenCalledWith("remove_item_from_folder", { itemId: 7 });
    });
  });

  // -------------------------------------------------------------------------
  // Error paths — uncovered lines
  // -------------------------------------------------------------------------

  describe("createFolder — trial error", () => {
    it("calls onTrialError with 'Folder organisation' and rethrows on trial error", async () => {
      mockInvoke.mockResolvedValueOnce([]); // loadFolders
      mockInvoke.mockRejectedValueOnce("trial");

      const onTrialError = vi.fn();
      const { result } = renderHook(() => useFolders({ onTrialError }));
      await act(async () => {});

      await expect(
        act(async () => { await result.current.createFolder("Work"); })
      ).rejects.toBe("trial");

      expect(onTrialError).toHaveBeenCalledWith("Folder organisation");
    });
  });

  describe("moveItemToFolder — error paths", () => {
    it("calls onTrialError on trial error", async () => {
      mockInvoke.mockResolvedValueOnce([]); // loadFolders
      mockInvoke.mockRejectedValueOnce("trial");

      const onTrialError = vi.fn();
      const { result } = renderHook(() => useFolders({ onTrialError }));
      await act(async () => {});

      await act(async () => {
        await result.current.moveItemToFolder(5, 10);
      });

      expect(onTrialError).toHaveBeenCalledWith("Folder organisation");
    });

    it("logs console.error for non-trial errors", async () => {
      mockInvoke.mockResolvedValueOnce([]); // loadFolders
      mockInvoke.mockRejectedValueOnce("some_other_error");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderHook(() => useFolders());
      await act(async () => {});

      await act(async () => {
        await result.current.moveItemToFolder(5, 10);
      });

      expect(consoleSpy).toHaveBeenCalledWith("some_other_error");
      consoleSpy.mockRestore();
    });
  });

  describe("removeItemFromFolder — error paths", () => {
    it("calls onTrialError on trial error", async () => {
      mockInvoke.mockResolvedValueOnce([]); // loadFolders
      mockInvoke.mockRejectedValueOnce("trial");

      const onTrialError = vi.fn();
      const { result } = renderHook(() => useFolders({ onTrialError }));
      await act(async () => {});

      await act(async () => {
        await result.current.removeItemFromFolder(7);
      });

      expect(onTrialError).toHaveBeenCalledWith("Folder organisation");
    });

    it("logs console.error for non-trial errors", async () => {
      mockInvoke.mockResolvedValueOnce([]); // loadFolders
      mockInvoke.mockRejectedValueOnce("some_other_error");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderHook(() => useFolders());
      await act(async () => {});

      await act(async () => {
        await result.current.removeItemFromFolder(7);
      });

      expect(consoleSpy).toHaveBeenCalledWith("some_other_error");
      consoleSpy.mockRestore();
    });
  });
});
