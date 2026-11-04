import { getProduct, listActivations } from "../admin/catalogStore";
import { dedupeMemberPasses, upsertPassFromActivation } from "./passesStore";

/** Crea/aggiorna i pass socio dai prodotti attivati da Team Zoe. */
export function syncMemberPassesFromActivations() {
  const activations = listActivations().filter((activation) => activation.status === "active");

  for (const activation of activations) {
    const product = getProduct(activation.productId);
    if (!product) continue;
    const isCourse = product.kind === "corso" || product.kind === "online";
    upsertPassFromActivation({
      activationId: activation.id,
      productId: product.id,
      memberEmail: activation.memberEmail,
      memberName: activation.memberName,
      activitySlug: product.slug,
      activityTitle: product.title,
      entriesTotal: isCourse ? 1 : activation.entriesTotal,
      entriesUsed: activation.entriesUsed,
      amountPaid: activation.amountPaid ?? product.priceCourse,
      paymentChannel: activation.paymentChannel,
      passKind: isCourse ? "course" : "entries",
    });
  }

  dedupeMemberPasses();
}
