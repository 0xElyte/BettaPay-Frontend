import React from 'react';
import { render, screen } from '@testing-library/react';
import ClicksChart from '@/components/charts/ClicksChart';
import FxRateChart from '@/components/charts/FxRateChart';
import PlatformVolumeChart from '@/components/charts/PlatformVolumeChart';
import RevenueChart from '@/components/charts/RevenueChart';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

// Mock recharts responsive container to render in jsdom
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container">{children}</div>
    ),
  };
});

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Charts Accessibility (Issue #568)', () => {
  describe('ClicksChart', () => {
    const mockData = [
      { date: '2025-01-01', clicks: 12 },
      { date: '2025-01-02', clicks: 25 },
    ];

    it('renders accessible container region and data table for screen readers', () => {
      render(<ClicksChart data={mockData} />);

      const region = screen.getByRole('region', { name: /payment link clicks chart/i });
      expect(region).toBeInTheDocument();

      const table = screen.getByRole('table', { name: /payment link clicks data table/i });
      expect(table).toBeInTheDocument();
      expect(table).toHaveClass('sr-only');

      expect(screen.getByText('2025-01-01')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('2025-01-02')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  describe('FxRateChart', () => {
    const mockData = [
      { date: 'Jan 7', rate: 1480 },
      { date: 'Jan 8', rate: 1495 },
    ];

    it('renders accessible region and screen-reader data table', () => {
      render(<FxRateChart data={mockData} />);

      const region = screen.getByRole('region', { name: /usdc to ngn exchange rate chart/i });
      expect(region).toBeInTheDocument();

      const table = screen.getByRole('table', { name: /usdc to ngn exchange rate data table/i });
      expect(table).toBeInTheDocument();
      expect(table).toHaveClass('sr-only');

      expect(screen.getByText('Jan 7')).toBeInTheDocument();
      expect(screen.getByText('₦1,480')).toBeInTheDocument();
    });
  });

  describe('PlatformVolumeChart', () => {
    it('renders screen-reader table and accessible region when data is loaded', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          { name: 'Jan', volume: 50000, fee: 500 },
          { name: 'Feb', volume: 75000, fee: 750 },
        ],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <PlatformVolumeChart />
        </QueryClientProvider>
      );

      const table = await screen.findByRole('table', {
        name: /platform volume and fees data table/i,
      });
      expect(table).toBeInTheDocument();
      expect(table).toHaveClass('sr-only');
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('$500')).toBeInTheDocument();
    });
  });

  describe('RevenueChart', () => {
    const mockPoints = [
      { name: 'Mon', total: 1200, volume: 1200 },
      { name: 'Tue', total: 2100, volume: 3300 },
    ];

    it('renders accessible region and screen-reader data table', () => {
      render(<RevenueChart data={mockPoints} />);

      const region = screen.getByRole('region', { name: /revenue and volume chart/i });
      expect(region).toBeInTheDocument();

      const table = screen.getByRole('table', { name: /revenue and volume data table/i });
      expect(table).toBeInTheDocument();
      expect(table).toHaveClass('sr-only');

      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getAllByText('$1,200').length).toBeGreaterThanOrEqual(1);
    });
  });
});
