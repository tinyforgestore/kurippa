import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom does not implement the Clipboard API
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

// jsdom does not implement ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// jsdom does not implement scrollTo on HTMLElement
window.HTMLElement.prototype.scrollTo = vi.fn();
