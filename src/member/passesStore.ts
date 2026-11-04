export type MemberPassEntry = {
  index: number;
  used: boolean;
};

export type MemberPass = {
  id: string;
  memberEmail: string;
  memberName: string;
  activitySlug: string;
  activityTitle: string;
  activationId?: string;
  productId?: string;
  entries: MemberPassEntry[];
  /** Presente per corsi a quota fissa */
  amountPaid?: number;
  paymentChannel?: "sede" | "online";
  passKind?: "entries" | "course";
  updatedAt: string;
};

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

function makeEntries(total: number, usedCount = 0): MemberPassEntry[] {
  const safeTotal = Math.max(1, total);
  const used = Math.min(Math.max(0, usedCount), safeTotal);
  return Array.from({ length: safeTotal }, (_, index) => ({
    index,
    used: index < used,
  }));
}

export function listPasses(): MemberPass[] {
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
  const next: MemberPass = {
    id: previous?.id || `pass_${input.activationId}`,
    memberEmail: email,
    memberName: input.memberName.trim(),
    activitySlug: input.activitySlug,
    activityTitle: input.activityTitle,
    activationId: input.activationId,
    productId: input.productId,
    passKind,
    amountPaid: input.amountPaid,
    paymentChannel: input.paymentChannel,
    entries:
      passKind === "course"
        ? []
        : previous && previous.entries.length === input.entriesTotal
          ? previous.entries
          : makeEntries(input.entriesTotal, input.entriesUsed ?? 0),
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

    const preferPass =
      (Boolean(pass.activationId) && !current.activationId) ||
      (Boolean(pass.activationId) === Boolean(current.activationId) &&
        pass.updatedAt >= current.updatedAt);

    const keeper = preferPass ? pass : current;
    const other = preferPass ? current : pass;
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

export function passCounts(pass: MemberPass) {
  const purchased = pass.entries.length;
  const used = pass.entries.filter((entry) => entry.used).length;
  return { purchased, used, left: purchased - used };
}

