import Stripe from "stripe";

export const FREE_MONTHLY_LIMIT = 5;

export const PLANS = {
  free: { name: "Free", assessmentsPerMonth: FREE_MONTHLY_LIMIT, price: 0 },
  pro: { name: "Pro", assessmentsPerMonth: Infinity, price: 9 },
} as const;

// Lazy-initialised so the module can be imported in tests without a real key.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return _stripe;
}

// Convenience re-export used by the webhook and checkout routes.
export { _stripe as stripe };
