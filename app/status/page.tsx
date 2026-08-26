"use client";

import { useMemo } from "react";

import { Header, Footer } from "@/components/layout";
import { OverallBanner } from "@/components/status/OverallBanner";
import { ComponentStatusGrid } from "@/components/status/ComponentStatus";
import { IncidentTimeline } from "@/components/status/IncidentTimeline";
import { SubscribeForm } from "@/components/status/SubscribeForm";
import {
  getComponents,
  getIncidents,
  getOverallStatus,
} from "@/lib/status/data";
import { useNow } from "@/lib/hooks/useNow";

export default function StatusPage() {
  // `useNow` seeds from a minute-floored clock so the server render and the
  // first client render agree, then ticks. Incident timestamps are derived
  // from it, which is what keeps "resolved 2 minutes ago" honest.
  const now = useNow();
  const components = useMemo(() => getComponents(now), [now]);
  const incidents = useMemo(() => getIncidents(now), [now]);
  const overall = getOverallStatus(components);

  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              System Status
            </h1>
            <p className="text-muted-foreground">
              Real-time monitoring and incident history for all BettaPay
              services.
            </p>
          </div>

          <OverallBanner status={overall.level} label={overall.label} />

          <section aria-labelledby="components-heading">
            <h2
              id="components-heading"
              className="text-lg font-semibold text-foreground mb-4"
            >
              Services
            </h2>
            <ComponentStatusGrid components={components} />
          </section>

          <section aria-labelledby="incidents-heading">
            <h2
              id="incidents-heading"
              className="text-lg font-semibold text-foreground mb-4"
            >
              Incident History
            </h2>
            <IncidentTimeline incidents={incidents} />
          </section>

          <section aria-labelledby="subscribe-heading" className="space-y-3">
            <h2
              id="subscribe-heading"
              className="text-lg font-semibold text-foreground"
            >
              Subscribe to Updates
            </h2>
            <SubscribeForm />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
