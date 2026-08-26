import { stableNow } from "./time";

export type ComponentStatusLevel = "operational" | "degraded" | "down";

export interface StatusComponent {
  id: string;
  name: string;
  status: ComponentStatusLevel;
  uptimePercent: number;
  /** ISO 8601 timestamp, or null when the component has never had an incident. */
  lastIncident: string | null;
}

export interface IncidentUpdate {
  status: "investigating" | "identified" | "monitoring" | "resolved";
  message: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
}

export interface Incident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  affectedComponents: string[];
  updates: IncidentUpdate[];
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp, or null while the incident is still open. */
  resolvedAt: string | null;
}

// ─── Seed data ───────────────────────────────────────────────────────────────
//
// Timestamps are stored as *offsets* rather than literal ISO strings. A fixed
// string ages badly: an incident authored as "resolved 2 minutes ago" still
// claimed to be 2 minutes old months later. Offsets are resolved against a
// caller-supplied `now`, so the page's freshness claims stay true and the
// relative labels keep advancing.

const MINUTE = 60_000;

interface IncidentUpdateSeed {
  status: IncidentUpdate["status"];
  message: string;
  /** Minutes before `now` that this update was posted. */
  minutesAgo: number;
}

interface IncidentSeed {
  id: string;
  title: string;
  status: Incident["status"];
  affectedComponents: string[];
  updates: IncidentUpdateSeed[];
}

interface ComponentSeed {
  id: string;
  name: string;
  status: ComponentStatusLevel;
  uptimePercent: number;
  /** Minutes before `now` of the last incident, or null if there was none. */
  lastIncidentMinutesAgo: number | null;
}

/** Resolve an offset in minutes into a real ISO 8601 timestamp. */
function isoMinutesAgo(now: number, minutesAgo: number): string {
  return new Date(now - minutesAgo * MINUTE).toISOString();
}

const componentSeeds: ComponentSeed[] = [
  {
    id: "api",
    name: "Payment API",
    status: "operational",
    uptimePercent: 99.98,
    lastIncidentMinutesAgo: null,
  },
  {
    id: "dashboard",
    name: "Merchant Dashboard",
    status: "operational",
    uptimePercent: 99.95,
    lastIncidentMinutesAgo: 18 * 24 * 60,
  },
  {
    id: "payments",
    name: "Payment Processing",
    status: "operational",
    uptimePercent: 99.99,
    lastIncidentMinutesAgo: null,
  },
  {
    id: "settlements",
    name: "Fiat Settlements",
    status: "degraded",
    uptimePercent: 99.12,
    lastIncidentMinutesAgo: 95,
  },
  {
    id: "fx-engine",
    name: "FX Engine",
    status: "operational",
    uptimePercent: 99.97,
    lastIncidentMinutesAgo: null,
  },
  {
    id: "indexer",
    name: "Stellar Indexer",
    status: "operational",
    uptimePercent: 100.0,
    lastIncidentMinutesAgo: null,
  },
];

const incidentSeeds: IncidentSeed[] = [
  {
    id: "inc_001",
    title: "Fiat Settlement Delay — Nigerian Naira Payouts",
    status: "identified",
    affectedComponents: ["settlements"],
    updates: [
      {
        status: "investigating",
        message:
          "We are receiving reports of delayed fiat settlements for Naira payouts. Our team is investigating the issue with our anchor partner.",
        minutesAgo: 95,
      },
      {
        status: "identified",
        message:
          "The issue has been identified as a connectivity problem with the SEP-24 anchor. We are working with our partner to restore service.",
        minutesAgo: 50,
      },
    ],
  },
  {
    id: "inc_002",
    title: "Dashboard Login — Intermittent 502 Errors",
    status: "resolved",
    affectedComponents: ["dashboard"],
    updates: [
      {
        status: "investigating",
        message:
          "Some merchants are experiencing intermittent 502 errors when logging in to the dashboard.",
        minutesAgo: 18 * 24 * 60,
      },
      {
        status: "identified",
        message:
          "A misconfigured load balancer rule was causing intermittent failures. Fix has been deployed.",
        minutesAgo: 18 * 24 * 60 - 45,
      },
      {
        status: "monitoring",
        message: "The fix has been deployed and we are monitoring for stability.",
        minutesAgo: 18 * 24 * 60 - 60,
      },
      {
        status: "resolved",
        message: "The issue has been resolved. All systems are operating normally.",
        minutesAgo: 18 * 24 * 60 - 80,
      },
    ],
  },
  {
    id: "inc_003",
    title: "Payment API — Elevated Error Rates",
    status: "resolved",
    affectedComponents: ["api", "payments"],
    updates: [
      {
        status: "investigating",
        message:
          "We are observing elevated error rates on the Payment API endpoints. Some payment requests may fail.",
        minutesAgo: 30 * 24 * 60,
      },
      {
        status: "identified",
        message:
          "A database connection pool exhaustion was causing timeouts. Pool size has been increased.",
        minutesAgo: 30 * 24 * 60 - 30,
      },
      {
        status: "resolved",
        message:
          "The issue has been resolved. Error rates have returned to normal levels.",
        minutesAgo: 30 * 24 * 60 - 90,
      },
    ],
  },
];

// ─── Resolvers ───────────────────────────────────────────────────────────────

/** Component list with `lastIncident` resolved to real ISO timestamps. */
export function getComponents(now: number = stableNow()): StatusComponent[] {
  return componentSeeds.map(({ lastIncidentMinutesAgo, ...component }) => ({
    ...component,
    lastIncident:
      lastIncidentMinutesAgo === null ? null : isoMinutesAgo(now, lastIncidentMinutesAgo),
  }));
}

/**
 * Incident list with every timestamp resolved against `now`. `createdAt` is the
 * first update and `resolvedAt` the resolving update, so the three can never
 * disagree with one another.
 */
export function getIncidents(now: number = stableNow()): Incident[] {
  return incidentSeeds.map((seed) => {
    const updates: IncidentUpdate[] = seed.updates.map(({ minutesAgo, ...update }) => ({
      ...update,
      timestamp: isoMinutesAgo(now, minutesAgo),
    }));

    const resolving = updates.find((update) => update.status === "resolved");

    return {
      id: seed.id,
      title: seed.title,
      status: seed.status,
      affectedComponents: seed.affectedComponents,
      updates,
      createdAt: updates[0].timestamp,
      resolvedAt: resolving?.timestamp ?? null,
    };
  });
}

/** Display name for a component id, falling back to the id itself. */
export function getComponentName(id: string): string {
  return componentSeeds.find((component) => component.id === id)?.name ?? id;
}

export function getOverallStatus(
  components: StatusComponent[]
): { level: ComponentStatusLevel; label: string } {
  const hasDown = components.some((c) => c.status === "down");
  const hasDegraded = components.some((c) => c.status === "degraded");

  if (hasDown) {
    return { level: "down", label: "Major Outage" };
  }
  if (hasDegraded) {
    return { level: "degraded", label: "Partial Outage" };
  }
  return { level: "operational", label: "All Systems Operational" };
}
