import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WebhookTester } from "../WebhookTester";

const mockNotifySuccess = jest.fn();
const mockNotifyError = jest.fn();
jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({
    success: mockNotifySuccess,
    error: mockNotifyError,
    info: jest.fn(),
  }),
}));

describe("WebhookTester", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders endpoint URL, secret, event selector and send button", () => {
    render(<WebhookTester initialEndpointUrl="https://example.com/webhook" initialWebhookSecret="whsec_test123" />);

    expect(screen.getByDisplayValue("https://example.com/webhook")).toBeInTheDocument();
    expect(screen.getByDisplayValue("whsec_test123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Test Event/i })).toBeInTheDocument();
  });

  it("sends actual POST request with X-BettaPay-Signature header on handleSend", async () => {
    const mockResponse = { success: true, message: "Acknowledged" };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: jest.fn().mockResolvedValueOnce(JSON.stringify(mockResponse)),
    });

    render(<WebhookTester initialEndpointUrl="https://example.com/webhook" initialWebhookSecret="whsec_test123" />);

    const sendButton = screen.getByRole("button", { name: /Send Test Event/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("https://example.com/webhook");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-BettaPay-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(options.headers["X-BettaPay-Timestamp"]).toBeDefined();
    expect(options.headers["X-BettaPay-Event-Id"]).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Response: 200 OK/i)).toBeInTheDocument();
    });

    expect(mockNotifySuccess).toHaveBeenCalledWith(expect.stringContaining("200"));
  });

  it("handles non-200 HTTP status response correctly", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 500,
      headers: new Headers({ "content-type": "application/json" }),
      text: jest.fn().mockResolvedValueOnce(JSON.stringify({ error: "Internal Server Error" })),
    });

    render(<WebhookTester initialEndpointUrl="https://example.com/webhook" initialWebhookSecret="whsec_test123" />);

    const sendButton = screen.getByRole("button", { name: /Send Test Event/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Response: 500/i)).toBeInTheDocument();
    });

    expect(mockNotifyError).toHaveBeenCalledWith(expect.stringContaining("500"));
  });

  it("handles network failure / connection error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Failed to fetch"));

    render(<WebhookTester initialEndpointUrl="https://example.com/webhook" initialWebhookSecret="whsec_test123" />);

    const sendButton = screen.getByRole("button", { name: /Send Test Event/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Response: 0 \(Network Error\)/i)).toBeInTheDocument();
    });

    expect(mockNotifyError).toHaveBeenCalledWith(expect.stringContaining("Failed to fetch"));
  });
});
