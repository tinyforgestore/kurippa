import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { PermissionsDialog } from "@/components/PermissionsDialog/index";
import type { DialogState } from "@/hooks/usePermissionsDialog";

const mockHandlers = {
  handleGetStarted: vi.fn(),
  handleIveAddedIt: vi.fn(),
  handleOpenSystemSettings: vi.fn(),
  handleCheckAgain: vi.fn(),
};

let mockDialogState: DialogState = "intro";

vi.mock("@/hooks/usePermissionsDialog", () => ({
  usePermissionsDialog: () => ({
    dialogState: mockDialogState,
    ...mockHandlers,
  }),
}));

vi.mock("./index.css", () => ({
  backdrop: "backdrop",
  card: "card",
  title: "title",
  body: "body",
  primaryButton: "primaryButton",
  secondaryButton: "secondaryButton",
}));

describe("PermissionsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDialogState = "intro";
  });

  it("renders intro screen when dialogState is intro", () => {
    mockDialogState = "intro";
    render(createElement(PermissionsDialog, { onDone: vi.fn() }));
    expect(screen.getByText("Before we start")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument();
  });

  it("renders accessibility step when dialogState is accessibility", () => {
    mockDialogState = "accessibility";
    render(createElement(PermissionsDialog, { onDone: vi.fn() }));
    expect(screen.getByText("Enable Accessibility")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I've added it" })).toBeInTheDocument();
  });

  it("renders denied screen with both buttons when dialogState is denied", () => {
    mockDialogState = "denied";
    render(createElement(PermissionsDialog, { onDone: vi.fn() }));
    expect(screen.getByText("Permissions needed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open System Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Again" })).toBeInTheDocument();
  });

  it("renders error screen when dialogState is error", () => {
    mockDialogState = "error";
    render(createElement(PermissionsDialog, { onDone: vi.fn() }));
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Could not check permissions. Please restart Kurippa.")).toBeInTheDocument();
  });

  it("renders null when dialogState is checking", () => {
    mockDialogState = "checking";
    const { container } = render(createElement(PermissionsDialog, { onDone: vi.fn() }));
    expect(container.firstChild).toBeNull();
  });

  it("clicking Get Started calls handleGetStarted", () => {
    mockDialogState = "intro";
    render(createElement(PermissionsDialog, { onDone: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    expect(mockHandlers.handleGetStarted).toHaveBeenCalledOnce();
  });

  it("clicking I've added it calls handleIveAddedIt", () => {
    mockDialogState = "accessibility";
    render(createElement(PermissionsDialog, { onDone: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "I've added it" }));
    expect(mockHandlers.handleIveAddedIt).toHaveBeenCalledOnce();
  });

  it("clicking Open System Settings calls handleOpenSystemSettings", () => {
    mockDialogState = "denied";
    render(createElement(PermissionsDialog, { onDone: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Open System Settings" }));
    expect(mockHandlers.handleOpenSystemSettings).toHaveBeenCalledOnce();
  });

  it("clicking Check Again calls handleCheckAgain", () => {
    mockDialogState = "denied";
    render(createElement(PermissionsDialog, { onDone: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Check Again" }));
    expect(mockHandlers.handleCheckAgain).toHaveBeenCalledOnce();
  });
});
