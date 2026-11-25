import { getProduct, listActivations } from "../admin/catalogStore";
import { inferProductOffer } from "../admin/catalogTypes";
import {
  dedupeMemberPasses,
  reconcilePassActivationStatus,
  upsertPassFromActivation,
} from "./passesStore";

/** Crea/aggiorna i pass socio dai prodotti attivati da Team Zoe. */
export function syncMemberPassesFromActivations() {
  const activations = listActivations();
  const active = activations
    .filter((activation) => activation.status === "active")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const activation of active) {
    const product = getProduct(activation.productId);
    if (!product) continue;
    const offer = inferProductOffer(product);
    const isCourse = offer === "course";
    const plan = isCourse
      ? ("course" as const)
      : offer === "monthly" || activation.plan === "monthly"
        ? ("monthly" as const)
        : ("pack" as const);
    upsertPassFromActivation({
      activationId: activation.id,
      productId: product.id,
      memberEmail: activation.memberEmail,
      memberName: activation.memberName,
      activitySlug: product.slug,
      activityTitle: product.title,
      entriesTotal: isCourse || plan === "monthly" ? 1 : activation.entriesTotal,
      entriesUsed: activation.entriesUsed,
      amountPaid: activation.amountPaid ?? product.priceCourse,
      paymentChannel: activation.paymentChannel,
      passKind: isCourse ? "course" : "entries",
      plan,
      startsAt: activation.createdAt,
    });
  }

  reconcilePassActivationStatus(activations);
  dedupeMemberPasses();
}
