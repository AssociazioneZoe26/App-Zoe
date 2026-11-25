import { isPastEndDate } from "../lib/coursePeriod";

export type MemberPassEntry = {
  index: number;
  used: boolean;
};

export type MemberPassPlan = "course" | "pack" | "monthly";

export type MemberPass = {
  id: string;
  memberEmail: string;
  memberName: string;
  activitySlug: string;
  activityTitle: string;
  previewImage?: string;
  activationId?: string;
  productId?: string;
  entries: MemberPassEntry[];
  /** Presente per corsi a quota fissa */
  amountPaid?: number;
  paymentChannel?: "sede" | "online";
  passKind?: "entries" | "course";
  /** pack = 4/8 ingressi; monthly = abbonamento 30 giorni; course = corso */
  plan?: MemberPassPlan;
  /** Inizio validità (per abbonamento mensile o corso) */
  startsAt?: string;
  /** Fine corso, YYYY-MM-DD o timestamp */
  endsAt?: string;
  participantId?: string | null;
  participantName?: string | null;
  /** Manca sugli pass vecchi: si considerano attivi. */
  status?: "active" | "expired";
  updatedAt: string;
};

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function resolvePassPlan(pass: MemberPass): MemberPassPlan | "none" {
  if (pass.passKind === "course" || pass.plan === "course") return "course";
  if (pass.plan === "monthly") return "monthly";
  if (pass.plan === "pack") return "pack";
  const total = pass.entries.length;
  if (total === 4 || total === 8 || total === 5 || total === 10) return "pack";
  return "none";
}

/** Pacchetto 4/8 esaurito, mensile oltre i 30 giorni, oppure corso dopo la data di fine. */
export function isPassAccessExpired(pass: MemberPass): boolean {
  const plan = resolvePassPlan(pass);
  if (plan === "none") return false;
  if (plan === "course") return isPastEndDate(pass.endsAt);
  if (plan === "pack") {
    const total = pass.entries.length;
    if (total !== 4 && total !== 8) return false;
    return pass.entries.length > 0 && pass.entries.every((entry) => entry.used);
  }
  // monthly
  const start = Date.parse(pass.startsAt || pass.updatedAt);
  if (!Number.isFinite(start)) return false;
  return Date.now() >= start + MONTH_MS;
}

/** Rinnova solo a scadenza (pacchetto esaurito / mensile scaduto). Mai sui corsi. */
export function canRenewPass(pass: MemberPass): boolean {
  const plan = resolvePassPlan(pass);
  if (plan === "course" || plan === "none") return false;
  return isPassAccessExpired(pass);
}

export function monthlyRenewAvailableAt(pass: MemberPass): Date | null {
  if (resolvePassPlan(pass) !== "monthly") return null;
  const start = Date.parse(pass.startsAt || pass.updatedAt);
  if (!Number.isFinite(start)) return null;
  return new Date(start + MONTH_MS);
}

const STORAGE_KEY = "zoe-member-passes";

