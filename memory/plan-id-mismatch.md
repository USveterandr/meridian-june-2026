---
name: plan-id-mismatch
description: Production D1 plan IDs differ from the Stripe checkout price map in code
metadata:
  type: project
---

The production D1 `plans` table is seeded with plan IDs: **`free`, `pro`, `brokerage`, `enterprise`, `investor`** (names Explorer/Professional/Brokerage/Enterprise/Investor; monthly 0/97/299/599/199).

But the Stripe checkout code in `api/src/routes/plans.ts` (`STRIPE_PRICE_IDS`) and the `/seed` handler expect IDs **`free`, `team`, `professional`, `enterprise`**.

Consequence: once plans render, picking `pro`/`brokerage`/`investor` and choosing **Stripe** checkout hits `STRIPE_PRICE_IDS[planId] === undefined` → "No Stripe price configured." The PayPal `/activate` trial flow is not affected.

To resolve before Stripe checkout is production-ready: reconcile the IDs (either reseed prod plans to match the code, or update `STRIPE_PRICE_IDS` + seed to the live `pro/brokerage/investor` set) and create real Stripe prices per plan (monthly + annual). See [[deployment-topology]].
