"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  CreditCard,
  RefreshCcw,
  Plus,
  Copy,
  ExternalLink,
  TrendingUp,
  Zap,
  ChevronRight,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const RevenueChart = dynamic(() => import('@/components/charts/RevenueChart'), {
  ssr: false,
  loading: () => <div className="h-[260px] bg-slate-50 animate-pulse rounded-xl w-full" />
});
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';



const mockTransactions = [
  { id: 'tx_01', label: 'Consulting Retainer', address: 'GBX1...3F9A', amount: 750, status: 'completed', time: '2m ago' },
  { id: 'tx_02', label: 'E-commerce Payment', address: 'GDR2...7K1B', amount: 45.5, status: 'completed', time: '18m ago' },
  { id: 'tx_03', label: 'Invoice #1042', address: 'GBN3...2P8C', amount: 1200, status: 'pending', time: '1h ago' },
  { id: 'tx_04', label: 'Subscription Fee', address: 'GCH4...9M4D', amount: 29, status: 'completed', time: '3h ago' },
  { id: 'tx_05', label: 'Freelance Project', address: 'GDX5...1N5E', amount: 3500, status: 'failed', time: '5h ago' },
];

const mockPaymentLinks = [
  { id: 'link_01', label: 'Consulting Retainer Q3', url: 'betta.pay/pay/link_01', clicks: 24, converted: 8 },
  { id: 'link_02', label: 'E-commerce Checkout', url: 'betta.pay/pay/link_02', clicks: 112, converted: 47 },
  { id: 'link_03', label: 'Donation Campaign', url: 'betta.pay/pay/link_03', clicks: 58, converted: 19 },
];

const PERIOD_OPTIONS = ['7D', '30D', '90D'] as const;
type Period = typeof PERIOD_OPTIONS[number];



export default function DashboardPage() {
  const { user } = useAuthStore();
  const [activePeriod, setActivePeriod] = useState<Period>('7D');

  const firstName = user?.name?.split(' ')[0] ?? 'Merchant';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-8 pb-8">

      {/* ── Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-1">
            Merchant Dashboard
          </p>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">
            Good day, {firstName} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Here&apos;s what&apos;s happening with your BettaPay account today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/payments">
            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl h-10 px-4 text-sm shadow-sm shadow-amber-200 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              New Payment Link
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Volume (30d)
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Activity className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-900">
              <CurrencyDisplay amount={45231.89} />
            </div>
            <p className="text-xs text-emerald-600 flex items-center mt-1.5 font-medium">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Payment Links
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-900">12</div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              +3 new links this week
            </p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Available to Settle
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-900">
              <CurrencyDisplay amount={12450.00} />
            </div>
            <p className="text-xs text-amber-500 flex items-center mt-1.5 font-medium">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              Pending NGN conversion
            </p>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Current FX Rate
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <RefreshCcw className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-900">₦1,550</div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              per USDC · Updated 5m ago
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts + Recent Transactions ── */}
      <div className="grid gap-6 lg:grid-cols-7">

        {/* Revenue Chart */}
        <Card className="lg:col-span-4 border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Revenue Over Time</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">USDC received to your merchant wallet</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-semibold transition-all',
                      activePeriod === p
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <RevenueChart height={260} />
            {/* Summary row */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 mt-2">
              <div>
                <p className="text-xs text-slate-400">Peak day</p>
                <p className="text-sm font-semibold text-slate-900">Saturday · $4,100</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Weekly avg</p>
                <p className="text-sm font-semibold text-slate-900">$2,714</p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +18.4% WoW
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-3 border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Recent Activity</CardTitle>
              <Link href="/transactions">
                <Button variant="ghost" className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 px-2 rounded-lg font-semibold">
                  View all <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {mockTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                    <Zap className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{tx.label}</p>
                    <p className="text-xs text-slate-400 font-mono">{tx.address} · {tx.time}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={cn(
                      'text-sm font-semibold',
                      tx.status === 'failed' ? 'text-red-500' : 'text-emerald-600'
                    )}>
                      {tx.status === 'failed' ? '-' : '+'}<CurrencyDisplay amount={tx.amount} showDecimals={false} />
                    </span>
                    <StatusBadge status={tx.status as 'completed' | 'pending' | 'failed'} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row: Quick Actions + Payment Link Performance ── */}
      <div className="grid gap-6 lg:grid-cols-7">

        {/* Quick Actions */}
        <Card className="lg:col-span-3 border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 grid grid-cols-2 gap-3">
            {[
              { label: 'Create Payment Link', icon: Plus, href: '/payments', color: 'amber' },
              { label: 'View Transactions', icon: BarChart3, href: '/transactions', color: 'blue' },
              { label: 'Settle Funds', icon: Wallet, href: '/settlement', color: 'emerald' },
              { label: 'Check FX Rate', icon: RefreshCcw, href: '/fx', color: 'purple' },
            ].map(({ label, icon: Icon, href, color }) => (
              <Link key={href} href={href}>
                <div className={cn(
                  'flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm',
                  color === 'amber' && 'border-amber-200 bg-amber-50 hover:bg-amber-100',
                  color === 'blue' && 'border-blue-200 bg-blue-50 hover:bg-blue-100',
                  color === 'emerald' && 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
                  color === 'purple' && 'border-purple-200 bg-purple-50 hover:bg-purple-100',
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    color === 'amber' && 'text-amber-600',
                    color === 'blue' && 'text-blue-600',
                    color === 'emerald' && 'text-emerald-600',
                    color === 'purple' && 'text-purple-600',
                  )} />
                  <p className="text-xs font-semibold text-slate-700 leading-tight">{label}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Payment Link Performance */}
        <Card className="lg:col-span-4 border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Payment Link Performance</CardTitle>
              <Link href="/payments">
                <Button variant="ghost" className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 px-2 rounded-lg font-semibold">
                  Manage <ArrowRight className="w-3 h-3 ml-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {mockPaymentLinks.map((link) => {
                const conversionRate = Math.round((link.converted / link.clicks) * 100);
                return (
                  <div key={link.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{link.label}</p>
                      <p className="text-xs text-slate-400 font-mono truncate">{link.url}</p>
                      {/* Conversion bar */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${conversionRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{conversionRate}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-sm font-bold text-slate-900">{link.converted}</span>
                      <span className="text-xs text-slate-400">{link.clicks} clicks</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleCopy(`https://${link.url}`)}>
                        <Copy className="w-3 h-3 text-slate-400" />
                      </Button>
                      <Link href={`https://${link.url}`} target="_blank">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