function readPassesRaw(): MemberPass[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MemberPass[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePasses(passes: MemberPass[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passes));
}

/** Pacchetti validi: solo 4 o 8 ingressi. 5→4, 10/11→8. */
export function canonicalPackSize(total: number): 4 | 8 {
  return total <= 5 ? 4 : 8;
}

export function isEntryPackPass(pass: MemberPass) {
  if (pass.passKind === "course" || pass.plan === "course" || pass.plan === "monthly") {
    return false;
  }
  return pass.entries.length >= 2;
}

function snapPackPass(pass: MemberPass): MemberPass {
  if (!isEntryPackPass(pass)) return pass;
  const size = canonicalPackSize(pass.entries.length);
  if (pass.entries.length === size) {
    return pass.plan === "pack" ? pass : { ...pass, plan: "pack" };
  }
  const used = pass.entries.filter((entry) => entry.used).length;
  return {
    ...pass,
    plan: "pack",
    entries: makeEntries(size, Math.min(used, size)),
    updatedAt: new Date().toISOString(),
  };
}

/** Allinea i pacchetti locali a 4 o 8 ingressi. Restituisce gli id modificati. */
export function normalizeStoredPacks() {
  const raw = readPassesRaw();
  const changedIds: string[] = [];
  const next = raw.map((pass) => {
    const snapped = snapPackPass(pass);
    if (snapped.entries.length !== pass.entries.length) changedIds.push(snapped.id);
    return snapped;
  });
  if (changedIds.length > 0) writePasses(next);
  return { passes: next, changedIds };
}

function makeEntries(total: number, usedCount = 0): MemberPassEntry[] {
  const safeTotal = Math.max(1, total);
  const used = Math.min(Math.max(0, usedCount), safeTotal);
  return Array.from({ length: safeTotal }, (_, index) => ({
    index,
    used: index < used,
  }));
}

/** Una nuova attivazione non deve azzerare gli ingressi già segnati come usati. */
function entriesForUpdate(
  previous: MemberPassEntry[] | undefined,
  total: number,
  usedCount = 0,
): MemberPassEntry[] {
  if (!previous || previous.length === 0) {
    const size = total >= 2 ? canonicalPackSize(total) : Math.max(1, total);
    return makeEntries(size, usedCount);
  }
  const safeTotal = total >= 2 || previous.length >= 2 ? canonicalPackSize(total || previous.length) : Math.max(1, total);
  return Array.from({ length: safeTotal }, (_, index) => ({
    index,
    used: previous.some((entry) => entry.index === index && entry.used),
  }));
}

export function listPasses(): MemberPass[] {
  normalizeStoredPacks();
  return readPassesRaw().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getPassesForMember(email: string) {
  const normalized = email.trim().toLowerCase();
  return listPasses().filter((pass) => pass.memberEmail.toLowerCase() === normalized);
}

export function getPass(id: string) {
  return listPasses().find((pass) => pass.id === id);
}

export type PassFromActivationInput = {
  activationId: string;
  productId: string;
  memberEmail: string;
  memberName: string;
  activitySlug: string;
  activityTitle: string;
  entriesTotal: number;
  entriesUsed?: number;
  amountPaid?: number;
  paymentChannel?: "sede" | "online";
  passKind?: "entries" | "course";
  plan?: MemberPassPlan;
  startsAt?: string;
  endsAt?: string;
  participantId?: string | null;
  participantName?: string | null;
};

function normalizePassTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\d+\s*[–-]\s*\d+\s*anni/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function passMatchKey(pass: Pick<MemberPass, "memberEmail" | "activitySlug" | "activityTitle">) {
  const email = pass.memberEmail.trim().toLowerCase();
  const slug = pass.activitySlug.trim().toLowerCase();
  const title = normalizePassTitle(pass.activityTitle);
  // Unifica solo le varianti del laboratorio LEGO (non altri corsi LEGO).
  if (
    slug.includes("laboratori-lego") ||
    (title.includes("laborator") && title.includes("lego"))
  ) {
    return `${email}::laboratorio-lego`;
  }
  return `${email}::${slug}::${title}`;
}

export function upsertPassFromActivation(input: PassFromActivationInput) {
  const passes = readPassesRaw();
  const email = input.memberEmail.trim().toLowerCase();
  const incomingKey = passMatchKey({
    memberEmail: email,
    activitySlug: input.activitySlug,
    activityTitle: input.activityTitle,
  });
  const existingIndex = passes.findIndex(
    (pass) =>
      pass.activationId === input.activationId ||
      (pass.productId === input.productId && pass.memberEmail.toLowerCase() === email) ||
      passMatchKey(pass) === incomingKey,
  );

  const passKind = input.passKind ?? "entries";
  const previous = existingIndex >= 0 ? passes[existingIndex] : null;
  const inferredPlan: MemberPassPlan =
    input.plan ||
    (passKind === "course"
      ? "course"
      : input.entriesTotal === 4 ||
          input.entriesTotal === 8 ||
          input.entriesTotal === 5 ||
          input.entriesTotal === 10
        ? "pack"
        : previous?.plan === "monthly"
          ? "monthly"
          : "pack");
  const next: MemberPass = {
    id: previous?.id || `pass_${input.activationId}`,
    memberEmail: email,
    memberName: input.memberName.trim(),
    activitySlug: input.activitySlug,
    activityTitle: input.activityTitle,
    activationId: input.activationId,
    productId: input.productId,
    passKind,
    plan: inferredPlan,
    startsAt: input.startsAt || previous?.startsAt || new Date().toISOString(),
    endsAt: input.endsAt || previous?.endsAt,
    participantId: input.participantId ?? previous?.participantId ?? null,
    participantName: input.participantName ?? previous?.participantName ?? null,
    amountPaid: input.amountPaid,
    paymentChannel: input.paymentChannel,
    status: "active",
    entries:
      passKind === "course" || inferredPlan === "monthly"
        ? []
        : entriesForUpdate(previous?.entries, input.entriesTotal, input.entriesUsed ?? 0),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    passes[existingIndex] = next;
  } else {
    passes.unshift(next);
  }
  writePasses(passes);
  dedupeMemberPasses();
  return next;
}

/** Un solo pass per socio + attività (evita doppioni LEGO / attivazioni). */
export function dedupeMemberPasses() {
  const passes = readPassesRaw();
  const byKey = new Map<string, MemberPass>();

  for (const pass of passes) {
    const key = passMatchKey(pass);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, pass);
      continue;
    }

    const rank = (item: MemberPass) =>
      item.status === "active" ? 2 : item.status === "expired" ? 0 : 1;
    const preferPass =
      rank(pass) > rank(current) ||
      (rank(pass) === rank(current) &&
        ((Boolean(pass.activationId) && !current.activationId) ||
          (Boolean(pass.activationId) === Boolean(current.activationId) &&
            pass.updatedAt >= current.updatedAt)));

    const keeper = preferPass ? pass : current;
    const other = preferPass ? current : pass;
    const status =
      pass.status === "active" || current.status === "active"
        ? "active"
        : pass.status === "expired" || current.status === "expired"
          ? "expired"
          : keeper.status;
    const usedFromOther = other.entries.filter((entry) => entry.used).length;
    const usedFromKeeper = keeper.entries.filter((entry) => entry.used).length;

    byKey.set(key, {
      ...keeper,
      entries:
        keeper.passKind === "course"
          ? []
          : usedFromOther > usedFromKeeper && other.entries.length === keeper.entries.length
            ? other.entries
            : keeper.entries,
      amountPaid: keeper.amountPaid ?? other.amountPaid,
      paymentChannel: keeper.paymentChannel ?? other.paymentChannel,
      productId: keeper.productId ?? other.productId,
      activationId: keeper.activationId ?? other.activationId,
      status,
    });
  }

  writePasses([...byKey.values()]);
}

