# Mock Data Notes

These files in this directory are mock API responses used to support UI development and local testing.

## What this directory is for

- The files under this folder simulate backend data for dashboard, transactions, settlements, wallet, payment links, FX, and developer-related views.
- They are intended for frontend development when the real API is unavailable, slow, or not yet wired up.
- Mock data should help contributors build and review UI flows without requiring a live backend.

## When to use the mocks

Use these mocks as a fallback when:

- the backend service is down or unreachable,
- a feature is being built before API integration is ready,
- you need predictable sample data for demos, screenshots, or local testing.

## How to add new mock data

1. Create a new file in this directory with a descriptive name, for example `orders.ts`.
2. Export one or more data objects or arrays that match the shape expected by the UI.
3. Keep the data realistic and consistent with the existing mock style.
4. Import the new mock from the relevant feature module or fallback layer.

## Contract for replacing mocks with real API data

When the backend becomes available, the UI should be able to swap from mock data to real API data without changing the feature contract.

Follow these rules:

- Keep the same data shape and field names expected by the component.
- Preserve the same response structure used by the UI layer (for example, arrays, objects, pagination fields, and status values).
- Treat the mock as a temporary stand-in, not as the final source of truth.
- Replace the mock import or fallback logic with the real API fetch/update flow once the backend contract is confirmed.

In short, mocks should be easy to recognize, easy to replace, and easy to evolve into real API integrations.
