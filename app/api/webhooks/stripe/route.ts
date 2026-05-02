import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { upsertUserSubscription } from "@/lib/persistence";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || session.mode !== "subscription") break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;

      let periodEnd: Date | null = null;
      if (subscriptionId) {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        periodEnd = new Date(sub.current_period_end * 1000);
      }

      await upsertUserSubscription({
        userId,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : undefined,
        stripeSubscriptionId: subscriptionId ?? undefined,
        plan: "pro",
        status: "active",
        currentPeriodEnd: periodEnd,
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      const isActive = sub.status === "active" || sub.status === "trialing";
      await upsertUserSubscription({
        userId,
        stripeSubscriptionId: sub.id,
        plan: isActive ? "pro" : "free",
        status: isActive ? "active" : (sub.status === "canceled" ? "canceled" : "past_due"),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await upsertUserSubscription({
        userId,
        plan: "free",
        status: "canceled",
        currentPeriodEnd: null,
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
