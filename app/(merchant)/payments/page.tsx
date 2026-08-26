"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CopyAddress } from '@/components/shared/CopyAddress';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, MoreHorizontal, QrCode, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotify } from '@/lib/hooks/useNotify';
import { apiClient } from '@/lib/api/axios';
import { CurrencySelector } from '@/components/payments/CurrencySelector';
import Link from 'next/link';

interface PaymentLink {
  id: string;
  label: string;
  type: 'open' | 'fixed';
  amount?: number | null;
  currency?: string;
  url?: string;
  createdAt?: string;
  created?: string;
  clicks?: number;
  converted?: number;
}

function normalizePaymentLinks(payload: unknown): PaymentLink[] {
  const response = payload as { data?: unknown; links?: unknown; paymentLinks?: unknown } | null;
  const links = Array.isArray(payload)
    ? payload
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.links)
        ? response.links
        : Array.isArray(response?.paymentLinks)
          ? response.paymentLinks
          : [];

  return links.filter((link): link is PaymentLink => {
    const item = link as Partial<PaymentLink>;
    return typeof item.id === 'string' && typeof item.label === 'string';
  });
}

export default function PaymentsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currency, setCurrency] = useState('USDC');
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { success, error } = useNotify();

  useEffect(() => {
    let isMounted = true;

    const loadPaymentLinks = async () => {
      try {
        const response = await apiClient.get('/api/payment-links');
        if (isMounted) setPaymentLinks(normalizePaymentLinks(response.data));
      } catch {
        if (isMounted) error('Unable to load payment links');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPaymentLinks();
    return () => { isMounted = false; };
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    success('Payment link created successfully');
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Links</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage links to accept crypto payments.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Payment Link
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] bg-brand-surface border-border/50">
            <DialogHeader>
              <DialogTitle>Create Payment Link</DialogTitle>
              <DialogDescription>
                Generate a reusable link or QR code to accept payments.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input id="label" placeholder="e.g. Consulting Retainer" className="bg-background/50 border-border/50 focus-visible:ring-brand-accent" required />
              </div>

              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select defaultValue="open">
                  <SelectTrigger className="bg-background/50 border-border/50 focus:ring-brand-accent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Customer decides amount</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <CurrencySelector value={currency} onValueChange={setCurrency} />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit">Create Link</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? null : paymentLinks.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No payment links yet"
          description="Create your first payment link to start accepting crypto payments."
          action={{ label: 'New Payment Link', onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paymentLinks.map((link) => {
            const paymentUrl = link.url || `/pay/${link.id}`;
            return (
            <Card key={link.id} className="bg-brand-surface border-border/50 shadow-sm hover:border-brand-accent/50 transition-colors group">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-medium text-brand-text-primary line-clamp-1">{link.label}</CardTitle>
                  <CardDescription className="mt-1">
                    {link.type === 'fixed' ? `${link.amount} ${link.currency}` : 'Open amount'}
                    <span className="hidden sm:inline"> · Created {link.createdAt || link.created || 'Unknown'}</span>
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground -mt-2 -mr-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{link.clicks ?? 0} clicks</span>
                  <span>{link.converted ?? 0} conversions</span>
                </div>
                <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:items-center">
                  <div className="flex-1 overflow-hidden min-w-0">
                    <div className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-full bg-muted/50 p-2 rounded border border-border/50 font-mono">
                      {paymentUrl}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CopyAddress address={paymentUrl} showIconOnly truncate={false} />
                    <Link href={`/pay/${link.id}`} aria-label={`Open ${link.label}`}>
                      <Button variant="outline" size="icon" className="h-8 w-8 border-border/50 bg-background/50 text-muted-foreground hover:text-brand-text-primary">
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-border/50 bg-background/50 text-muted-foreground hover:text-brand-text-primary">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
