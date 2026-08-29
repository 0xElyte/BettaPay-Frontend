/**
 * __tests__/MerchantSidebarCollapse.test.tsx
 *
 * Guards issue #537 for the merchant sidebar: the collapse preference is
 * persisted per role across reloads, and the toggle communicates its
 * expanded state via `aria-expanded` / `aria-controls`. (Small-screen
 * overlay + focus containment live in `MobileNavDrawer`, which is a
 * `role="dialog"` `aria-modal` panel with a scrim and an Escape/tab trap.)
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("next/link", () => {
  const L = ({ children, href, ...r }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...r}>
      {children}
    </a>
  );
  L.displayName = "MockLink";
  return L;
});
jest.mock("next/image", () => {
  const Img = (p: Record<string, unknown>) => <img alt="" {...p} />;
  Img.displayName = "MockImage";
  return Img;
});
const mockPathname = jest.fn(() => "/dashboard");
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));
jest.mock("@/lib/store/authStore", () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ user: { name: "Acme Co", kybStatus: "approved" }, isLoggedIn: true }),
}));

const STORAGE_KEY = "bettapay:sidebar:merchant:collapsed";

import { MerchantSidebar } from "@/components/layout/MerchantSidebar";

describe("MerchantSidebar collapse (issue #537)", () => {
  beforeEach(() => window.localStorage.clear());

  it("toggle exposes aria-expanded / aria-controls", () => {
    render(<MerchantSidebar />);
    const toggle = screen.getByRole("button", { name: /collapse sidebar/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "merchant-sidebar");
  });

  it("persists the collapsed preference to localStorage", () => {
    render(<MerchantSidebar />);
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
    // After collapsing, the toggle now offers to expand.
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("hydrates the collapsed state from a previous session", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    render(<MerchantSidebar />);
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });
});
