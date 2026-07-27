import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { useOfflineStore } from '@/lib/store/offlineStore';

// Control the browser-detected connectivity that feeds the store.
let mockOnline = false;
jest.mock('@/lib/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnline,
}));

function renderBanner() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const utils = render(
    <QueryClientProvider client={client}>
      <OfflineBanner />
    </QueryClientProvider>
  );
  return { client, ...utils };
}

const bannerText = () => screen.queryByText(/you are offline/i);

beforeEach(() => {
  mockOnline = false;
  act(() => {
    useOfflineStore.setState({ isOnline: true, dismissed: false });
  });
});

describe('OfflineBanner', () => {
  it('reflects useOfflineStore connectivity state', () => {
    renderBanner();
    // Store transitioned to offline on mount -> banner visible.
    expect(bannerText()).toBeInTheDocument();

    act(() => {
      useOfflineStore.getState().setIsOnline(true);
    });
    // Back online per the store -> banner hidden.
    expect(bannerText()).not.toBeInTheDocument();
  });

  it('is dismissible and reappears on the next offline transition', () => {
    renderBanner();
    expect(bannerText()).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /dismiss offline notification/i })
    );
    expect(bannerText()).not.toBeInTheDocument();

    // Reconnect, then drop offline again: dismissal must reset so the banner
    // comes back instead of staying hidden forever.
    act(() => {
      useOfflineStore.getState().setIsOnline(true);
    });
    act(() => {
      useOfflineStore.getState().setIsOnline(false);
    });
    expect(bannerText()).toBeInTheDocument();
  });

  it('re-fetches failed data when Retry is clicked', () => {
    const { client } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(client.refetchQueries).toHaveBeenCalled();
  });
});
