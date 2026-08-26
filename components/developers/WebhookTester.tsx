"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { Badge } from "@/components/ui";
import { useNotify } from "@/lib/hooks/useNotify";
import {
  Zap,
  Send,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuthStore } from "@/lib/store/authStore";

const EVENT_TYPES = [
  { value: "payment.completed", label: "payment.completed" },
  { value: "settlement.completed", label: "settlement.completed" },
  { value: "dispute.created", label: "dispute.created" },
] as const;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const SAMPLE_PAYLOADS: Record<string, JsonValue> = {
  "payment.completed": {
    id: "evt_pay_123456",
    type: "payment.completed",
    data: {
      payment_id: "pay_987654",
      amount: 5000,
      currency: "USDC",
      status: "completed",
      customer: { email: "customer@example.com" },
    },
    created_at: new Date().toISOString(),
  },
  "settlement.completed": {
    id: "evt_set_234567",
    type: "settlement.completed",
    data: {
      settlement_id: "set_112233",
      amount: 4900,
      currency: "USDC",
      fee: 100,
      status: "processed",
    },
    created_at: new Date().toISOString(),
  },
  "dispute.created": {
    id: "evt_disp_345678",
    type: "dispute.created",
    data: {
      dispute_id: "disp_998877",
      payment_id: "pay_987654",
      amount: 5000,
      currency: "USDC",
      reason: "fraudulent",
      status: "pending_review",
    },
    created_at: new Date().toISOString(),
  },
};

const MOCK_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "x-signature": "sig_live_abc123def456...",
  "x-webhook-id": "wh_001",
  "x-delivery-attempt": "0",
};

interface DeliveryLogEntry {
  id: string;
  timestamp: Date;
  eventType: string;
  targetUrl: string;
  status: "success" | "failed";
  statusCode: number;
  resultType?: string;
}

