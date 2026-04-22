import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { PermissionsDialog } from "@/components/PermissionsDialog/index";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("./index.css", () => ({
  backdrop: "backdrop",
  card: "card",
  title: "title",
  body: "body",
  primaryButton: "primaryButton",
  secondaryButton: "secondaryButton",
  errorText: "errorText",
}));

const STORAGE_KEY = "kurippa.permissions.intro.shown";

describe("PermissionsDialog", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders nothing and calls onDone when both permissions are granted", async () => {
    mockInvoke.mockResolvedValue({ accessibility: true, input_monitoring: true });

    const onDone = vi.fn();
    render(createElement(PermissionsDialog, { onDone }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(screen.queryByText("Before we start")).toBeNull();
  });

  it("shows intro screen when localStorage key absent and permissions missing", async () => {
    mockInvoke.mockResolvedValue({ accessibility: false, input_monitoring: false });

    const onDone = vi.fn();
    render(createElement(PermissionsDialog, { onDone }));

    await waitFor(() => expect(screen.getByText("Before we start")).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("skips intro and shows accessibility step when localStorage key present and accessibility missing", async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockInvoke.mockResolvedValue({ accessibility: false, input_monitoring: false });

    render(createElement(PermissionsDialog, { onDone: vi.fn() }));

    await waitFor(() =>
      expect(screen.getByText("Step 1 of 2 — Accessibility")).toBeInTheDocument()
    );
    expect(screen.queryByText("Before we start")).toBeNull();
  });

  it("advances to input_monitoring step when check passes after clicking I've added it", async () => {
    localStorage.setItem(STORAGE_KEY, "1");

    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false }) // initial check
      .mockResolvedValueOnce(undefined)                                          // request_accessibility
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })  // re-check after button
      .mockImplementation(() => new Promise(() => {}));                          // request_input_monitoring hangs

    render(createElement(PermissionsDialog, { onDone: vi.fn() }));

    await waitFor(() =>
      expect(screen.getByText("Step 1 of 2 — Accessibility")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "I've added it" }));

    await waitFor(() =>
      expect(screen.getByText("Step 2 of 2 — Input Monitoring")).toBeInTheDocument()
    );
  });

  it("shows inline error when check still returns false after clicking I've added it", async () => {
    localStorage.setItem(STORAGE_KEY, "1");

    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false });

    render(createElement(PermissionsDialog, { onDone: vi.fn() }));

    await waitFor(() =>
      expect(screen.getByText("Step 1 of 2 — Accessibility")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "I've added it" }));

    await waitFor(() =>
      expect(
        screen.getByText("Kurippa isn't in the list yet — please add it, then try again.")
      ).toBeInTheDocument()
    );
  });

  it("shows denied screen when input_monitoring returns false", async () => {
    localStorage.setItem(STORAGE_KEY, "1");

    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce(false);

    render(createElement(PermissionsDialog, { onDone: vi.fn() }));

    await waitFor(() =>
      expect(screen.getByText("Permissions needed")).toBeInTheDocument()
    );
  });

  it("Open System Settings button on denied screen calls open_privacy_settings", async () => {
    localStorage.setItem(STORAGE_KEY, "1");

    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce(false);

    render(createElement(PermissionsDialog, { onDone: vi.fn() }));

    await waitFor(() =>
      expect(screen.getByText("Permissions needed")).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Open System Settings" }));
    });

    expect(mockInvoke).toHaveBeenCalledWith("open_privacy_settings");
  });

  it("Check Again button transitions to done and calls onDone when both permissions now granted", async () => {
    localStorage.setItem(STORAGE_KEY, "1");

    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false }) // initial check
      .mockResolvedValueOnce(false)                                             // request_input_monitoring
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: true }); // check again

    const onDone = vi.fn();
    render(createElement(PermissionsDialog, { onDone }));

    await waitFor(() =>
      expect(screen.getByText("Permissions needed")).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Check Again" }));
    });

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("Check Again button stays on denied screen when permissions still missing", async () => {
    localStorage.setItem(STORAGE_KEY, "1");

    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false }) // initial check
      .mockResolvedValueOnce(false)                                             // request_input_monitoring
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false }); // check again — still missing

    render(createElement(PermissionsDialog, { onDone: vi.fn() }));

    await waitFor(() =>
      expect(screen.getByText("Permissions needed")).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Check Again" }));
    });

    await waitFor(() =>
      expect(screen.getByText("Permissions needed")).toBeInTheDocument()
    );
  });

  it("input_monitoring granted leads to done state and calls onDone", async () => {
    localStorage.setItem(STORAGE_KEY, "1");

    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false }) // initial check
      .mockResolvedValueOnce(true);                                             // request_input_monitoring granted

    const onDone = vi.fn();
    render(createElement(PermissionsDialog, { onDone }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("check_permissions failure renders error state", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("IPC error"));

    render(createElement(PermissionsDialog, { onDone: vi.fn() }));

    await waitFor(() =>
      expect(
        screen.getByText("Could not check permissions. Please restart Kurippa.")
      ).toBeInTheDocument()
    );
  });
});
