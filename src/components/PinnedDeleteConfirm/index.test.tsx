import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { PinnedDeleteConfirm } from "@/components/PinnedDeleteConfirm/index";

vi.mock("./index.css", () => ({
  container: "container",
  title: "title",
  body: "body",
  confirmButton: "confirmButton",
  unpinButton: "unpinButton",
  buttonHighlighted: "buttonHighlighted",
  hint: "hint",
}));

function makeProps(overrides: Partial<Parameters<typeof PinnedDeleteConfirm>[0]> = {}) {
  return {
    count: 3,
    onConfirm: vi.fn(),
    onUnpinAll: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("PinnedDeleteConfirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("render states", () => {
    it("renders the count in the body copy", () => {
      render(createElement(PinnedDeleteConfirm, makeProps({ count: 7 })));
      expect(screen.getByText(/all 7 pinned items/i)).toBeTruthy();
    });

    it("renders the title", () => {
      render(createElement(PinnedDeleteConfirm, makeProps()));
      expect(screen.getByText(/Delete all pinned items\?/)).toBeTruthy();
    });

    it("renders the confirm button", () => {
      render(createElement(PinnedDeleteConfirm, makeProps()));
      expect(screen.getByText("Yes, delete")).toBeTruthy();
    });

    it("renders the keyboard hint", () => {
      render(createElement(PinnedDeleteConfirm, makeProps()));
      expect(screen.getByText(/to choose/)).toBeTruthy();
      expect(screen.getByText(/Enter to confirm/)).toBeTruthy();
      expect(screen.getByText(/Esc to cancel/)).toBeTruthy();
    });

    it("renders the Unpin all instead button", () => {
      render(createElement(PinnedDeleteConfirm, makeProps()));
      expect(screen.getByText("Unpin all instead")).toBeTruthy();
    });
  });

  describe("highlight state", () => {
    it("delete button is highlighted initially", () => {
      render(createElement(PinnedDeleteConfirm, makeProps()));
      expect(screen.getByText("Yes, delete").className).toContain("buttonHighlighted");
    });

    it("unpin button is not highlighted initially", () => {
      render(createElement(PinnedDeleteConfirm, makeProps()));
      expect(screen.getByText("Unpin all instead").className).not.toContain("buttonHighlighted");
    });

    it("mouseMove over unpin highlights unpin and unhighlights delete", () => {
      render(createElement(PinnedDeleteConfirm, makeProps()));
      const unpin = screen.getByText("Unpin all instead");
      fireEvent.mouseMove(unpin);
      expect(unpin.className).toContain("buttonHighlighted");
      expect(screen.getByText("Yes, delete").className).not.toContain("buttonHighlighted");
    });
  });

  describe("mouse interactions", () => {
    it("clicking Yes, delete calls onConfirm", () => {
      const props = makeProps();
      render(createElement(PinnedDeleteConfirm, props));
      fireEvent.click(screen.getByText("Yes, delete"));
      expect(props.onConfirm).toHaveBeenCalledOnce();
    });

    it("clicking Unpin all instead calls onUnpinAll", () => {
      const props = makeProps();
      render(createElement(PinnedDeleteConfirm, props));
      fireEvent.click(screen.getByText("Unpin all instead"));
      expect(props.onUnpinAll).toHaveBeenCalledOnce();
      expect(props.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("keyboard interactions", () => {
    it("Enter calls onConfirm (delete highlighted by default)", () => {
      const props = makeProps();
      render(createElement(PinnedDeleteConfirm, props));
      fireEvent.keyDown(document, { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledOnce();
    });

    it("Escape calls onCancel", () => {
      const props = makeProps();
      render(createElement(PinnedDeleteConfirm, props));
      fireEvent.keyDown(document, { key: "Escape" });
      expect(props.onCancel).toHaveBeenCalledOnce();
    });

    it("U calls onUnpinAll", () => {
      const props = makeProps();
      render(createElement(PinnedDeleteConfirm, props));
      fireEvent.keyDown(document, { key: "u" });
      expect(props.onUnpinAll).toHaveBeenCalledOnce();
      expect(props.onConfirm).not.toHaveBeenCalled();
      expect(props.onCancel).not.toHaveBeenCalled();
    });

    it("other keys do nothing", () => {
      const props = makeProps();
      render(createElement(PinnedDeleteConfirm, props));
      fireEvent.keyDown(document, { key: "n" });
      expect(props.onConfirm).not.toHaveBeenCalled();
      expect(props.onUnpinAll).not.toHaveBeenCalled();
      expect(props.onCancel).not.toHaveBeenCalled();
    });
  });
});