export function setPassEntryUsed(passId: string, entryIndex: number, used: boolean) {
  const passes = readPassesRaw();
  const index = passes.findIndex((pass) => pass.id === passId);
  if (index === -1) return;
  const pass = passes[index];
  const entries = pass.entries.map((entry) =>
    entry.index === entryIndex ? { ...entry, used } : entry,
  );
  passes[index] = {
    ...pass,
    entries,
    updatedAt: new Date().toISOString(),
  };
  writePasses(passes);
}

/** Aggiunge un ingresso disponibile al pacchetto. */
export function addPassEntry(passId: string) {
  const passes = readPassesRaw();
  const index = passes.findIndex((pass) => pass.id === passId);
  if (index === -1) return null;
  const pass = passes[index];
  if (pass.passKind === "course") return null;
  const nextIndex = pass.entries.length;
  const entries = [...pass.entries, { index: nextIndex, used: false }];
  const next = {
    ...pass,
    entries,
    updatedAt: new Date().toISOString(),
  };
  passes[index] = next;
  writePasses(passes);
  return next;
}

async function mirrorPassToActivation(passId: string) {
  const pass = getPass(passId);
  if (!pass?.activationId) return;
  const counts = passCounts(pass);
  const { setActivationEntriesTotal } = await import("../admin/catalogStore");
  setActivationEntriesTotal(pass.activationId, counts.purchased, counts.used);
}

/** Spunta ingresso in sede e aggiorna subito Supabase (visibile da telefono). */
export async function setPassEntryUsedAndSync(
  passId: string,
  entryIndex: number,
  used: boolean,
) {
  setPassEntryUsed(passId, entryIndex, used);
  await mirrorPassToActivation(passId);
  const { syncMemberPassEntriesToSupabase } = await import("../lib/cloudSync");
  return syncMemberPassEntriesToSupabase(passId);
}

export async function addPassEntryAndSync(passId: string) {
  const next = addPassEntry(passId);
  if (!next) return { ok: false as const, error: "pass_not_found" };
  await mirrorPassToActivation(passId);
  const { syncMemberPassEntriesToSupabase } = await import("../lib/cloudSync");
  return syncMemberPassEntriesToSupabase(passId);
}

