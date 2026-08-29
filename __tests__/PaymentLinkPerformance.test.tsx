/**
 * __tests__/PaymentLinkPerformance.test.tsx
 *
 * Guards issue #535: the dashboard "Payment Link Performance" section must
 * render the logged-in merchant's real payment links (from `usePayments`),
 * show an empty/CTA state when there are none, and never fall back to the
 * `link_xxx` mock fixtures in `lib/mock/paymentLinks.ts`.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

// next/link → plain anchor so href is assertable
jest.mock("next/link", () => {
  const MockLink = ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

const mockUsePayments = jest.fn();
jest.mock("@/lib/api/hooks", () => ({
  usePayments: () => mockUsePayments(),
}));
jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

import { PaymentLinkPerformance } from "@/components/dashboard/PaymentLinkPerformance";

const withState = (over: Record<string, unknown>) => ({
  data: [],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  ...over,
});

describe("PaymentLinkPerformance (issue #535)", () => {
  beforeEach(() => mockUsePayments.mockReset());

  it("renders the merchant's real payment links — no link_xxx placeholders", () => {
    mockUsePayments.mockReturnValue(
      withState({
        data: [
          { id: "pl_realA1B2", source: "Invoice #204", clicks: 12, converted: 4, amountUsdc: 500 },
          { id: "pl_realC3D4", source: "Storefront", clicks: 0, converted: 0, amountUsdc: 0 },
        ],
      }),
    );
    render(<PaymentLinkPerformance />);

    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toEqual(expect.arrayContaining(["/payments/pl_realA1B2", "/payments/pl_realC3D4"]));
    // The mock fixtures use ids like `link_01` / `link_xxx` — none must appear.
    for (const href of links) {
      expect(href).not.toMatch(/link_\w+/);
    }
    expect(screen.getByText("Invoice #204")).toBeInTheDocument();
    expect(screen.queryByText(/No payment links yet/i)).not.toBeInTheDocument();
  });

  it("shows an empty/CTA state when the merchant has zero links", () => {
    mockUsePayments.mockReturnValue(withState({ data: [] }));
    render(<PaymentLinkPerformance />);
    expect(screen.getByText(/No payment links yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/link_/i)).not.toBeInTheDocument();
  });

  it("surfaces a load error with retry rather than mock rows", () => {
    const refetch = jest.fn();
    mockUsePayments.mockReturnValue(withState({ data: [], error: "boom", refetch }));
    render(<PaymentLinkPerformance />);
    expect(screen.queryByText(/link_/i)).not.toBeInTheDocument();
  });
});
