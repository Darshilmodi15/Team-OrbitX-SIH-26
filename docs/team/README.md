# Six-person delivery plan

These briefs are intended to be given directly to each teammate or their coding assistant. They contain outcomes, ownership, interfaces, acceptance and handoff requirements. They are proposed assignments, not messages sent to teammates.

| Owner | Responsibility | Brief |
|---|---|---|
| Darshil Modi | PFZ publication integration and merge coordination | [Darshil](darshil.md) |
| Pavan | Marine forecast and observation providers | [Pavan](pavan.md) |
| Heth | Location selection and access flow | [Heth](heth.md) |
| Harpal | Maps, layers and geographic sources | [Harpal](harpal.md) |
| Prachi | Shared Redis cache and offline trip pack | [Prachi](prachi.md) |
| Rajvi | Assistant UX, onboarding and beta verification | [Rajvi](rajvi.md) |

Sequence: Darshil closes the PFZ evidence contract first; Pavan closes marine-field contracts next; Heth/Harpal integrate location and maps against those contracts; Prachi integrates shared cache and trip-pack manifests; Rajvi verifies the completed flows and release candidate. Teammates can investigate and develop isolated branches concurrently, but integrate and accept one milestone at a time. Agree shared-file changes before merging. See [review and human setup](../BETA_REVIEW.md) for current blockers and [phase ledger](../PHASES.md) for progress.
