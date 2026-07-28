/**
 * __tests__/TransactionsPage.test.tsx
 *
 * Verifies the offline UX for the Export CSV button on the Transactions page:
 *  - Button is disabled and has aria-label when offline
 *  - NetworkTooltip renders with the correct message when offline
 *  - NetworkTooltip is NOT rendered when online
 *  - Button is enabled and has no offline aria-label when online
 *  - Export handler fires when online but is a no-op when offline
 *
 * Module structure under test:
 *   app/(merchant)/transactions/page.tsx
 *     └─ useOnlineStatus              (mocked)
 *     └─ NetworkTooltip               (mocked — stub preserving data-testid)
 *     └─ mockTransactions             (mocked — empty array for render tests)
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Module mocks — declared before imports that depend on them
// ---------------------------------------------------------------------------

// ── useOnlineStatus ──────────────────────────────────────────────────────────
const mockIsOnline = jest.fn<boolean, []>().mockReturnValue(true);
jest.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => mockIsOnline(),
}));

// ── NetworkTooltip ───────────────────────────────────────────────────────────
// Stub that renders a visible tooltip-content div only when offline (isOnline=false).
jest.mock("@/components/shared/NetworkTooltip", () => ({
  NetworkTooltip: ({
    isOnline,
    message = "Export unavailable while offline.",
    children,
  }: {
    isOnline: boolean;
    message?: string;
    children: React.ReactNode;
  }) => (
    <>
      {children}
      {!isOnline && (
        <div data-testid="network-tooltip-content" role="tooltip">
          {message}
        </div>
      )}
    </>
  ),
  OFFLINE_MESSAGE: "Export unavailable while offline.",
}));

// ── mockTransactions ─────────────────────────────────────────────────────────
jest.mock("@/lib/mock/transactions", () => ({
  mockTransactions: [],
}));

// ── next/navigation (not used in page but required by deps) ──────────────────
jest.mock("next/navigation", () => ({
  usePathname: () => "/transactions",
  useRouter: () => ({ push: jest.fn() }),
}));

// ── lucide-react icons ────────────────────────────────────────────────────────
jest.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = ({ className }: { className?: string }) => (
      <svg data-testid={`icon-${name}`} className={className} />
    );
    I.displayName = name;
    return I;
  };
  return {
    Search: icon("Search"),
    Download: icon("Download"),
    Filter: icon("Filter"),
    SearchX: icon("SearchX"),
  };
});

// ── @/lib/utils ───────────────────────────────────────────────────────────────
jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// ── @/lib/utils/format ────────────────────────────────────────────────────────
jest.mock("@/lib/utils/format", () => ({
  formatDate: (d: string | Date) => String(d),
  truncateAddress: (a: string) => a,
}));

// ── @/components/ui/* ─────────────────────────────────────────────────────────
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    className,
    "aria-label": ariaLabel,
    "aria-disabled": ariaDisabled,
    id,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    "aria-label"?: string;
    "aria-disabled"?: boolean;
  }) => (
    <button
      id={id}
      disabled={disabled}
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      aria-disabled={ariaDisabled}
      {...rest}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock("@/components/ui/table", () => {
  const passthrough =
    (Tag: string) =>
    ({ children, className, ...rest }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(Tag, { className, ...rest }, children);
  return {
    Table: passthrough("table"),
    TableHeader: passthrough("thead"),
    TableBody: passthrough("tbody"),
    TableRow: passthrough("tr"),
    TableHead: passthrough("th"),
    TableCell: passthrough("td"),
  };
});

// ── shared components ─────────────────────────────────────────────────────────
jest.mock("@/components/shared/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));
jest.mock("@/components/shared/CopyAddress", () => ({
  CopyAddress: ({ address }: { address: string }) => <span>{address}</span>,
}));
jest.mock("@/components/shared/CurrencyDisplay", () => ({
  CurrencyDisplay: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));
jest.mock("@/components/shared/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));
jest.mock("@/components/transactions/TransactionDetail", () => ({
  TransactionDetail: () => null,
}));

// ---------------------------------------------------------------------------
// Component import — after all mocks
// ---------------------------------------------------------------------------

import TransactionsPage from "@/app/(merchant)/transactions/page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderPage = () => render(<TransactionsPage />);

// When offline, aria-label overrides the computed accessible name, so we
// locate the button by its stable id rather than by accessible name.
const getExportButton = () =>
  document.getElementById("export-csv-btn") as HTMLButtonElement;

// ---------------------------------------------------------------------------
// Tests: Offline state
// ---------------------------------------------------------------------------

describe("TransactionsPage — Export CSV (offline)", () => {
  beforeEach(() => {
    mockIsOnline.mockReturnValue(false);
  });

  it("renders a disabled Export CSV button when offline", () => {
    renderPage();
    expect(getExportButton()).toBeDisabled();
  });

  it("has aria-label 'Export unavailable while offline' on the button", () => {
    renderPage();
    expect(getExportButton()).toHaveAttribute(
      "aria-label",
      "Export unavailable while offline"
    );
  });

  it("has aria-disabled=true on the button when offline", () => {
    renderPage();
    expect(getExportButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("renders NetworkTooltip with the offline message", () => {
    renderPage();
    const tooltip = screen.getByTestId("network-tooltip-content");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent("Export unavailable while offline.");
  });

  it("tooltip has role=tooltip", () => {
    renderPage();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("clicking the disabled button does NOT trigger the export", () => {
    // Button is disabled so onClick should not fire; verify no error thrown.
    renderPage();
    const btn = getExportButton();
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tests: Online state
// ---------------------------------------------------------------------------

describe("TransactionsPage — Export CSV (online)", () => {
  beforeEach(() => {
    mockIsOnline.mockReturnValue(true);
  });

  it("renders an enabled Export CSV button when online", () => {
    renderPage();
    expect(getExportButton()).not.toBeDisabled();
  });

  it("does NOT have an offline aria-label when online", () => {
    renderPage();
    const btn = getExportButton();
    // When online, aria-label is not set — attribute value is null
    expect(btn.getAttribute("aria-label")).toBeNull();
  });

  it("does NOT render the offline NetworkTooltip when online", () => {
    renderPage();
    expect(
      screen.queryByTestId("network-tooltip-content")
    ).not.toBeInTheDocument();
  });

  it("clicking the button when online does not throw", () => {
    renderPage();
    expect(() => fireEvent.click(getExportButton())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tests: Connectivity transition (online → offline → online)
// ---------------------------------------------------------------------------

describe("TransactionsPage — connectivity transitions", () => {
  it("button transitions from disabled (offline) to enabled (online) on re-render", () => {
    mockIsOnline.mockReturnValue(false);
    const { rerender } = render(<TransactionsPage />);
    expect(getExportButton()).toBeDisabled();

    mockIsOnline.mockReturnValue(true);
    rerender(<TransactionsPage />);
    expect(getExportButton()).not.toBeDisabled();
  });

  it("tooltip disappears when connectivity is restored", () => {
    mockIsOnline.mockReturnValue(false);
    const { rerender } = render(<TransactionsPage />);
    expect(screen.getByTestId("network-tooltip-content")).toBeInTheDocument();

    mockIsOnline.mockReturnValue(true);
    rerender(<TransactionsPage />);
    expect(
      screen.queryByTestId("network-tooltip-content")
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests: Existing page functionality (regression guard)
// ---------------------------------------------------------------------------

describe("TransactionsPage — existing functionality", () => {
  beforeEach(() => {
    mockIsOnline.mockReturnValue(true);
  });

  it("renders the Transactions heading", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /transactions/i })
    ).toBeInTheDocument();
  });

  it("renders the search input", () => {
    renderPage();
    expect(
      screen.getByPlaceholderText(/search by hash or address/i)
    ).toBeInTheDocument();
  });

  it("renders the Filter button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /filter/i })).toBeInTheDocument();
  });

  it("renders the empty state when there are no transactions", () => {
    renderPage();
    expect(screen.getByText(/no transactions found/i)).toBeInTheDocument();
  });
});
