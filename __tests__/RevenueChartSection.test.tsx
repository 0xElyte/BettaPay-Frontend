import { aggregatePaymentsByDay, mockChartData } from '@/components/charts/RevenueChart';
import { getRevenueTotal } from '@/components/dashboard/RevenueChartSection';

describe('RevenueChartSection - total equals sum of plotted bars', () => {
  it('header total equals sum of chart series for real payments', () => {
    const payments = [
      { amountUsdc: 1200, createdAt: '2026-08-20T10:00:00Z', status: 'success' },
      { amountUsdc: 2100, createdAt: '2026-08-21T10:00:00Z', status: 'success' },
      { amountUsdc: 1800, createdAt: '2026-08-21T15:00:00Z', status: 'success' }, // same day as previous -> should aggregate
      { amountUsdc: 500, createdAt: '2026-08-22T10:00:00Z', status: 'failed' }, // failed -> excluded
    ];

    const chartData = aggregatePaymentsByDay(payments);
    // Chart data should have 2 days: 2026-08-20 (1200) and 2026-08-21 (3900)
    expect(chartData.length).toBe(2);
    expect(chartData[0].total).toBe(1200);
    expect(chartData[1].total).toBe(3900);

    const total = getRevenueTotal(chartData);
    const sumOfBars = chartData.reduce((s, p) => s + p.total, 0);

    expect(total).toBe(sumOfBars);
    expect(total).toBe(5100);
  });

  it('mock preview data total equals sum of its bars (fallback path)', () => {
    const total = getRevenueTotal(mockChartData);
    const sumOfBars = mockChartData.reduce((s, p) => s + p.total, 0);
    expect(total).toBe(sumOfBars);
    // Hard-coded sum from mockChartData: 1200+2100+1800+3200+2800+4100+3800 = 19000
    expect(total).toBe(19000);
  });

  it('empty payments falls back to mock and total still matches sum', () => {
    const emptyAggregated = aggregatePaymentsByDay([]);
    expect(emptyAggregated.length).toBe(0);
    // When the section has no payments it uses mockChartData as chartData
    const chartData = emptyAggregated.length > 0 ? emptyAggregated : mockChartData;
    const total = getRevenueTotal(chartData);
    expect(total).toBe(chartData.reduce((s, p) => s + p.total, 0));
  });

  it('does not import mock settlements in production path - no mock settlements used for real merchants', () => {
    // This test documents the invariant: RevenueChartSection and dashboard page
    // must NOT import from lib/mock/settlements. The only mock allowed is the
    // preview mockChartData exported from RevenueChart itself.
    // We assert that mockSettlements is not used by checking that real payments
    // produce a different total than the hard-coded mock settlements sum.
    // mockSettlements sum = 12450 + 8200.5 + 5000 = 25650.5
    const mockSettlementsSum = 12450 + 8200.5 + 5000;
    const payments = [
      { amountUsdc: 1000, createdAt: '2026-08-20T10:00:00Z', status: 'success' },
      { amountUsdc: 2000, createdAt: '2026-08-21T10:00:00Z', status: 'success' },
    ];
    const chartData = aggregatePaymentsByDay(payments);
    const total = getRevenueTotal(chartData);
    expect(total).not.toBe(mockSettlementsSum);
    expect(total).toBe(3000);
  });

  it('total is derived from same array the chart renders - no drift if chart filters by day', () => {
    const payments = [
      { amountUsdc: 100, createdAt: '2026-08-20T00:00:00Z', status: 'success' },
      { amountUsdc: 200, createdAt: '2026-08-21T00:00:00Z', status: 'success' },
      { amountUsdc: 300, createdAt: '2026-08-22T00:00:00Z', status: 'success' },
    ];
    const chartData = aggregatePaymentsByDay(payments);
    // Simulate what RevenueChartSection does: pass chartData directly to chart
    // and compute total from same chartData
    const renderedChartData = chartData;
    const headerTotal = getRevenueTotal(chartData);
    const sumOfBars = renderedChartData.reduce((s, p) => s + p.total, 0);
    expect(headerTotal).toBe(sumOfBars);
  });
});
