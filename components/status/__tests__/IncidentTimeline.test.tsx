import { act, render, screen } from '@testing-library/react';

import { getIncidents } from '@/lib/status/data';
import { IncidentTimeline } from '../IncidentTimeline';

/**
 * The regression this guards: incident times used to be fixed strings, so an
 * incident labelled "2 minutes ago" was still labelled that months later. The
 * label must now be derived from a real timestamp and advance on its own.
 */

const NOW = Date.parse('2026-08-25T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('IncidentTimeline relative times', () => {
  it('advances the relative label as time passes', () => {
    render(<IncidentTimeline incidents={getIncidents(NOW)} />);

    // The open incident's latest update is 50 minutes old at render time.
    expect(screen.getAllByText('50 minutes ago').length).toBeGreaterThan(0);

    // Ten minutes later, without a reload, the same timestamp reads differently.
    // advanceTimersByTime moves the fake clock as well as the timers.
    act(() => {
      jest.advanceTimersByTime(10 * 60_000);
    });

    expect(screen.queryByText('50 minutes ago')).not.toBeInTheDocument();
    expect(screen.getAllByText('1 hour ago').length).toBeGreaterThan(0);
  });

  it('ticks within a single minute boundary', () => {
    render(<IncidentTimeline incidents={getIncidents(NOW)} />);
    expect(screen.getAllByText('50 minutes ago').length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getAllByText('51 minutes ago').length).toBeGreaterThan(0);
  });

  it('renders a machine-readable timestamp alongside the label', () => {
    const incidents = getIncidents(NOW);
    render(<IncidentTimeline incidents={incidents} />);

    const stamp = incidents[0].updates[0].timestamp;
    const times = document.querySelectorAll(`time[datetime="${stamp}"]`);
    expect(times.length).toBeGreaterThan(0);
  });

  it('says "time unknown" rather than inventing a time', () => {
    const [incident] = getIncidents(NOW);
    const broken = {
      ...incident,
      resolvedAt: null,
      updates: [{ ...incident.updates[0], timestamp: '' }],
    };

    render(<IncidentTimeline incidents={[broken]} />);
    expect(screen.getAllByText('time unknown').length).toBeGreaterThan(0);
  });
});