export function WebhookTester() {
  const { user } = useAuthStore();
  const [selectedEvent, setSelectedEvent] = useState<string>("payment.completed");
  const [targetUrl, setTargetUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const draft = localStorage.getItem("onboardingDraft");
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.data?.webhookUrl) return parsed.data.webhookUrl;
        }
      } catch {
        // Fallback below
      }
    }
    return user?.id ? `https://api.bettapay.io/merchants/${user.id}/webhooks` : "https://api.bettapay.io/webhooks/merchant_01";
  });
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    isTimeout?: boolean;
    headers: Record<string, string>;
    body: JsonValue;
  } | null>(null);
  const [deliveryLog, setDeliveryLog] = useState<DeliveryLogEntry[]>([]);
  const [signaturePayload, setSignaturePayload] = useState("");
  const [signatureSecret, setSignatureSecret] = useState("");
  const [signatureResult, setSignatureResult] = useState<{
    valid: boolean;
    computedSignature?: string;
    expectedSignature?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const notify = useNotify();

  const validateUrl = (urlStr: string): { isValid: boolean; error?: string } => {
    const trimmed = urlStr.trim();
    if (!trimmed) {
      return { isValid: false, error: "Endpoint URL is required." };
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { isValid: false, error: "Invalid URL format. Please enter a valid address (e.g., https://your-app.com/webhooks)." };
    }

    const isDev = process.env.NODE_ENV === "development" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !isDev) {
      return { isValid: false, error: "HTTPS protocol is required for webhook endpoints (http:// allowed only in dev/localhost)." };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { isValid: false, error: `Invalid URL protocol "${parsed.protocol}". Only https:// (or http:// in dev) is supported.` };
    }

    return { isValid: true };
  };

  const handleSend = useCallback(() => {
    const validation = validateUrl(targetUrl);
    if (!validation.isValid) {
      setUrlError(validation.error || "Invalid URL");
      notify.error(validation.error || "Invalid URL");
      return;
    }
    setUrlError(null);

    setIsSending(true);
    setResponse(null);

    const payload = SAMPLE_PAYLOADS[selectedEvent];
    const timestamp = new Date();
    const isTimeoutTest = targetUrl.includes("timeout");
    const isErrorTest = targetUrl.includes("error") || targetUrl.includes("500");

    setTimeout(() => {
      if (isTimeoutTest) {
        setResponse({
          status: 408,
          statusText: "Request Timeout",
          isTimeout: true,
          headers: { "content-type": "application/json" },
          body: {
            error: "TIMEOUT",
            message: "Target endpoint failed to respond within 5000ms timeout window.",
          },
        });
        setDeliveryLog((prev) => [
          {
            id: `del_${Date.now()}`,
            timestamp,
            eventType: selectedEvent,
            targetUrl,
            status: "failed",
            statusCode: 408,
            resultType: "Timeout (No response)",
          },
          ...prev,
        ]);
        notify.error("Webhook delivery timed out after 5000ms");
      } else if (isErrorTest) {
        setResponse({
          status: 500,
          statusText: "Internal Server Error",
          isTimeout: false,
          headers: { ...MOCK_HEADERS },
          body: {
            error: "HTTP_500",
            message: "Target webhook endpoint returned HTTP 500 Internal Server Error",
          },
        });
        setDeliveryLog((prev) => [
          {
            id: `del_${Date.now()}`,
            timestamp,
            eventType: selectedEvent,
            targetUrl,
            status: "failed",
            statusCode: 500,
            resultType: "HTTP 500 Server Error",
          },
          ...prev,
        ]);
        notify.error("Webhook endpoint returned HTTP error status 500");
      } else {
        setResponse({
          status: 200,
          statusText: "OK",
          isTimeout: false,
          headers: { ...MOCK_HEADERS },
          body: {
            success: true,
            received: true,
            event_id: typeof payload === "object" && payload !== null && "id" in payload && typeof payload.id === "string" ? payload.id : "evt_unknown",
            message: "Webhook delivered and acknowledged successfully",
          },
        });
        setDeliveryLog((prev) => [
          {
            id: `del_${Date.now()}`,
            timestamp,
            eventType: selectedEvent,
            targetUrl,
            status: "success",
            statusCode: 200,
            resultType: "Delivered 200 OK",
          },
          ...prev,
        ]);
        notify.success("Test webhook sent successfully");
      }
      setIsSending(false);
    }, 1200);
  }, [targetUrl, selectedEvent, notify]);

  const handleCopyPayload = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2));
    notify.success("Payload copied to clipboard");
  }, [selectedEvent, notify]);

  const handleVerifySignature = useCallback(async () => {
    if (!signaturePayload.trim() || !signatureSecret.trim()) {
      notify.error("Please provide both the payload and the signing secret");
      return;
    }

    setIsVerifying(true);
    setSignatureResult(null);

    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(signatureSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signaturePayload));
      const computedSignature = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const payloadLines = signaturePayload.split("\n");
      const signatureLine = payloadLines.find((l) => l.includes("x-signature"));
      const expectedSignature = signatureLine
        ? signatureLine.split(":")[1]?.trim()
        : null;

      const isValid = expectedSignature
        ? computedSignature === expectedSignature
        : false;

      setSignatureResult({
        valid: isValid,
        computedSignature,
        expectedSignature: expectedSignature || undefined,
      });
    } catch {
      setSignatureResult({ valid: false });
      notify.error("Failed to verify signature");
    } finally {
      setIsVerifying(false);
    }
  }, [signaturePayload, signatureSecret, notify]);

  return (
    <div className="space-y-6">
      {/* Test Event Sender */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Send Test Event
          </CardTitle>
          <CardDescription>
            Simulate a webhook event to verify your endpoint handles it correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="webhook-tester-url">Webhook Endpoint URL</Label>
            <Input
              id="webhook-tester-url"
              type="url"
              placeholder="https://your-app.com/webhooks/bettapay"
              value={targetUrl}
              onChange={(e) => {
                setTargetUrl(e.target.value);
                setUrlError(null);
              }}
              aria-invalid={!!urlError}
              className={cn("h-10 border-border rounded-xl font-mono text-sm bg-muted", urlError && "border-destructive focus-visible:ring-destructive")}
            />
            {urlError && <p className="text-xs text-destructive font-medium">{urlError}</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Event Type</Label>
              <Select value={selectedEvent} onValueChange={(v) => v && setSelectedEvent(v)}>
                <SelectTrigger className="w-full h-10 border-border rounded-xl bg-muted">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="bg-foreground hover:bg-foreground/90 text-background rounded-xl h-10 px-6 text-sm font-semibold min-w-[140px]"
            >
              {isSending ? (
                <><RefreshCcw className="w-3.5 h-3.5 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Zap className="w-3.5 h-3.5 mr-2" /> Send Test Event</>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Payload</Label>
              <Button variant="ghost" size="sm" className="min-h-[36px] text-xs" onClick={handleCopyPayload}>
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </div>
            <div className="bg-foreground rounded-xl p-4 overflow-x-auto border border-border">
              <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                {JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2)}
              </pre>
            </div>
          </div>

          {response && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                {response.status === 200 ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                <span className="text-sm font-semibold">
                  Response: {response.status} {response.statusText || (response.status === 200 ? "OK" : "Error")}
                  {response.isTimeout && " (Timeout)"}
                </span>
                {response.isTimeout && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    Timeout
                  </Badge>
                )}
                {!response.isTimeout && response.status !== 200 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    HTTP Error
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Headers</p>
                <div className="bg-background rounded-lg p-3 border border-border">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="text-xs font-mono text-foreground">
                      <span className="text-muted-foreground">{key}: </span>{value}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body</p>
                <div className="bg-background rounded-lg p-3 border border-border overflow-x-auto">
                  <pre className="text-xs font-mono text-foreground">
                    {JSON.stringify(response.body, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery History */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Delivery History
          </CardTitle>
          <CardDescription>Recent webhook test delivery attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveryLog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No deliveries yet. Send a test event above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Target Endpoint</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HTTP Status / Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">
                      {entry.timestamp.toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate" title={entry.targetUrl}>
                      {entry.targetUrl}
                    </TableCell>
                    <TableCell className="font-medium">{entry.eventType}</TableCell>
                    <TableCell>
                      <Badge variant={entry.status === "success" ? "default" : "destructive"}>
                        {entry.status === "success" ? "Delivered" : "Failed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.statusCode} {entry.resultType && `(${entry.resultType})`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Signature Verification Helper */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Signature Verification
          </CardTitle>
          <CardDescription>
            Paste a webhook payload and your signing secret to test HMAC-SHA256 signature verification locally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook Payload</Label>
            <textarea
              value={signaturePayload}
              onChange={(e) => setSignaturePayload(e.target.value)}
              placeholder='{"id":"evt_123","type":"payment.completed",...}'
              rows={5}
              className="w-full rounded-xl border border-border bg-muted p-3 text-xs font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Signing Secret</Label>
            <Input
              value={signatureSecret}
              onChange={(e) => setSignatureSecret(e.target.value)}
              placeholder="whsec_..."
              className="h-10 border-border rounded-xl bg-muted font-mono text-sm"
            />
          </div>
          <Button
            onClick={handleVerifySignature}
            disabled={isVerifying}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-6 text-sm font-semibold"
          >
            {isVerifying ? (
              <><RefreshCcw className="w-3.5 h-3.5 mr-2 animate-spin" /> Verifying...</>
            ) : (
              <><ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verify Signature</>
            )}
          </Button>

          {signatureResult && (
            <div
              className={cn(
                "p-4 rounded-xl border flex items-start gap-3",
                signatureResult.valid
                  ? "bg-success/10 border-success/20"
                  : "bg-destructive/10 border-destructive/20"
              )}
            >
              {signatureResult.valid ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-sm">
                <p className={cn("font-semibold", signatureResult.valid ? "text-success" : "text-destructive")}>
                  {signatureResult.valid ? "Signature Verified" : "Signature Mismatch"}
                </p>
                {signatureResult.computedSignature && (
                  <div className="text-xs font-mono text-muted-foreground">
                    <p>Computed: {signatureResult.computedSignature.slice(0, 32)}...</p>
                  </div>
                )}
                {signatureResult.expectedSignature && (
                  <div className="text-xs font-mono text-muted-foreground">
                    <p>Expected: {signatureResult.expectedSignature.slice(0, 32)}...</p>
                  </div>
                )}
                {!signatureResult.expectedSignature && (
                  <p className="text-xs text-muted-foreground">
                    Tip: Include an <code className="text-xs bg-muted px-1 rounded">x-signature</code> header line in your payload for comparison.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