/** Importa i pacchetti ingressi da Supabase nella cache locale (admin Ingressi). */
export function upsertPassFromRemote(input: {
  remoteId: string;
  memberEmail: string;
  memberName: string;
  activitySlug: string;
  activityTitle: string;
  productId?: string;
  entriesTotal: number;
  entriesUsed: number;
  updatedAt?: string;
}) {
  const passes = readPassesRaw();
  const email = input.memberEmail.trim().toLowerCase();
  const incomingKey = passMatchKey({
    memberEmail: email,
    activitySlug: input.activitySlug,
    activityTitle: input.activityTitle,
  });
  const existingIndex = passes.findIndex(
    (pass) =>
      pass.id === `remote_pack_${input.remoteId}` ||
      passMatchKey(pass) === incomingKey ||
      (pass.productId &&
        input.productId &&
        pass.productId === input.productId &&
        pass.memberEmail.toLowerCase() === email),
  );
  const previous = existingIndex >= 0 ? passes[existingIndex] : null;
  const remoteUsed = Math.max(0, input.entriesUsed);
  const previousLen = previous?.entries.length ?? 0;
  const packLike =
    previous?.plan === "pack" ||
    previousLen >= 2 ||
    input.entriesTotal >= 2;
  const total = packLike
    ? canonicalPackSize(input.entriesTotal || previousLen || 4)
    : Math.max(1, input.entriesTotal);
  const used = Math.min(
    total,
    Math.max(remoteUsed, previous?.entries.filter((entry) => entry.used).length ?? 0),
  );
  const next: MemberPass = {
    id: previous?.id || `remote_pack_${input.remoteId}`,
    memberEmail: email,
    memberName: input.memberName.trim() || previous?.memberName || email,
    activitySlug: input.activitySlug,
    activityTitle: input.activityTitle,
    activationId: previous?.activationId,
    productId: input.productId || previous?.productId,
    passKind: "entries",
    plan: packLike ? "pack" : previous?.plan,
    paymentChannel: previous?.paymentChannel ?? "sede",
    status: "active",
    entries: makeEntries(total, used),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
  if (existingIndex >= 0) passes[existingIndex] = next;
  else passes.unshift(next);
  writePasses(passes);
  return next;
}

export function removePassesForProduct(productId: string, activitySlug?: string) {
  const slug = activitySlug?.trim().toLowerCase();
  writePasses(
    readPassesRaw().filter((pass) => {
      if (pass.productId === productId) return false;
      if (slug && pass.activitySlug.trim().toLowerCase() === slug) return false;
      return true;
    }),
  );
}

export function removePassByActivationId(activationId: string) {
  writePasses(readPassesRaw().filter((pass) => pass.activationId !== activationId));
}

export function updatePassesForProduct(
  productId: string,
  patch: { activitySlug: string; activityTitle: string },
) {
  const passes = readPassesRaw();
  let changed = false;
  const next = passes.map((pass) => {
    if (pass.productId !== productId) return pass;
    if (pass.activitySlug === patch.activitySlug && pass.activityTitle === patch.activityTitle) {
      return pass;
    }
    changed = true;
    return {
      ...pass,
      activitySlug: patch.activitySlug,
      activityTitle: patch.activityTitle,
      updatedAt: new Date().toISOString(),
    };
  });
  if (changed) writePasses(next);
}

export function reconcilePassActivationStatus(
  activations: {
    id: string;
    status: "active" | "expired";
    productId?: string;
    memberEmail?: string;
  }[],
) {
  const byId = new Map(activations.map((activation) => [activation.id, activation]));
  const activeMemberProducts = new Set(
    activations
      .filter((activation) => activation.status === "active" && activation.productId)
      .map(
        (activation) =>
          `${activation.productId}::${activation.memberEmail?.trim().toLowerCase() ?? ""}`,
      ),
  );

  const passes = readPassesRaw();
  let changed = false;
  const next = passes.map((pass) => {
    if (!pass.activationId) return pass;
    const linked = byId.get(pass.activationId);
    const memberProductActive = pass.productId
      ? activeMemberProducts.has(
          `${pass.productId}::${pass.memberEmail.trim().toLowerCase()}`,
        )
      : false;
    const status: "active" | "expired" =
      linked?.status === "active" || memberProductActive ? "active" : "expired";
    if ((pass.status ?? "active") === status) return pass;
    changed = true;
    return { ...pass, status, updatedAt: new Date().toISOString() };
  });
  if (changed) writePasses(next);
}

export function passCounts(pass: MemberPass) {
  const purchased = pass.entries.length;
  const used = pass.entries.filter((entry) => entry.used).length;
  return { purchased, used, left: purchased - used };
}

