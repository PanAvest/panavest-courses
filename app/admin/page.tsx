"use client";

type UserAction = "ban" | "unban" | "revoke" | "clear-history" | "delete";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModernDatePicker from "@/components/ModernDatePicker";

/* ─────────────────────────────── Types ─────────────────────────────── */
type Knowledge = {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  level?: string | null;
  price?: number | null; // GH₵
  cpd_points?: number | null;
  img?: string | null;
  accredited?: string[] | null;
  published?: boolean | null;
  coming_soon?: boolean | null;
  delivery_mode?: "slides" | "interactive";
  interactive_path?: string | null;
  free_for_logged_in?: boolean | null;
};
type AdminUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  created_at?: string | null;
  banned?: boolean | null;
  full_name?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  highest_education?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  certificates?: Array<{ id: string; certificate_no: string | null; course_title: string | null }>;
};
type Chapter = {
  id?: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at?: string | null;
};
type Slide = {
  id?: string;
  chapter_id: string;
  title: string;
  order_index: number;
  intro_video_url?: string | null;
  asset_url?: string | null;
  body?: string | null;
  created_at?: string | null;
};
type QuizSettings = {
  chapter_id: string;
  time_limit_seconds: number | null;
  num_questions: number | null;
};
type QuizQuestion = {
  id?: string;
  chapter_id: string;
  question: string;
  options: string[];
  correct_index: number;
  created_at?: string | null;
};
type Ebook = {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  sample_url?: string | null;
  kpf_url?: string | null;
  price_cents: number; // GHS minor units (pesewas)
  published: boolean;
  free_for_logged_in?: boolean;
  sku?: string | null;
  stock_quantity?: number | null;
  show_stock?: boolean | null;
  physical_price_cents?: number | null;
  created_at?: string | null;
};
type FinalExam = {
  id?: string;
  course_id: string;
  title: string;
  pass_mark: number; // %
  time_limit_minutes?: number | null;
  num_questions?: number | null;
  created_at?: string | null;
};
type FinalExamQuestion = {
  id?: string;
  exam_id: string;
  prompt: string;
  options: string[];
  correct_index: number;
  created_at?: string | null;
};
type Bundle = {
  id?: string;
  course_id: string;
  ebook_id: string;
  active: boolean;
  course_title?: string;
  course_slug?: string;
  ebook_title?: string;
  ebook_slug?: string;
};
type PurchaseRow = {
  id: string;
  kind: "course" | "ebook";
  item_id: string;
  item_title: string;
  user_id: string;
  user_email?: string | null;
  amount_minor: number | null;
  currency: string | null;
  status: string | null;
  is_paid: boolean;
  provider: string | null;
  reference: string | null;
  paid_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  effective_at: string | null;
};
type PurchaseRange = "all" | "week" | "month" | "quarter" | "year" | "custom";
type PurchaseStatusFilter = "all" | "paid" | "pending" | "failed";
type PhysicalOrder = {
  id: string;
  order_ref: string;
  ebook_id: string | null;
  ebook_slug: string | null;
  ebook_title: string | null;
  customer_name: string;
  email: string;
  phone: string;
  quantity: number;
  fulfillment: "delivery" | "pickup";
  region: string | null;
  city: string | null;
  street: string | null;
  unit_price_cents: number;
  subtotal_cents: number;
  voucher_code: string | null;
  discount_cents: number;
  total_cents: number;
  status: "new" | "processing" | "fulfilled" | "cancelled";
  notes: string | null;
  created_at: string | null;
};
type Voucher = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  active: boolean;
  max_uses: number | null;
  used_count: number;
  min_subtotal_cents: number;
  expires_at: string | null;
  created_at: string | null;
};
type GlossaryEntry = {
  term: string;
  definition: string;
  synonyms?: string;
  tags?: string;
  pos?: string;
  pronunciation?: string;
  examples?: string;
};
type PapaParse = {
  parse: (input: string, options: { header: boolean; skipEmptyLines: boolean }) => {
    data: Record<string, unknown>[];
  };
  unparse: (data: GlossaryEntry[]) => string;
};

const defaultGlossaryEntry: GlossaryEntry = {
  term: "",
  definition: "",
  synonyms: "",
  tags: "",
  pos: "",
  pronunciation: "",
  examples: "",
};

/* ───────────────────────────── Utilities ───────────────────────────── */
const isStr = (x: unknown): x is string => typeof x === "string";
const num = (x: unknown, d = 0): number => {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
};
const toCsv = (v: string[] | null | undefined) => (v ?? []).join(", ");
const fromCsv = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const readGlossaryField = (row: Record<string, unknown>, key: string): string => {
  const value = row[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};
const formatMoney = (minor: number | null | undefined, currency?: string | null): string => {
  if (typeof minor !== "number" || !Number.isFinite(minor)) return "—";
  const code = (currency || "GHS").toUpperCase();
  return `${code} ${(minor / 100).toFixed(2)}`;
};
const parseIsoDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};
const formatDateTime = (value: string | null | undefined): string => {
  const d = parseIsoDate(value);
  return d ? d.toLocaleString() : "—";
};
const pickPurchaseTime = (p: PurchaseRow): string | null =>
  p.effective_at ?? p.paid_at ?? p.updated_at ?? p.created_at ?? null;
const getRangeBounds = (range: PurchaseRange, start: string, end: string) => {
  if (range === "all") return { start: null as Date | null, end: null as Date | null };
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  if (range === "week") {
    const day = now.getDay();
    const diff = (day + 6) % 7; // Monday start
    startDate = new Date(now);
    startDate.setDate(now.getDate() - diff);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
  } else if (range === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), q * 3, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), q * 3 + 3, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (range === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31);
    endDate.setHours(23, 59, 59, 999);
  } else if (range === "custom") {
    startDate = start ? new Date(`${start}T00:00:00`) : null;
    endDate = end ? new Date(`${end}T23:59:59`) : null;
  }
  if (startDate && Number.isNaN(startDate.getTime())) startDate = null;
  if (endDate && Number.isNaN(endDate.getTime())) endDate = null;
  return { start: startDate, end: endDate };
};
const adminTabs = ["catalog", "content", "prices", "media", "users", "purchases", "orders", "vouchers", "deploy", "ai"] as const;
type AdminTab = (typeof adminTabs)[number];
const adminTabLabels: Record<AdminTab, string> = {
  catalog: "Catalog",
  content: "Content",
  prices: "Prices",
  media: "Media",
  users: "Users",
  purchases: "Purchases",
  orders: "Orders",
  vouchers: "Vouchers",
  deploy: "Deploy",
  ai: "AI Admin",
};

/* Adapters (safe parsing) */
function asAdminUser(x: unknown): AdminUser {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return {
    id: String(r["id"] ?? ""),
    email: isStr(r["email"]) ? r["email"] : undefined,
    email_confirmed_at: isStr(r["email_confirmed_at"])
      ? r["email_confirmed_at"]
      : null,
    created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    banned: typeof r["banned"] === "boolean" ? r["banned"] : null,
    full_name: isStr(r["full_name"]) ? r["full_name"] : null,
    age: typeof r["age"] === "number" ? (r["age"] as number) : null,
    date_of_birth: isStr(r["date_of_birth"]) ? r["date_of_birth"] : null,
    highest_education: isStr(r["highest_education"]) ? r["highest_education"] : null,
    country_code: isStr(r["country_code"]) ? r["country_code"] : null,
    country_name: isStr(r["country_name"]) ? r["country_name"] : null,
    certificates: Array.isArray(r["certificates"])
      ? (r["certificates"] as Array<Record<string, unknown>>).map((c) => ({
          id: String(c["id"] ?? ""),
          certificate_no: isStr(c["certificate_no"]) ? c["certificate_no"] : null,
          course_title: isStr(c["course_title"]) ? c["course_title"] : null,
        }))
      : [],
  };
}
function asKnowledgeArray(x: unknown): Knowledge[] {
  if (!Array.isArray(x)) return [];
  return x.map((k) => {
    const r = (k && typeof k === "object" ? k : {}) as Record<string, unknown>;
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      slug: String(r["slug"] ?? ""),
      title: String(r["title"] ?? ""),
      description: isStr(r["description"]) ? r["description"] : null,
      level: isStr(r["level"]) ? r["level"] : null,
      price: typeof r["price"] === "number" ? r["price"] : null,
      cpd_points: typeof r["cpd_points"] === "number" ? r["cpd_points"] : null,
      img: isStr(r["img"]) ? r["img"] : null,
      accredited: Array.isArray(r["accredited"])
        ? (r["accredited"] as string[])
        : null,
      published: typeof r["published"] === "boolean" ? r["published"] : null,
      coming_soon: typeof r["coming_soon"] === "boolean" ? r["coming_soon"] : null,
      delivery_mode: r["delivery_mode"] === "interactive" ? "interactive" : "slides",
      interactive_path: isStr(r["interactive_path"]) ? r["interactive_path"] : null,
      free_for_logged_in:
        typeof r["free_for_logged_in"] === "boolean" ? r["free_for_logged_in"] : false,
    };
  });
}
function asChapters(x: unknown): Chapter[] {
  if (!Array.isArray(x)) return [];
  return x.map((c) => {
    const r = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      course_id: String(r["course_id"] ?? ""),
      title: String(r["title"] ?? ""),
      order_index: Number(r["order_index"] ?? 0),
      created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    };
  });
}
function asSlides(x: unknown): Slide[] {
  if (!Array.isArray(x)) return [];
  return x.map((s) => {
    const r = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      chapter_id: String(r["chapter_id"] ?? ""),
      title: String(r["title"] ?? ""),
      order_index: Number(r["order_index"] ?? 0),
      intro_video_url: isStr(r["intro_video_url"])
        ? r["intro_video_url"]
        : null,
      asset_url: isStr(r["asset_url"]) ? r["asset_url"] : null,
      body: isStr(r["body"]) ? r["body"] : null,
      created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    };
  });
}
function asBundles(x: unknown): Bundle[] {
  if (!Array.isArray(x)) return [];
  return x.map((b) => {
    const r = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
    const course = r["courses"] && typeof r["courses"] === "object" ? (r["courses"] as Record<string, unknown>) : {};
    const ebook = r["ebooks"] && typeof r["ebooks"] === "object" ? (r["ebooks"] as Record<string, unknown>) : {};
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      course_id: String(r["course_id"] ?? ""),
      ebook_id: String(r["ebook_id"] ?? ""),
      active: typeof r["active"] === "boolean" ? r["active"] : true,
      course_title: isStr(course["title"]) ? course["title"] : undefined,
      course_slug: isStr(course["slug"]) ? course["slug"] : undefined,
      ebook_title: isStr(ebook["title"]) ? ebook["title"] : undefined,
      ebook_slug: isStr(ebook["slug"]) ? ebook["slug"] : undefined,
    };
  });
}
function asQuizSettings(x: unknown, chapterId: string): QuizSettings {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return {
    chapter_id: chapterId,
    time_limit_seconds:
      typeof r["time_limit_seconds"] === "number"
        ? r["time_limit_seconds"]
        : null,
    num_questions:
      typeof r["num_questions"] === "number" ? r["num_questions"] : null,
  };
}
function asQuizQuestions(x: unknown): QuizQuestion[] {
  if (!Array.isArray(x)) return [];
  return x.map((q) => {
    const r = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
    const opts = Array.isArray(r["options"])
      ? (r["options"] as unknown[]).map(String)
      : [];
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      chapter_id: String(r["chapter_id"] ?? ""),
      question: String(r["question"] ?? ""),
      options: opts,
      correct_index: Number(r["correct_index"] ?? 0),
      created_at: isStr(r["created_at"]) ? r["created_at"] : undefined,
    };
  });
}
function asEbooks(x: unknown): Ebook[] {
  if (!Array.isArray(x)) return [];
  return x.map((e) => {
    const r = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      slug: String(r["slug"] ?? ""),
      title: String(r["title"] ?? ""),
      description: isStr(r["description"]) ? r["description"] : "",
      cover_url: isStr(r["cover_url"]) ? r["cover_url"] : "",
      sample_url: isStr(r["sample_url"]) ? r["sample_url"] : "",
      kpf_url: isStr(r["kpf_url"]) ? r["kpf_url"] : "",
      price_cents: num(r["price_cents"], 0),
      published: Boolean(r["published"] ?? true),
      free_for_logged_in: Boolean(r["free_for_logged_in"] ?? false),
      sku: isStr(r["sku"]) ? r["sku"] : "",
      stock_quantity: typeof r["stock_quantity"] === "number" ? (r["stock_quantity"] as number) : 0,
      show_stock: Boolean(r["show_stock"] ?? false),
      physical_price_cents:
        typeof r["physical_price_cents"] === "number" ? (r["physical_price_cents"] as number) : null,
      created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    };
  });
}
function asPurchaseRows(x: unknown): PurchaseRow[] {
  if (!Array.isArray(x)) return [];
  return x.map((row) => {
    const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const kind = r["kind"] === "ebook" ? "ebook" : "course";
    const amountRaw = r["amount_minor"];
    const amountParsed =
      typeof amountRaw === "number"
        ? amountRaw
        : isStr(amountRaw)
          ? Number(amountRaw)
          : null;
    const amount_minor =
      typeof amountParsed === "number" && Number.isFinite(amountParsed) ? amountParsed : null;
    return {
      id: String(r["id"] ?? ""),
      kind,
      item_id: String(r["item_id"] ?? ""),
      item_title: String(r["item_title"] ?? r["item_id"] ?? ""),
      user_id: String(r["user_id"] ?? ""),
      user_email: isStr(r["user_email"]) ? r["user_email"] : null,
      amount_minor,
      currency: isStr(r["currency"]) ? r["currency"] : null,
      status: isStr(r["status"]) ? r["status"] : null,
      is_paid: typeof r["is_paid"] === "boolean" ? r["is_paid"] : Boolean(r["is_paid"]),
      provider: isStr(r["provider"]) ? r["provider"] : null,
      reference: isStr(r["reference"]) ? r["reference"] : null,
      paid_at: isStr(r["paid_at"]) ? r["paid_at"] : null,
      updated_at: isStr(r["updated_at"]) ? r["updated_at"] : null,
      created_at: isStr(r["created_at"]) ? r["created_at"] : null,
      effective_at: isStr(r["effective_at"]) ? r["effective_at"] : null,
    };
  });
}
function asFinalExam(x: unknown, course_id: string): FinalExam | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  return {
    id: isStr(r["id"]) ? r["id"] : undefined,
    course_id,
    title: String(r["title"] ?? "Final Exam"),
    pass_mark: num(r["pass_mark"], 50),
    time_limit_minutes:
      typeof r["time_limit_minutes"] === "number"
        ? r["time_limit_minutes"]
        : null,
    num_questions:
      typeof r["num_questions"] === "number" && Number.isFinite(r["num_questions"])
        ? Math.max(1, Math.floor(Number(r["num_questions"])))
        : null,
    created_at: isStr(r["created_at"]) ? r["created_at"] : null,
  };
}
function asFinalExamQuestions(x: unknown): FinalExamQuestion[] {
  if (!Array.isArray(x)) return [];
  return x.map((q) => {
    const r = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
    const opts = Array.isArray(r["options"])
      ? (r["options"] as unknown[]).map(String)
      : [];
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      exam_id: String(r["exam_id"] ?? ""),
      prompt: String(r["prompt"] ?? r["question"] ?? ""),
      options: opts,
      correct_index: Number(r["correct_index"] ?? 0),
      created_at: isStr(r["created_at"]) ? r["created_at"] : undefined,
    };
  });
}

/* ───────────────────────────── UI Helpers ─────────────────────────── */
function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white border border-[color:var(--color-light)]/40 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AiGlossaryAdmin() {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<GlossaryEntry>({ ...defaultGlossaryEntry });
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const papaRef = useRef<PapaParse | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = entries.map((entry, index) => ({ entry, index }));
    return q ? rows.filter(({ entry }) => entry.term.toLowerCase().includes(q)) : rows;
  }, [entries, query]);

  const loadPapa = useCallback(
    () =>
      new Promise<PapaParse>((resolve, reject) => {
        if (papaRef.current) return resolve(papaRef.current);
        const existing = (window as Window & { Papa?: PapaParse }).Papa;
        if (existing) {
          papaRef.current = existing;
          return resolve(existing);
        }
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js";
        script.async = true;
        script.onload = () => {
          const loaded = (window as Window & { Papa?: PapaParse }).Papa;
          if (!loaded) return reject(new Error("PapaParse failed to load"));
          papaRef.current = loaded;
          resolve(loaded);
        };
        script.onerror = () => reject(new Error("PapaParse failed to load"));
        document.head.appendChild(script);
      }),
    [],
  );

  const loadCsv = useCallback(async () => {
    setLoading(true);
    setStatus("Loading CSV...");
    try {
      const Papa = await loadPapa();
      const sources = ["/scmpedia_full_UPDATED.csv", "/scmpedia_full.csv"];
      let csv = "";
      for (const src of sources) {
        const res = await fetch(`${src}?v=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) continue;
        csv = await res.text();
        if (csv) break;
      }
      if (!csv) throw new Error("CSV not found.");
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      const rows = Array.isArray(parsed.data) ? parsed.data : [];
      const data = rows
        .map((row) => {
          const term = (readGlossaryField(row, "term") || readGlossaryField(row, "Term")).trim();
          const definition = (
            readGlossaryField(row, "definition") || readGlossaryField(row, "Definition")
          ).trim();
          return {
            term,
            definition,
            synonyms: readGlossaryField(row, "synonyms") || readGlossaryField(row, "Synonyms"),
            tags: readGlossaryField(row, "tags") || readGlossaryField(row, "Tags"),
            pos: readGlossaryField(row, "pos") || readGlossaryField(row, "Pos"),
            pronunciation:
              readGlossaryField(row, "pronunciation") || readGlossaryField(row, "Pronunciation"),
            examples: readGlossaryField(row, "examples") || readGlossaryField(row, "Examples"),
          };
        })
        .filter((entry) => entry.term && entry.definition);
      setEntries(data);
      setSelectedIndex(null);
      setDraft({ ...defaultGlossaryEntry });
      setDirty(false);
      setStatus(`Loaded ${data.length} terms`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load CSV");
    } finally {
      setLoading(false);
    }
  }, [loadPapa]);

  useEffect(() => {
    void loadCsv();
  }, [loadCsv]);

  const handleSelect = (entry: GlossaryEntry, index: number) => {
    setSelectedIndex(index);
    setDraft({ ...entry });
  };

  const handleNew = () => {
    setSelectedIndex(null);
    setDraft({ ...defaultGlossaryEntry });
  };

  const handleSave = () => {
    if (!draft.term.trim() || !draft.definition.trim()) {
      setStatus("Term and definition are required.");
      return;
    }
    setEntries((prev) => {
      const next = [...prev];
      if (selectedIndex === null) {
        next.unshift({ ...draft });
      } else {
        next[selectedIndex] = { ...draft };
      }
      return next;
    });
    setDirty(true);
    setStatus("Changes saved locally. Download CSV to apply.");
  };

  const handleDownload = useCallback(async () => {
    setStatus("Preparing CSV...");
    try {
      const Papa = await loadPapa();
      const csv = Papa.unparse(entries);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "scmpedia_full_UPDATED.csv";
      link.click();
      URL.revokeObjectURL(url);
      setDirty(false);
      setStatus("CSV downloaded.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to export CSV");
    }
  }, [entries, loadPapa]);

  const statusLabel = dirty ? "Unsaved changes · Download CSV to apply." : status;

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">SCM AI Glossary</h2>
          <p className="text-sm text-slate-500">
            Manage glossary terms and export a new CSV for deployment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadCsv}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 bg-white text-sm shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Reload CSV"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || entries.length === 0}
            className="px-3 py-1.5 rounded-lg bg-[#0a1156] text-white text-sm shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500">{statusLabel}</div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <Section title="Entries">
          <input
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search terms..."
            className="h-10 w-full rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
          />
          <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto">
            {filtered.map(({ entry, index }) => (
              <button
                key={`${entry.term}-${index}`}
                type="button"
                onClick={() => handleSelect(entry, index)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 ${
                  selectedIndex === index
                    ? "bg-[color:var(--color-light)]/50 text-slate-900 font-semibold"
                    : "bg-[color:var(--color-light)]/20 hover:bg-[color:var(--color-light)]/40"
                }`}
              >
                {entry.term}
              </button>
            ))}
            {filtered.length === 0 && <div className="text-xs text-slate-500">No matching terms.</div>}
          </div>
        </Section>

        <Section title="Editor">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Term</span>
              <input
                value={draft.term}
                onChange={(e) => setDraft({ ...draft, term: (e.target as HTMLInputElement).value })}
                className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Part of Speech</span>
              <input
                value={draft.pos ?? ""}
                onChange={(e) => setDraft({ ...draft, pos: (e.target as HTMLInputElement).value })}
                className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs text-slate-500">Definition</span>
              <textarea
                value={draft.definition}
                onChange={(e) =>
                  setDraft({ ...draft, definition: (e.target as HTMLTextAreaElement).value })
                }
                className="min-h-[110px] rounded-lg bg-white px-3 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Pronunciation</span>
              <input
                value={draft.pronunciation ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, pronunciation: (e.target as HTMLInputElement).value })
                }
                className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Synonyms</span>
              <input
                value={draft.synonyms ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, synonyms: (e.target as HTMLInputElement).value })
                }
                className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs text-slate-500">Tags</span>
              <input
                value={draft.tags ?? ""}
                onChange={(e) => setDraft({ ...draft, tags: (e.target as HTMLInputElement).value })}
                className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs text-slate-500">Example</span>
              <textarea
                value={draft.examples ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, examples: (e.target as HTMLTextAreaElement).value })
                }
                className="min-h-[96px] rounded-lg bg-white px-3 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleNew}
              className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 bg-white text-sm shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
            >
              New Entry
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg bg-[#0a1156] text-white text-sm shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
            >
              Save Entry
            </button>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Changes are local until you download the CSV and replace{" "}
            <code>public/scmpedia_full_UPDATED.csv</code> (or <code>public/scmpedia_full.csv</code>) in the repo.
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ───────────────────────────── Component ──────────────────────────── */
export default function AdminPage() {
  /* Tabs (Overview removed) */
  const [tab, setTab] = useState<AdminTab>("catalog");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("tab");
    if (value && adminTabs.includes(value as AdminTab)) {
      setTab(value as AdminTab);
    }
  }, []);

  /* ── Catalog (Courses + Ebooks) ── */
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [kForm, setKForm] = useState<Knowledge>({
    slug: "",
    title: "",
    description: "",
    level: "",
    price: null,
    cpd_points: null,
    img: "",
    accredited: [],
    published: true,
    coming_soon: false,
    delivery_mode: "slides",
    interactive_path: "",
    free_for_logged_in: false,
  });
  const [savingK, setSavingK] = useState(false);

  const refreshKnowledgeAbort = useRef<AbortController | null>(null);
  const refreshKnowledge = useCallback(async () => {
    refreshKnowledgeAbort.current?.abort();
    const ac = new AbortController();
    refreshKnowledgeAbort.current = ac;
    try {
      const r = await fetch("/api/admin/knowledge", {
        cache: "no-store",
        signal: ac.signal,
      });
      const d = await r.json();
      if (!r.ok) {
        console.error("refresh knowledge failed", d);
        return;
      }
      setKnowledge(asKnowledgeArray(d));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("refresh knowledge failed", err);
    }
  }, []);
  useEffect(() => {
    if (tab === "catalog" || tab === "content" || tab === "prices")
      void refreshKnowledge();
  }, [tab, refreshKnowledge]);

  async function saveKnowledge() {
    setSavingK(true);
    const payload: Knowledge = {
      ...kForm,
      accredited: fromCsv(toCsv(kForm.accredited ?? [])),
      interactive_path: kForm.interactive_path?.trim() || null,
    };
    const r = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingK(false);
    if (!r.ok) return alert("Save failed");
    setKForm({
      slug: "",
      title: "",
      description: "",
      level: "",
      price: null,
      cpd_points: null,
      img: "",
      accredited: [],
      published: true,
      coming_soon: false,
      delivery_mode: "slides",
      interactive_path: "",
      free_for_logged_in: false,
    });
    await refreshKnowledge();
  }

  async function deleteCourse(id?: string) {
    if (!id) return;
    if (!confirm("Delete this course and its content?")) return;
    const r = await fetch(`/api/admin/knowledge/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    if (selectedCourseId === id) {
      setSelectedCourseId("");
      resetContentState();
    }
    await refreshKnowledge();
  }

  /* ── Content Builder (Course → Chapter → Slide → Quiz) ── */
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const selectedCourse = useMemo(
    () => knowledge.find((k) => (k.id ?? "") === selectedCourseId) ?? null,
    [knowledge, selectedCourseId],
  );

  const emptyChapter = useMemo<Chapter>(
    () => ({ course_id: "", title: "", order_index: 0 }),
    [],
  );
  const emptySlide = useMemo<Slide>(
    () => ({
      chapter_id: "",
      title: "",
      order_index: 0,
      intro_video_url: "",
      asset_url: "",
      body: "",
    }),
    [],
  );

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chForm, setChForm] = useState<Chapter>(emptyChapter);
  const [savingChapter, setSavingChapter] = useState(false);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [slForm, setSlForm] = useState<Slide>(emptySlide);
  const [savingSlide, setSavingSlide] = useState(false);

  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    chapter_id: "",
    time_limit_seconds: 120,
    num_questions: null,
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qForm, setQForm] = useState<QuizQuestion>({
    chapter_id: "",
    question: "",
    options: [],
    correct_index: 0,
  });
  const [bulkQuizStatus, setBulkQuizStatus] = useState<string>("");

  const chaptersAbort = useRef<AbortController | null>(null);
  const slidesAbort = useRef<AbortController | null>(null);
  const quizAbort = useRef<AbortController | null>(null);

  const refreshChapters = useCallback(
    async (courseId: string) => {
      chaptersAbort.current?.abort();
      const ac = new AbortController();
      chaptersAbort.current = ac;
      if (!courseId) {
        setChapters([]);
        setChForm({ ...emptyChapter, course_id: "" });
        return;
      }
      const r = await fetch(
        `/api/admin/chapters?course_id=${encodeURIComponent(courseId)}`,
        { cache: "no-store", signal: ac.signal },
      );
      const d = await r.json();
      if (courseId !== selectedCourseId) return; // guard
      const rows = asChapters(d);
      setChapters(rows);
      const kept = rows.find((c) => c.id === chForm.id);
      if (kept) setChForm(kept);
      else if (rows[0]) setChForm(rows[0]);
      else {
        setChForm({ ...emptyChapter, course_id: courseId });
        setSlides([]);
        setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
        setQuestions([]);
        setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
      }
    },
    [selectedCourseId, chForm.id, emptyChapter],
  );

  const refreshSlides = useCallback(
    async (chapterId: string) => {
      slidesAbort.current?.abort();
      const ac = new AbortController();
      slidesAbort.current = ac;
      if (!chapterId) return setSlides([]);
      const r = await fetch(
        `/api/admin/slides?chapter_id=${encodeURIComponent(chapterId)}`,
        { cache: "no-store", signal: ac.signal },
      );
      const d = await r.json();
      if (chapterId !== (chForm.id ?? "")) return;
      setSlides(asSlides(d));
    },
    [chForm.id],
  );

  const refreshQuiz = useCallback(
    async (chapterId: string) => {
      quizAbort.current?.abort();
      const ac = new AbortController();
      quizAbort.current = ac;

      if (!chapterId) {
        setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
        setQuestions([]);
        setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
        return;
      }
      const r1 = await fetch(
        `/api/admin/quiz-settings?chapter_id=${encodeURIComponent(chapterId)}`,
        { cache: "no-store", signal: ac.signal },
      );
      const d1 = r1.ok ? await r1.json() : {};
      if (chapterId === (chForm.id ?? ""))
        setQuizSettings(asQuizSettings(d1 ?? {}, chapterId));

      const r2 = await fetch(
        `/api/admin/quiz-questions?chapter_id=${encodeURIComponent(chapterId)}`,
        { cache: "no-store", signal: ac.signal },
      );
      const d2 = r2.ok ? await r2.json() : [];
      if (chapterId === (chForm.id ?? "")) {
        setQuestions(asQuizQuestions(d2));
        setQForm((f) => ({ ...f, chapter_id: chapterId }));
      }
    },
    [chForm.id],
  );

  const resetContentState = useCallback(() => {
    setChapters([]);
    setChForm({ ...emptyChapter, course_id: "" });
    setSlides([]);
    setSlForm({ ...emptySlide, chapter_id: "" });
    setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
    setQuestions([]);
    setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
    setExam(null);
    setExamQ([]);
    setExamForm({
      course_id: "",
      title: "Final Exam",
      pass_mark: 50,
      time_limit_minutes: 30,
    });
    setExamQForm({
      exam_id: "",
      prompt: "",
      options: [],
      correct_index: 0,
    });
  }, [emptyChapter, emptySlide]);

  async function saveChapter() {
    if (!selectedCourseId || !chForm.title.trim()) return alert("Course & Title required");
    setSavingChapter(true);
    const payload = {
      id: chForm.id,
      course_id: selectedCourseId,
      title: chForm.title.trim(),
      order_index: Number.isFinite(chForm.order_index) ? chForm.order_index : 0,
    };
    const r = await fetch("/api/admin/chapters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingChapter(false);
    if (!r.ok) return alert("Save chapter failed");
    await refreshChapters(selectedCourseId);
  }

  async function deleteChapter(id?: string) {
    if (!id) return;
    if (!confirm("Delete this chapter and its slides?")) return;
    const r = await fetch(`/api/admin/chapters/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    await refreshChapters(selectedCourseId);
  }

  async function saveSlide() {
    if (!slForm.chapter_id || !slForm.title.trim()) return alert("Chapter & Title required");
    setSavingSlide(true);
    const payload: Record<string, unknown> = {
      chapter_id: slForm.chapter_id,
      title: slForm.title.trim(),
      order_index: Number.isFinite(slForm.order_index) ? Number(slForm.order_index) : 0,
      intro_video_url: slForm.intro_video_url?.trim() || null,
      asset_url: slForm.asset_url?.trim() || null,
      body: slForm.body ?? null, // preserve formatting/spacing
    };
    if (typeof slForm.id === "string" && slForm.id.trim().length > 0) {
      payload.id = slForm.id.trim();
    }
    const r = await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingSlide(false);
    if (!r.ok) return alert("Save slide failed");
    await refreshSlides(slForm.chapter_id);
  }

  async function deleteSlide(id?: string) {
    if (!id) return;
    if (!confirm("Delete this slide?")) return;
    const r = await fetch(`/api/admin/slides?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    await refreshSlides(chForm.id ?? "");
    if (slForm.id === id) setSlForm({ ...emptySlide, chapter_id: chForm.id ?? "" });
  }

  /* Uploads */
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  async function uploadToStorage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!r.ok) return null;
    const d = await r.json();
    const url =
      d && typeof d === "object"
        ? (d as Record<string, unknown>)["publicUrl"]
        : null;
    return isStr(url) ? url : null;
  }
  async function onPick(file: File, target: "intro" | "asset") {
    setUploading(true);
    const url = await uploadToStorage(file);
    setUploading(false);
    if (!url) return alert("Upload failed");
    if (target === "intro") setSlForm((f) => ({ ...f, intro_video_url: url }));
    if (target === "asset") setSlForm((f) => ({ ...f, asset_url: url }));
    setUploadedUrl(url);
  }

  /* Chapter Quiz */
  const [quizSaving, setQuizSaving] = useState(false);
  async function saveQuizSettings() {
    if (!quizSettings.chapter_id) return alert("Pick a chapter");
    setQuizSaving(true);
    const r = await fetch("/api/admin/quiz-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(quizSettings),
    });
    setQuizSaving(false);
    if (!r.ok) return alert("Save quiz settings failed");
    const saved = await r.json();
    setQuizSettings(asQuizSettings(saved, quizSettings.chapter_id));
  }

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQ, setEditingQ] = useState<QuizQuestion | null>(null);

  async function saveQuestion() {
    if (!qForm.chapter_id || !qForm.question.trim()) return alert("Chapter & Question required");
    if ((qForm.options?.length ?? 0) < 2) return alert("At least 2 options");
    if (qForm.correct_index < 0 || qForm.correct_index >= qForm.options.length)
      return alert("Correct index out of range");

    const r = await fetch("/api/admin/quiz-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(qForm),
    });
    if (!r.ok) return alert("Save question failed");
    await refreshQuiz(qForm.chapter_id);
    setQForm({
      chapter_id: qForm.chapter_id,
      question: "",
      options: [],
      correct_index: 0,
      id: undefined,
    });
  }
  async function deleteQuestion(id?: string) {
    if (!id) return;
    if (!confirm("Delete this question?")) return;
    const r = await fetch(`/api/admin/quiz-questions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    await refreshQuiz(quizSettings.chapter_id);
  }
  async function uploadQuizCsv(file: File) {
    setBulkQuizStatus("Uploading…");
    const text = await file.text();
    const r = await fetch("/api/admin/quiz-questions/bulk", {
      method: "POST",
      headers: { "content-type": "text/csv" },
      body: text,
    });
    const d = await r.json();
    if (r.ok) {
      setBulkQuizStatus(`Uploaded ${d.inserted ?? 0} questions`);
      if (chForm.id) await refreshQuiz(chForm.id);
    } else {
      setBulkQuizStatus(d?.error ? `Failed: ${d.error}` : "Failed");
    }
  }
  function startEditQuestion(q: QuizQuestion) {
    setEditingQuestionId(q.id ?? null);
    setEditingQ({ ...q });
  }
  function cancelEditQuestion() {
    setEditingQuestionId(null);
    setEditingQ(null);
  }
  async function commitEditQuestion() {
    if (!editingQ) return;
    if (!editingQ.chapter_id || !editingQ.question.trim()) return alert("Chapter & Question required");
    if ((editingQ.options?.length ?? 0) < 2) return alert("At least 2 options");
    if (editingQ.correct_index < 0 || editingQ.correct_index >= editingQ.options.length)
      return alert("Correct index out of range");

    const r = await fetch("/api/admin/quiz-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingQ),
    });
    if (!r.ok) return alert("Update failed");
    await refreshQuiz(editingQ.chapter_id);
    setEditingQuestionId(null);
    setEditingQ(null);
  }

  /* ── FINAL EXAM (Course-level) ── */
  const [exam, setExam] = useState<FinalExam | null>(null);
  const [examForm, setExamForm] = useState<FinalExam>({
    course_id: "",
    title: "Final Exam",
    pass_mark: 50,
    time_limit_minutes: 30,
    num_questions: 50,
  });
  const [examSaving, setExamSaving] = useState(false);

  const [examQ, setExamQ] = useState<FinalExamQuestion[]>([]);
  const [examQForm, setExamQForm] = useState<FinalExamQuestion>({
    exam_id: "",
    prompt: "",
    options: [],
    correct_index: 0,
  });
  const [editingExamQId, setEditingExamQId] = useState<string | null>(null);
  const [bulkExamStatus, setBulkExamStatus] = useState<string>("");
  const examAbort = useRef<AbortController | null>(null);

  const refreshExamQuestions = useCallback(async (examId: string) => {
    const r = await fetch(
      `/api/admin/exam-questions?exam_id=${encodeURIComponent(examId)}`,
      { cache: "no-store" },
    );
    const d = r.ok ? await r.json() : [];
    setExamQ(asFinalExamQuestions(d));
  }, []);

  const refreshExam = useCallback(async (courseId: string) => {
    examAbort.current?.abort();
    const ac = new AbortController();
    examAbort.current = ac;

    // fetch exam
    const r = await fetch(`/api/admin/exams?course_id=${encodeURIComponent(courseId)}`, {
      cache: "no-store",
      signal: ac.signal,
    });
    if (r.ok) {
      const d = await r.json();
      // API may return single exam or array — normalize:
      const ex =
        Array.isArray(d) ? (d[0] ?? null) : d && typeof d === "object" ? d : null;
      const parsed = ex ? asFinalExam(ex, courseId) : null;
      setExam(parsed);
      if (parsed?.id) {
        void refreshExamQuestions(parsed.id);
        setExamForm(parsed);
        setExamQForm((f) => ({ ...f, exam_id: parsed.id! }));
      } else {
        setExamQ([]);
        setExamForm({
          course_id: courseId,
          title: "Final Exam",
          pass_mark: 50,
          time_limit_minutes: 30,
          num_questions: 50,
        });
        setExamQForm({ exam_id: "", prompt: "", options: [], correct_index: 0 });
      }
    } else {
      setExam(null);
      setExamQ([]);
    }
  }, [refreshExamQuestions]);

  // React to course / chapter changes
  useEffect(() => {
    if (!selectedCourseId) {
      resetContentState();
      return;
    }
    void refreshChapters(selectedCourseId);
    void refreshExam(selectedCourseId);
  }, [selectedCourseId, refreshChapters, refreshExam, resetContentState]);

  useEffect(() => {
    const id = chForm.id ?? "";
    void refreshSlides(id);
    void refreshQuiz(id);
    setSlForm((s) => ({ ...s, chapter_id: id }));
  }, [chForm.id, refreshSlides, refreshQuiz]);

  async function saveExam() {
    if (!selectedCourseId) return alert("Pick a course first");
    if (!examForm.title.trim()) return alert("Exam title required");
    const payload: FinalExam = {
      id: exam?.id,
      course_id: selectedCourseId,
      title: examForm.title.trim(),
      pass_mark: Math.max(0, Math.min(100, num(examForm.pass_mark, 50))),
      time_limit_minutes:
        examForm.time_limit_minutes == null
          ? null
          : Math.max(1, Math.floor(num(examForm.time_limit_minutes, 30))),
      num_questions:
        examForm.num_questions == null
          ? null
          : Math.max(1, Math.floor(num(examForm.num_questions, 50))),
    };
    setExamSaving(true);
    const r = await fetch("/api/admin/exams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setExamSaving(false);
    if (!r.ok) return alert("Save exam failed");
    const saved = await r.json();
    const parsed = asFinalExam(saved, selectedCourseId);
    setExam(parsed);
    if (parsed?.id) {
      setExamForm(parsed);
      setExamQForm((f) => ({ ...f, exam_id: parsed.id! }));
      await refreshExamQuestions(parsed.id);
    }
  }

  async function deleteExam() {
    if (!exam?.id) return;
    if (!confirm("Delete the final exam (and its questions)?")) return;
    const r = await fetch(`/api/admin/exams?id=${encodeURIComponent(exam.id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    setExam(null);
    setExamQ([]);
    setExamForm({
      course_id: selectedCourseId,
      title: "Final Exam",
      pass_mark: 50,
      time_limit_minutes: 30,
    });
    setExamQForm({ exam_id: "", prompt: "", options: [], correct_index: 0 });
  }

  async function saveExamQuestion() {
    if (!exam?.id) return alert("Create the exam first");
    if (!examQForm.prompt.trim()) return alert("Question is required");
    if ((examQForm.options?.length ?? 0) < 2) return alert("At least 2 options");
    if (examQForm.correct_index < 0 || examQForm.correct_index >= examQForm.options.length)
      return alert("Correct index out of range");

    const payload = { ...examQForm, exam_id: exam.id, question: examQForm.prompt };
    const r = await fetch("/api/admin/exam-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return alert("Save question failed");
    await refreshExamQuestions(exam.id);
    setExamQForm({ exam_id: exam.id, prompt: "", options: [], correct_index: 0, id: undefined });
    setEditingExamQId(null);
  }

  function startEditExamQuestion(q: FinalExamQuestion) {
    setEditingExamQId(q.id ?? null);
    setExamQForm({
      ...q,
      exam_id: exam?.id ?? q.exam_id ?? "",
      prompt: q.prompt ?? "",
      options: q.options ?? [],
      correct_index: q.correct_index ?? 0,
    });
  }

  function cancelEditExamQuestion() {
    setEditingExamQId(null);
    setExamQForm({ exam_id: exam?.id ?? "", prompt: "", options: [], correct_index: 0, id: undefined });
  }

  async function deleteExamQuestion(id?: string) {
    if (!id || !exam?.id) return;
    if (!confirm("Delete this exam question?")) return;
    const r = await fetch(
      `/api/admin/exam-questions?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!r.ok) return alert("Delete failed");
    await refreshExamQuestions(exam.id);
  }
  async function uploadExamCsv(file: File) {
    setBulkExamStatus("Uploading…");
    const text = await file.text();
    const r = await fetch("/api/admin/exam-questions/bulk", {
      method: "POST",
      headers: { "content-type": "text/csv" },
      body: text,
    });
    const d = await r.json();
    if (r.ok) {
      setBulkExamStatus(`Uploaded ${d.inserted ?? 0} questions`);
      if (exam?.id) await refreshExamQuestions(exam.id);
    } else {
      setBulkExamStatus(d?.error ? `Failed: ${d.error}` : "Failed");
    }
  }

  /* ── Ebooks ── */
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [ebookForm, setEbookForm] = useState<Ebook>({
    slug: "",
    title: "",
    description: "",
    cover_url: "",
    sample_url: "",
    kpf_url: "",
    price_cents: 0,
    published: true,
    free_for_logged_in: false,
  });
  const [savingEbook, setSavingEbook] = useState(false);
  const [loadingEbooks, setLoadingEbooks] = useState(false);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [bundleForm, setBundleForm] = useState<Bundle>({
    course_id: "",
    ebook_id: "",
    active: true,
  });

  const refreshEbooksAbort = useRef<AbortController | null>(null);
  const refreshEbooks = useCallback(async () => {
    refreshEbooksAbort.current?.abort();
    const ac = new AbortController();
    refreshEbooksAbort.current = ac;
    setLoadingEbooks(true);
    try {
      const r = await fetch("/api/admin/ebooks", {
        cache: "no-store",
        signal: ac.signal,
      });
      const d = await r.json();
      if (!r.ok) {
        console.error("refresh ebooks failed", d);
        return;
      }
      setEbooks(asEbooks(d));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("refresh ebooks failed", err);
    } finally {
      setLoadingEbooks(false);
    }
  }, []);
  useEffect(() => {
    if (tab === "catalog" || tab === "prices") void refreshEbooks();
  }, [tab, refreshEbooks]);

  const refreshBundles = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/bundles", { cache: "no-store" });
      const d = r.ok ? await r.json() : [];
      setBundles(asBundles(d));
    } catch (err) {
      console.error("bundles fetch failed", err);
    }
  }, []);
  useEffect(() => {
    if (tab === "catalog") void refreshBundles();
  }, [tab, refreshBundles]);

  /* ── Physical orders ── */
  const [orders, setOrders] = useState<PhysicalOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersSetupRequired, setOrdersSetupRequired] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | PhysicalOrder["status"]>("all");
  const [orderQuery, setOrderQuery] = useState("");
  const refreshOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const r = await fetch("/api/admin/orders", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) {
        setOrders(Array.isArray(d?.orders) ? (d.orders as PhysicalOrder[]) : []);
        setOrdersSetupRequired(Boolean(d?.setup_required));
      }
    } catch (err) {
      console.error("orders fetch failed", err);
    } finally {
      setOrdersLoading(false);
    }
  }, []);
  useEffect(() => {
    if (tab === "orders") void refreshOrders();
  }, [tab, refreshOrders]);

  async function updateOrderStatus(id: string, status: PhysicalOrder["status"]) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const r = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) {
      alert("Could not update order status.");
      await refreshOrders();
    }
  }
  async function deleteOrder(id: string) {
    if (!confirm("Delete this order? Reserved stock will be returned.")) return;
    const r = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) return alert("Delete failed");
    await refreshOrders();
  }

  /* ── Discount vouchers ── */
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [vouchersSetupRequired, setVouchersSetupRequired] = useState(false);
  const [voucherForm, setVoucherForm] = useState<{
    code: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    max_uses: string;
    min_subtotal: string;
    expires_at: string;
  }>({ code: "", discount_type: "percent", discount_value: 10, max_uses: "", min_subtotal: "", expires_at: "" });
  const [creatingVoucher, setCreatingVoucher] = useState(false);
  const refreshVouchers = useCallback(async () => {
    setVouchersLoading(true);
    try {
      const r = await fetch("/api/admin/vouchers", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) {
        setVouchers(Array.isArray(d?.vouchers) ? (d.vouchers as Voucher[]) : []);
        setVouchersSetupRequired(Boolean(d?.setup_required));
      }
    } catch (err) {
      console.error("vouchers fetch failed", err);
    } finally {
      setVouchersLoading(false);
    }
  }, []);
  useEffect(() => {
    if (tab === "vouchers") void refreshVouchers();
  }, [tab, refreshVouchers]);

  async function createVoucher() {
    const dv = Math.floor(Number(voucherForm.discount_value));
    if (!Number.isFinite(dv) || dv <= 0) return alert("Enter a discount value greater than zero.");
    if (voucherForm.discount_type === "percent" && dv > 100) return alert("Percent discount cannot exceed 100.");
    setCreatingVoucher(true);
    try {
      const body: Record<string, unknown> = {
        discount_type: voucherForm.discount_type,
        discount_value: voucherForm.discount_type === "fixed" ? Math.round(dv * 100) : dv,
      };
      if (voucherForm.code.trim()) body.code = voucherForm.code.trim();
      if (voucherForm.max_uses.trim()) body.max_uses = Math.max(1, Math.floor(Number(voucherForm.max_uses)));
      if (voucherForm.min_subtotal.trim()) body.min_subtotal_cents = Math.max(0, Math.round(Number(voucherForm.min_subtotal) * 100));
      if (voucherForm.expires_at.trim()) body.expires_at = new Date(voucherForm.expires_at).toISOString();
      const r = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        alert(typeof d?.error === "string" ? d.error : "Could not create voucher.");
        return;
      }
      setVoucherForm({ code: "", discount_type: "percent", discount_value: 10, max_uses: "", min_subtotal: "", expires_at: "" });
      await refreshVouchers();
    } finally {
      setCreatingVoucher(false);
    }
  }
  async function toggleVoucher(v: Voucher) {
    setVouchers((prev) => prev.map((x) => (x.id === v.id ? { ...x, active: !x.active } : x)));
    const r = await fetch(`/api/admin/vouchers/${encodeURIComponent(v.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !v.active }),
    });
    if (!r.ok) {
      alert("Could not update voucher.");
      await refreshVouchers();
    }
  }
  async function deleteVoucher(id: string) {
    if (!confirm("Delete this voucher code?")) return;
    const r = await fetch(`/api/admin/vouchers/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) return alert("Delete failed");
    await refreshVouchers();
  }

  async function saveEbook() {
    if (!ebookForm.slug.trim() || !ebookForm.title.trim())
      return alert("Slug & Title required");
    setSavingEbook(true);
    const payload: Ebook = {
      ...ebookForm,
      price_cents: num(ebookForm.price_cents, 0),
      cover_url: ebookForm.cover_url?.trim() || null,
      sample_url: ebookForm.sample_url?.trim() || null,
      kpf_url: ebookForm.kpf_url?.trim() || null,
      sku: ebookForm.sku?.trim() || null,
      stock_quantity: num(ebookForm.stock_quantity, 0),
      show_stock: Boolean(ebookForm.show_stock),
      physical_price_cents:
        ebookForm.physical_price_cents != null && ebookForm.physical_price_cents > 0
          ? num(ebookForm.physical_price_cents, 0)
          : null,
    };
    const r = await fetch("/api/admin/ebooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingEbook(false);
    if (!r.ok) return alert("Save e-book failed");
    setEbookForm({
      slug: "",
      title: "",
      description: "",
      cover_url: "",
      sample_url: "",
      kpf_url: "",
      price_cents: 0,
      published: true,
      free_for_logged_in: false,
    });
    await refreshEbooks();
  }
  async function deleteEbook(id?: string) {
    if (!id) return;
    if (!confirm("Delete e-book?")) return;
    const r = await fetch(`/api/admin/ebooks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    if (ebookForm.id === id)
      setEbookForm({
        slug: "",
        title: "",
        description: "",
        cover_url: "",
        sample_url: "",
        kpf_url: "",
        price_cents: 0,
        published: true,
        free_for_logged_in: false,
      });
    await refreshEbooks();
  }
  async function onPickEbook(file: File, field: "cover_url" | "sample_url" | "kpf_url") {
    setUploading(true);
    const url = await uploadToStorage(file);
    setUploading(false);
    if (!url) return alert("Upload failed");
    setEbookForm((f) => ({ ...f, [field]: url }));
  }

  async function saveBundle() {
    if (!bundleForm.course_id || !bundleForm.ebook_id) {
      alert("Select a course and an e-book");
      return;
    }
    const payload: Bundle = {
      id: bundleForm.id,
      course_id: bundleForm.course_id,
      ebook_id: bundleForm.ebook_id,
      active: bundleForm.active,
    };
    const r = await fetch("/api/admin/bundles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      alert("Save bundle failed");
      return;
    }
    setBundleForm({ course_id: "", ebook_id: "", active: true });
    await refreshBundles();
  }

  async function deleteBundle(id?: string) {
    if (!id) return;
    if (!confirm("Delete this bundle link?")) return;
    const r = await fetch(`/api/admin/bundles?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) {
      alert("Delete failed");
      return;
    }
    if (bundleForm.id === id) setBundleForm({ course_id: "", ebook_id: "", active: true });
    await refreshBundles();
  }

  /* ── Users ── */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedPurchases, setSelectedPurchases] = useState<{
    courses: Array<{ title: string }>;
    ebooks: Array<{ title: string }>;
  } | null>(null);

  const refreshUsersAbort = useRef<AbortController | null>(null);
  const refreshUsers = useCallback(async () => {
    refreshUsersAbort.current?.abort();
    const ac = new AbortController();
    refreshUsersAbort.current = ac;
    setUsersLoading(true);
    try {
      const r = await fetch("/api/admin/users", {
        cache: "no-store",
        signal: ac.signal,
      });
      const d = await r.json();
      const arr = Array.isArray(d?.users) ? d.users : [];
      setUsers(arr.map(asAdminUser));
    } finally {
      setUsersLoading(false);
    }
  }, []);
  useEffect(() => {
    if (tab === "users") void refreshUsers();
  }, [tab, refreshUsers]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email ?? u.id).toLowerCase().includes(q));
  }, [userQuery, users]);

  async function generateConfirmLink(email?: string) {
    if (!email) return;
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "generate_confirmation_link", email }),
    });
    const d = await r.json();
    const link =
      d && typeof d === "object" ? (d as Record<string, unknown>)["link"] : null;
    if (isStr(link)) {
      await navigator.clipboard.writeText(link);
      alert("Confirmation link copied");
    } else {
      alert("Could not generate link");
    }
  }
  async function generateResetLink(email?: string) {
    if (!email) return;
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "generate_reset_link", email }),
    });
    const d = await r.json();
    const link =
      d && typeof d === "object" ? (d as Record<string, unknown>)["link"] : null;
    if (isStr(link)) {
      await navigator.clipboard.writeText(link);
      alert("Reset link copied");
    } else {
      alert("Could not generate reset link");
    }
  }

  const [userActionBusy, setUserActionBusy] = useState<string | null>(null);
  const [courseActionBusy, setCourseActionBusy] = useState<string | null>(null);
  async function act(userId: string, endpoint: UserAction): Promise<void> {
    const warnings: Record<UserAction, string> = {
      ban: "Ban this user? They will be blocked from signing in.",
      unban: "Unban this user and allow sign-in?",
      revoke: "Revoke this user's active sessions? They will be signed out.",
      "clear-history": "Clear course progress, quiz attempts, and exams for this user?",
      delete: "Delete this user permanently? This cannot be undone.",
    };
    const warn = warnings[endpoint];
    if (warn && !confirm(`${warn}\n\nContinue?`)) return;
    setUserActionBusy(`${endpoint}:${userId}`);
    const url =
      endpoint === "delete"
        ? `/api/admin/users/${encodeURIComponent(userId)}/delete`
        : `/api/admin/users/${encodeURIComponent(userId)}/${endpoint}`;
    const r = await fetch(url, { method: "POST" });
    setUserActionBusy(null);
    if (!r.ok) return alert(`Failed to ${endpoint.replace("-", " ")}`);
    await refreshUsers();
    if (selectedUser?.id === userId)
      setSelectedUser((u) =>
        u
          ? {
              ...u,
              banned:
                endpoint === "ban" ? true : endpoint === "unban" ? false : (u.banned ?? null),
            }
          : u,
      );
  }
  async function loadPurchases(userId: string) {
    const r = await fetch(
      `/api/admin/users/${encodeURIComponent(userId)}/purchases`,
      { cache: "no-store" },
    );
    if (!r.ok) return setSelectedPurchases({ courses: [], ebooks: [] });
    const d = await r.json();
    const courses = Array.isArray(d?.courses) ? d.courses : [];
    const ebooks = Array.isArray(d?.ebooks) ? d.ebooks : [];
    setSelectedPurchases({ courses, ebooks });
  }

  async function removePurchase(kind: "course" | "ebook", target_id: string) {
    if (!selectedUser?.id) return;
    if (!confirm(`Remove this ${kind} from user?`)) return;
    const r = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/purchases`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, target_id }),
    });
    if (!r.ok) return alert("Failed to remove");
    await loadPurchases(selectedUser.id);
  }

  async function unlockCourse(course_id: string) {
    if (!selectedUser?.id) return;
    setCourseActionBusy(`unlock:${course_id}`);
    const r = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/complete-course`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ course_id }),
    });
    setCourseActionBusy(null);
    if (!r.ok) return alert("Failed to unlock");
    alert("Course marked complete and final exam unlocked for this user.");
  }

  async function resetCourse(scope: "exam" | "course", course_id: string) {
    if (!selectedUser?.id) return;
    const msg = scope === "course" ? "Reset this course progress for the user?" : "Reset the final exam for this user?";
    if (!confirm(msg)) return;
    setCourseActionBusy(`${scope}:${course_id}`);
    const r = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/reset-course`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ course_id, scope }),
    });
    setCourseActionBusy(null);
    if (!r.ok) return alert("Failed to reset. Please try again.");
    if (scope === "course") {
      await loadPurchases(selectedUser.id);
      alert("Course progress reset. The learner can start fresh.");
    } else {
      alert("Final exam reset. The learner can retake it.");
    }
  }

  /* ── Purchases ── */
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchaseQuery, setPurchaseQuery] = useState("");
  const [purchaseRange, setPurchaseRange] = useState<PurchaseRange>("all");
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatusFilter>("all");
  const [purchaseStart, setPurchaseStart] = useState("");
  const [purchaseEnd, setPurchaseEnd] = useState("");

  const refreshPurchasesAbort = useRef<AbortController | null>(null);
  const refreshPurchases = useCallback(async () => {
    refreshPurchasesAbort.current?.abort();
    const ac = new AbortController();
    refreshPurchasesAbort.current = ac;
    setPurchasesLoading(true);
    try {
      const r = await fetch("/api/admin/purchases?limit=2000", { cache: "no-store", signal: ac.signal });
      const d = await r.json();
      const rows = Array.isArray(d?.purchases) ? d.purchases : Array.isArray(d) ? d : [];
      setPurchases(asPurchaseRows(rows));
    } finally {
      setPurchasesLoading(false);
    }
  }, []);
  useEffect(() => {
    if (tab === "purchases") void refreshPurchases();
  }, [tab, refreshPurchases]);

  const purchaseRangeLabel = useMemo(() => {
    if (purchaseRange === "all") return "All time";
    if (purchaseRange === "week") return "This week";
    if (purchaseRange === "month") return "This month";
    if (purchaseRange === "quarter") return "This quarter";
    if (purchaseRange === "year") return "This year";
    if (purchaseRange === "custom") {
      if (purchaseStart && purchaseEnd) return `${purchaseStart} to ${purchaseEnd}`;
      if (purchaseStart) return `From ${purchaseStart}`;
      if (purchaseEnd) return `Up to ${purchaseEnd}`;
      return "Custom range";
    }
    return "";
  }, [purchaseRange, purchaseStart, purchaseEnd]);

  const filteredPurchases = useMemo(() => {
    const q = purchaseQuery.trim().toLowerCase();
    const { start, end } = getRangeBounds(purchaseRange, purchaseStart, purchaseEnd);
    const rangeActive =
      purchaseRange !== "all" && (purchaseRange !== "custom" || purchaseStart || purchaseEnd);
    const rows = purchases.filter((p) => {
      const status = (p.status ?? "").toLowerCase();
      const isFailed =
        status.includes("failed") || status.includes("abandoned") || status.includes("cancel");
      const isPaid = p.is_paid;
      const isPending = !isPaid && !isFailed;
      if (purchaseStatus === "paid" && !isPaid) return false;
      if (purchaseStatus === "failed" && !isFailed) return false;
      if (purchaseStatus === "pending" && !isPending) return false;

      if (q) {
        const hay = [
          p.item_title,
          p.item_id,
          p.user_email,
          p.user_id,
          p.reference,
          p.status,
          p.kind,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (rangeActive) {
        const ts = pickPurchaseTime(p);
        const d = parseIsoDate(ts ?? null);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
      }
      return true;
    });
    rows.sort((a, b) => {
      const da = parseIsoDate(pickPurchaseTime(a));
      const db = parseIsoDate(pickPurchaseTime(b));
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
    return rows;
  }, [purchases, purchaseQuery, purchaseRange, purchaseStart, purchaseEnd, purchaseStatus]);

  const purchaseTotals = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    let paidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    filteredPurchases.forEach((p) => {
      const status = (p.status ?? "").toLowerCase();
      const isFailed =
        status.includes("failed") || status.includes("abandoned") || status.includes("cancel");
      if (p.is_paid) {
        paidCount += 1;
        if (typeof p.amount_minor === "number") {
          const code = (p.currency ?? "GHS").toUpperCase();
          byCurrency[code] = (byCurrency[code] ?? 0) + p.amount_minor;
        }
      } else if (isFailed) {
        failedCount += 1;
      } else {
        pendingCount += 1;
      }
    });
    return {
      totalCount: filteredPurchases.length,
      paidCount,
      pendingCount,
      failedCount,
      byCurrency,
    };
  }, [filteredPurchases]);

  /* ── Quick Prices ── */
  const [priceSearch, setPriceSearch] = useState("");
  type PriceField = "course" | "ebook_digital" | "ebook_physical";
  type PriceRowData = { field: PriceField; id: string; title: string; price: number; currency: "GHS" | "USD" };

  const priceQ = priceSearch.trim().toLowerCase();
  const filterByQ = useCallback(
    (rows: PriceRowData[]) => (priceQ ? rows.filter((r) => r.title.toLowerCase().includes(priceQ)) : rows),
    [priceQ],
  );

  const coursePriceRows = useMemo<PriceRowData[]>(
    () =>
      filterByQ(
        knowledge.map((k) => ({
          field: "course" as const,
          id: k.id ?? k.slug,
          title: k.title,
          price: k.price ?? 0,
          currency: "GHS" as const,
        })),
      ),
    [knowledge, filterByQ],
  );
  const ebookDigitalRows = useMemo<PriceRowData[]>(
    () =>
      filterByQ(
        ebooks.map((e) => ({
          field: "ebook_digital" as const,
          id: e.id ?? e.slug,
          title: e.title,
          price: e.price_cents / 100,
          currency: "GHS" as const,
        })),
      ),
    [ebooks, filterByQ],
  );
  const ebookPhysicalRows = useMemo<PriceRowData[]>(
    () =>
      filterByQ(
        ebooks.map((e) => ({
          field: "ebook_physical" as const,
          id: e.id ?? e.slug,
          title: e.title,
          // Falls back to the digital price when no dedicated physical price is set.
          price:
            e.physical_price_cents != null && e.physical_price_cents > 0
              ? e.physical_price_cents / 100
              : e.price_cents / 100,
          currency: "GHS" as const,
        })),
      ),
    [ebooks, filterByQ],
  );

  async function savePrice(row: { field: PriceField; id: string; price: number }) {
    if (row.field === "course") {
      const item = knowledge.find((k) => (k.id ?? k.slug) === row.id);
      if (!item) return;
      const payload = { ...item, price: row.price };
      const r = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return alert("Save course price failed");
      await refreshKnowledge();
      return;
    }
    const item = ebooks.find((e) => (e.id ?? e.slug) === row.id);
    if (!item) return;
    const payload =
      row.field === "ebook_physical"
        ? { ...item, physical_price_cents: Math.round(row.price * 100) }
        : { ...item, price_cents: Math.round(row.price * 100) };
    const r = await fetch("/api/admin/ebooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return alert("Save e-book price failed");
    await refreshEbooks();
  }

  /* ── Deploy ── */
  async function triggerDeploy() {
    const r = await fetch("/api/admin/deploy", { method: "POST" });
    const d = await r.json();
    const ok = d && typeof d === "object" ? (d as Record<string, unknown>)["ok"] : null;
    const text = d && typeof d === "object" ? (d as Record<string, unknown>)["text"] : null;
    alert(ok ? "Deploy triggered" : `Failed: ${String(text ?? "Unknown error")}`);
  }

  /* ── Render ── */
  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Master Admin</h1>
        <div className="flex flex-wrap gap-2">
          {adminTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm transition ${
                tab === t ? "bg-[#0a1156] text-white" : "bg-white hover:bg-slate-50"
              }`}
            >
              {adminTabLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ───────────── Catalog ───────────── */}
      {tab === "catalog" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Section title="Course (Knowledge) – Create / Edit">
            <div className="grid gap-3">
              {[
                ["slug", "Slug"],
                ["title", "Title"],
                ["description", "Description"],
                ["level", "Level"],
              ].map(([k, label]) => (
                <label key={k} className="grid gap-1">
                  <span className="text-xs text-slate-500">{label}</span>
                  <input
                    value={((kForm as Record<string, unknown>)[k] as string) ?? ""}
                    onChange={(e) =>
                      setKForm((f) => ({ ...f, [k]: (e.target as HTMLInputElement).value }))
                    }
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  />
                </label>
              ))}
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Course type</span>
                <select
                  value={kForm.delivery_mode ?? "slides"}
                  onChange={(e) => setKForm((f) => ({ ...f, delivery_mode: (e.target as HTMLSelectElement).value as "slides" | "interactive" }))}
                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                >
                  <option value="slides">Standard</option>
                  <option value="interactive">Interactive (Storyline)</option>
                </select>
                {kForm.delivery_mode === "interactive" && (
                  <span className="text-[11px] text-slate-500">
                    Interactive courses need one placeholder slide for progress; add it in Content &amp; Quiz builder.
                  </span>
                )}
              </label>
              {kForm.delivery_mode === "interactive" && (
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Interactive entry path/URL</span>
                  <input
                    value={kForm.interactive_path ?? ""}
                    onChange={(e) => setKForm((f) => ({ ...f, interactive_path: (e.target as HTMLInputElement).value }))}
                    placeholder="/interactive/ghie-business-ethics/story_html5.html?v=ios-safe-3"
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  />
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Price (GH₵)</span>
                  <input
                    type="number"
                    value={kForm.price ?? ""}
                    onChange={(e) =>
                      setKForm((f) => ({
                        ...f,
                        price:
                          (e.target as HTMLInputElement).value === ""
                            ? null
                            : Number((e.target as HTMLInputElement).value),
                      }))
                    }
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">CPPD Points</span>
                  <input
                    type="number"
                    value={kForm.cpd_points ?? ""}
                    onChange={(e) =>
                      setKForm((f) => ({
                        ...f,
                        cpd_points:
                          (e.target as HTMLInputElement).value === ""
                            ? null
                            : Number((e.target as HTMLInputElement).value),
                      }))
                    }
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  />
                </label>
              </div>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Image URL</span>
                <input
                  value={kForm.img ?? ""}
                  onChange={(e) => setKForm((f) => ({ ...f, img: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Accredited (comma separated)</span>
                <input
                  value={toCsv(kForm.accredited ?? [])}
                  onChange={(e) =>
                    setKForm((f) => ({ ...f, accredited: fromCsv((e.target as HTMLInputElement).value) }))
                  }
                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                />
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={kForm.published ?? true}
                    onChange={(e) => setKForm((f) => ({ ...f, published: (e.target as HTMLInputElement).checked }))}
                  />
                  <span className="text-sm">Published</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(kForm.free_for_logged_in)}
                    onChange={(e) =>
                      setKForm((f) => ({ ...f, free_for_logged_in: (e.target as HTMLInputElement).checked }))
                    }
                  />
                  <span className="text-sm">Free with login</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={kForm.coming_soon ?? false}
                    onChange={(e) => setKForm((f) => ({ ...f, coming_soon: (e.target as HTMLInputElement).checked }))}
                  />
                  <span className="text-sm">Coming soon (preview only)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveKnowledge}
                  disabled={savingK}
                  className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {savingK ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() =>
                    setKForm({
                      slug: "",
                      title: "",
                      description: "",
                      level: "",
                      price: null,
                      cpd_points: null,
                      img: "",
                      accredited: [],
                      published: true,
                      coming_soon: false,
                      delivery_mode: "slides",
                      interactive_path: "",
                      free_for_logged_in: false,
                    })
                  }
                  className="rounded-lg px-4 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                >
                  Reset
                </button>
              </div>
            </div>
          </Section>

          <Section
            title="Courses List"
            right={
              <button onClick={refreshKnowledge} className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm">
                Refresh
              </button>
            }
          >
            <div className="grid gap-2">
              {knowledge.map((k) => (
                <div
                  key={k.id ?? k.slug}
                  className="flex items-start justify-between gap-3 rounded-lg p-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                >
                  <div className="text-sm">
                    <div className="font-semibold">{k.title}</div>
                    <div className="text-slate-500 text-xs">
                      /{k.slug} · {k.level ?? "—"} ·{" "}
                      {k.free_for_logged_in ? "Free with login" : `GH₵${k.price ?? 0}`} · {k.published ? "Published" : "Draft"} ·{" "}
                      {k.delivery_mode === "interactive" ? "Interactive" : "Standard"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setKForm(k)} className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm">
                      Edit
                    </button>
                    <button
                      onClick={() => void deleteCourse(k.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedCourseId(k.id ?? "")}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm"
                    >
                      Build
                    </button>
                  </div>
                </div>
              ))}
              {knowledge.length === 0 && <div className="text-slate-500 text-sm">No courses yet.</div>}
            </div>
          </Section>

          <Section title="E-book – Create / Edit">
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Slug</span>
                <input
                  value={ebookForm.slug}
                  onChange={(e) => setEbookForm((f) => ({ ...f, slug: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Title</span>
                <input
                  value={ebookForm.title}
                  onChange={(e) => setEbookForm((f) => ({ ...f, title: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Description</span>
                <textarea
                  value={ebookForm.description ?? ""}
                  onChange={(e) =>
                    setEbookForm((f) => ({ ...f, description: (e.target as HTMLTextAreaElement).value }))
                  }
                  className="min-h-[90px] rounded-lg bg-white px-3 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Price (GH₵)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={(ebookForm.price_cents / 100).toString()}
                    onChange={(e) => {
                      const cents = Math.round(Number((e.target as HTMLInputElement).value || 0) * 100);
                      setEbookForm((f) => ({ ...f, price_cents: Number.isFinite(cents) ? cents : 0 }));
                    }}
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  />
                </label>
                <div className="flex flex-col justify-end gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ebookForm.published}
                      onChange={(e) =>
                        setEbookForm((f) => ({ ...f, published: (e.target as HTMLInputElement).checked }))
                      }
                    />
                    <span className="text-sm">Published</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(ebookForm.free_for_logged_in)}
                      onChange={(e) =>
                        setEbookForm((f) => ({
                          ...f,
                          free_for_logged_in: (e.target as HTMLInputElement).checked,
                        }))
                      }
                    />
                    <span className="text-sm">Free with login</span>
                  </label>
                </div>
              </div>

              {/* Physical stock / SKU */}
              <div className="rounded-lg border border-[color:var(--color-light)]/40 p-3">
                <div className="text-xs font-semibold text-slate-600">Physical copies (inventory)</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Physical copy price (GH₵)</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Defaults to digital price"
                      value={
                        ebookForm.physical_price_cents != null
                          ? (ebookForm.physical_price_cents / 100).toString()
                          : ""
                      }
                      onChange={(e) => {
                        const raw = (e.target as HTMLInputElement).value;
                        if (raw.trim() === "") {
                          setEbookForm((f) => ({ ...f, physical_price_cents: null }));
                          return;
                        }
                        const cents = Math.round(Number(raw || 0) * 100);
                        setEbookForm((f) => ({ ...f, physical_price_cents: Number.isFinite(cents) ? cents : null }));
                      }}
                      className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">SKU (optional)</span>
                    <input
                      value={ebookForm.sku ?? ""}
                      onChange={(e) => setEbookForm((f) => ({ ...f, sku: (e.target as HTMLInputElement).value }))}
                      placeholder="e.g. PV-BOOK-001"
                      className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Quantity in stock (books left)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={String(ebookForm.stock_quantity ?? 0)}
                      onChange={(e) => {
                        const v = Math.max(0, Math.floor(Number((e.target as HTMLInputElement).value || 0)));
                        setEbookForm((f) => ({ ...f, stock_quantity: Number.isFinite(v) ? v : 0 }));
                      }}
                      className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    />
                  </label>
                </div>
                <label className="mt-3 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(ebookForm.show_stock)}
                    onChange={(e) =>
                      setEbookForm((f) => ({ ...f, show_stock: (e.target as HTMLInputElement).checked }))
                    }
                  />
                  <span className="text-sm">Show &quot;copies left&quot; to customers</span>
                </label>
              </div>

              {([
                ["cover_url", "Cover URL", "image/*"] as const,
                ["sample_url", "Sample URL (image/pdf)", "image/*,application/pdf"] as const,
                ["kpf_url", "KPF URL", ".kpf,application/octet-stream"] as const,
              ]).map(([field, label, accept]) => (
                <div key={field} className="grid gap-1">
                  <span className="text-xs text-slate-500">{label}</span>
                  <input
                    value={((ebookForm as Record<string, unknown>)[field] as string) ?? ""}
                    onChange={(e) => setEbookForm((f) => ({ ...f, [field]: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  />
                  <input
                    type="file"
                    accept={accept}
                    onChange={(e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) void onPickEbook(file, field as "cover_url" | "sample_url" | "kpf_url");
                    }}
                  />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEbook}
                  disabled={savingEbook}
                  className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {savingEbook ? "Saving…" : "Save E-book"}
                </button>
                <button
                  onClick={() =>
                    setEbookForm({
                      slug: "",
                      title: "",
                      description: "",
                      cover_url: "",
                      sample_url: "",
                      kpf_url: "",
                      price_cents: 0,
                      published: true,
                      free_for_logged_in: false,
                    })
                  }
                  className="rounded-lg px-4 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                >
                  Reset
                </button>
              </div>
            </div>
          </Section>

          <Section
            title="E-books List"
            right={
              <button className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm" onClick={refreshEbooks}>
                {loadingEbooks ? "Refreshing…" : "Refresh"}
              </button>
            }
          >
            <div className="grid gap-2">
              {ebooks.map((e) => (
                <div key={e.id ?? e.slug} className="flex items-start justify-between gap-3 rounded-lg p-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30">
                  <div className="flex items-start gap-3">
                    {e.cover_url ? (
                      <Image
                        src={e.cover_url}
                        alt={e.title}
                        width={56}
                        height={56}
                        className="rounded-md border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-md bg-slate-100" />
                    )}
                    <div className="text-sm">
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-xs text-slate-500">
                        /{e.slug} ·{" "}
                        {e.free_for_logged_in
                          ? "Free with login"
                          : `GH₵ ${(e.price_cents / 100).toFixed(2)}`} ·{" "}
                        {e.published ? "Published" : "Draft"} · Stock: {e.stock_quantity ?? 0}
                        {e.show_stock ? " (shown)" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEbookForm(e)} className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm">
                      Edit
                    </button>
                    <button onClick={() => void deleteEbook(e.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {ebooks.length === 0 && <div className="text-slate-500 text-sm">No e-books yet.</div>}
            </div>
          </Section>

          <Section
            title="Course ↔ E-book Bundles"
            right={
              <button className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm" onClick={refreshBundles}>
                Refresh
              </button>
            }
          >
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Course</span>
                  <select
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    value={bundleForm.course_id}
                    onChange={(e) => setBundleForm((f) => ({ ...f, course_id: (e.target as HTMLSelectElement).value }))}
                  >
                    <option value="">— Choose course —</option>
                    {knowledge.map((k) => (
                      <option key={k.id ?? k.slug} value={k.id}>
                        {k.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">E-book</span>
                  <select
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    value={bundleForm.ebook_id}
                    onChange={(e) => setBundleForm((f) => ({ ...f, ebook_id: (e.target as HTMLSelectElement).value }))}
                  >
                    <option value="">— Choose e-book —</option>
                    {ebooks.map((e) => (
                      <option key={e.id ?? e.slug} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bundleForm.active}
                  onChange={(e) => setBundleForm((f) => ({ ...f, active: (e.target as HTMLInputElement).checked }))}
                />
                <span className="text-sm">Active</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveBundle}
                  className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
                >
                  Save Bundle
                </button>
                <button
                  onClick={() => setBundleForm({ course_id: "", ebook_id: "", active: true })}
                  className="rounded-lg px-4 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                >
                  Reset
                </button>
              </div>

              <div className="grid gap-2">
                {bundles.map((b) => (
                  <div key={b.id ?? `${b.course_id}-${b.ebook_id}`} className="flex items-start justify-between gap-3 rounded-lg p-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30">
                    <div className="text-sm">
                      <div className="font-semibold">{b.course_title ?? b.course_id}</div>
                      <div className="text-xs text-slate-500">E-book: {b.ebook_title ?? b.ebook_id}</div>
                      <div className="text-xs text-slate-500">{b.active ? "Active" : "Inactive"}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setBundleForm({
                            id: b.id,
                            course_id: b.course_id,
                            ebook_id: b.ebook_id,
                            active: b.active,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void deleteBundle(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {bundles.length === 0 && <div className="text-slate-500 text-sm">No bundles yet.</div>}
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ───────────── Content Builder ───────────── */}
      {tab === "content" && (
        <div className="mt-6 grid gap-6 2xl:grid-cols-[320px_1fr]">
          {/* Picker */}
          <Section title="Pick Course">
            <select
              className="h-10 w-full rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId((e.target as HTMLSelectElement).value)}
            >
              <option value="">— Choose a course —</option>
              {knowledge.map((k) => (
                <option key={k.id ?? k.slug} value={k.id}>
                  {k.title}
                </option>
              ))}
            </select>

            {selectedCourse && (
              <div className="mt-4 grid gap-2">
                <div className="text-sm font-semibold">Chapters</div>
                {chapters.map((ch) => (
                  <div key={ch.id ?? ch.title} className="flex items-center gap-2">
                    <button
                      onClick={() => setChForm(ch)}
                      className={`flex-1 text-left rounded-lg px-3 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 ${
                        chForm.id === (ch.id ?? "") ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium">{ch.title}</div>
                      <div className="text-xs text-slate-500">Order: {ch.order_index}</div>
                    </button>
                    <button
                      onClick={() => void deleteChapter(ch.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs"
                      title="Delete chapter"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {chapters.length === 0 && <div className="text-xs text-slate-500">No chapters yet.</div>}
              </div>
            )}
          </Section>

          {/* Builder */}
          <div className="grid gap-6">
            <Section title="Chapter">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Title</span>
                  <input
                    value={chForm.title}
                    onChange={(e) => setChForm((f) => ({ ...f, title: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Order</span>
                  <input
                    type="number"
                    value={chForm.order_index}
                    onChange={(e) =>
                      setChForm((f) => ({ ...f, order_index: Number((e.target as HTMLInputElement).value || 0) }))
                    }
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={saveChapter}
                  disabled={!selectedCourseId || !chForm.title.trim() || savingChapter}
                  className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {savingChapter ? "Saving…" : "Save Chapter"}
                </button>
                <button
                  onClick={() => setChForm({ ...emptyChapter, course_id: selectedCourseId })}
                  className="rounded-lg px-4 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                >
                  New Chapter
                </button>
              </div>
            </Section>

            <Section title="Slides (for this chapter)">
              <div className="grid gap-2">
                {slides.map((s) => (
                  <div key={s.id ?? s.title} className="flex items-center gap-2">
                    <button
                      onClick={() => setSlForm(s)}
                      className={`flex-1 text-left rounded-lg px-3 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 ${
                        slForm.id === (s.id ?? "") ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-slate-500">Order: {s.order_index}</div>
                    </button>
                    <button
                      onClick={() => void deleteSlide(s.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs"
                      title="Delete slide"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {slides.length === 0 && <div className="text-xs text-slate-500">No slides yet.</div>}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Title</span>
                    <input
                      value={slForm.title}
                      onChange={(e) => setSlForm((f) => ({ ...f, title: (e.target as HTMLInputElement).value }))}
                      className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Order</span>
                    <input
                      type="number"
                      value={slForm.order_index}
                      onChange={(e) =>
                        setSlForm((f) => ({ ...f, order_index: Number((e.target as HTMLInputElement).value || 0) }))
                      }
                      className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    />
                  </label>
                </div>

                <label className="grid gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Body / Notes (supports rich text)</span>
                    <span className="text-[11px] text-slate-400">Paste with formatting; saved as HTML</span>
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[120px] rounded-lg bg-white px-3 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                    onInput={(e) =>
                      setSlForm((f) => ({ ...f, body: (e.target as HTMLDivElement).innerHTML }))
                    }
                    dangerouslySetInnerHTML={{ __html: slForm.body ?? "" }}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Intro video URL</span>
                    <input
                      value={slForm.intro_video_url ?? ""}
                      onChange={(e) =>
                        setSlForm((f) => ({ ...f, intro_video_url: (e.target as HTMLInputElement).value }))
                      }
                      className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Asset URL (image/pdf)</span>
                    <input
                      value={slForm.asset_url ?? ""}
                      onChange={(e) => setSlForm((f) => ({ ...f, asset_url: (e.target as HTMLInputElement).value }))}
                      className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    />
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Upload Intro Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const f = (e.target as HTMLInputElement).files?.[0];
                        if (f) void onPick(f, "intro");
                      }}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Upload Asset (image/pdf)</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = (e.target as HTMLInputElement).files?.[0];
                        if (f) void onPick(f, "asset");
                      }}
                    />
                  </label>
                </div>
                {uploading && <div className="text-xs text-slate-500">Uploading…</div>}
                {!!uploadedUrl && <div className="text-xs break-all">Last upload: {uploadedUrl}</div>}

                <div className="flex gap-2">
                  <button
                    onClick={saveSlide}
                    disabled={!slForm.chapter_id || !slForm.title.trim() || savingSlide}
                    className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {savingSlide ? "Saving…" : "Save Slide"}
                  </button>
                  <button
                    onClick={() => setSlForm({ ...emptySlide, chapter_id: chForm.id ?? "" })}
                    className="rounded-lg px-4 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  >
                    New Slide
                  </button>
                </div>
              </div>
            </Section>

            {/* Chapter Quiz */}
            <Section title="Chapter Quiz">
              {chForm.id ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500">Time limit (seconds)</span>
                      <input
                        type="number"
                        value={quizSettings.time_limit_seconds ?? ""}
                        onChange={(e) =>
                          setQuizSettings((s) => ({
                            ...s,
                            chapter_id: chForm.id ?? "",
                            time_limit_seconds:
                              (e.target as HTMLInputElement).value === ""
                                ? null
                                : Number((e.target as HTMLInputElement).value),
                          }))
                        }
                        className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500"># randomized questions</span>
                      <input
                        type="number"
                        value={quizSettings.num_questions ?? ""}
                        onChange={(e) =>
                          setQuizSettings((s) => ({
                            ...s,
                            chapter_id: chForm.id ?? "",
                            num_questions:
                              (e.target as HTMLInputElement).value === ""
                                ? null
                                : Number((e.target as HTMLInputElement).value),
                          }))
                        }
                        className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveQuizSettings}
                      disabled={quizSaving}
                      className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {quizSaving ? "Saving…" : "Save Settings"}
                    </button>
                    <button
                      onClick={() => void refreshQuiz(chForm.id ?? "")}
                      className="rounded-lg px-4 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="text-sm font-semibold">Questions</div>
                    <div className="rounded-lg border border-dashed border-black/10 p-3 text-xs flex flex-col gap-2 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700">Bulk upload (CSV)</span>
                        <a href="/templates/quiz-bulk-template.csv" className="underline text-blue-700" download>
                          Download template
                        </a>
                      </div>
                      <p className="text-slate-500">
                        Columns: <code>chapter_id, question, options, correct_index</code>. Options separated by <code>;</code> or <code>|</code>.
                      </p>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => {
                          const f = (e.target as HTMLInputElement).files?.[0];
                          if (f) void uploadQuizCsv(f);
                        }}
                      />
                      {bulkQuizStatus && <div className="text-slate-600">{bulkQuizStatus}</div>}
                    </div>
                    <div className="grid gap-2">
                      {questions.map((q, i) => (
                        <div key={q.id ?? i} className="rounded-lg p-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30">
                          {editingQuestionId === (q.id ?? null) && editingQ ? (
                            <div className="grid gap-2">
                              <input
                                value={editingQ.question}
                                onChange={(e) =>
                                  setEditingQ((prev) =>
                                    prev ? { ...prev, question: (e.target as HTMLInputElement).value } : prev,
                                  )
                                }
                                className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                              />
                              <input
                                value={toCsv(editingQ.options)}
                                onChange={(e) =>
                                  setEditingQ((prev) =>
                                    prev
                                      ? { ...prev, options: fromCsv((e.target as HTMLInputElement).value) }
                                      : prev,
                                  )
                                }
                                className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                                placeholder="Options (comma separated)"
                              />
                              <input
                                type="number"
                                value={editingQ.correct_index}
                                onChange={(e) =>
                                  setEditingQ((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          correct_index: Number((e.target as HTMLInputElement).value || 0),
                                        }
                                      : prev,
                                  )
                                }
                                className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                                placeholder="Correct index (0-based)"
                              />
                              <div className="flex gap-2">
                                <button onClick={commitEditQuestion} className="px-3 py-1.5 rounded-lg bg-[#0a1156] text-white text-sm">
                                  Save
                                </button>
                                <button onClick={cancelEditQuestion} className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-medium">{q.question}</div>
                              <ol className="text-xs text-slate-500 mt-1 list-decimal ms-5">
                                {q.options.map((opt, idx) => (
                                  <li key={idx} className={idx === q.correct_index ? "text-slate-900" : ""}>
                                    {opt}
                                    {idx === q.correct_index ? "  ← correct" : ""}
                                  </li>
                                ))}
                              </ol>
                              <div className="mt-2 flex gap-2">
                                <button onClick={() => startEditQuestion(q)} className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm">
                                  Edit
                                </button>
                                <button onClick={() => void deleteQuestion(q.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm">
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {questions.length === 0 && <div className="text-xs text-slate-500">No questions yet.</div>}
                    </div>

                    {/* Quick add new */}
                    <div className="mt-2 grid gap-3">
                      <div className="text-sm font-semibold">Add New Question</div>
                      <label className="grid gap-1">
                        <span className="text-xs text-slate-500">Question</span>
                        <input
                          value={qForm.question}
                          onChange={(e) =>
                            setQForm((f) => ({
                              ...f,
                              chapter_id: chForm.id ?? "",
                              question: (e.target as HTMLInputElement).value,
                            }))
                          }
                          className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs text-slate-500">Options (comma separated)</span>
                        <input
                          value={toCsv(qForm.options)}
                          onChange={(e) =>
                            setQForm((f) => ({
                              ...f,
                              chapter_id: chForm.id ?? "",
                              options: fromCsv((e.target as HTMLInputElement).value),
                            }))
                          }
                          className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs text-slate-500">Correct index (0-based)</span>
                        <input
                          type="number"
                          value={qForm.correct_index}
                          onChange={(e) =>
                            setQForm((f) => ({
                              ...f,
                              chapter_id: chForm.id ?? "",
                              correct_index: Number((e.target as HTMLInputElement).value || 0),
                            }))
                          }
                          className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                        />
                      </label>
                      <div className="flex gap-2">
                        <button onClick={saveQuestion} className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90">
                          Save Question
                        </button>
                        <button
                          onClick={() =>
                            setQForm({
                              chapter_id: chForm.id ?? "",
                              question: "",
                              options: [],
                              correct_index: 0,
                              id: undefined,
                            })
                          }
                          className="rounded-lg px-4 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500">Pick or create a chapter first.</div>
              )}
            </Section>

            {/* FINAL EXAM */}
            <Section title="Final Exam (Course-wide)">
              {!selectedCourseId ? (
                <div className="text-xs text-slate-500">Pick a course to manage its Final Exam.</div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1 sm:col-span-2">
                      <span className="text-xs text-slate-500">Exam title</span>
                      <input
                        value={examForm.title}
                        onChange={(e) =>
                          setExamForm((f) => ({ ...f, course_id: selectedCourseId, title: (e.target as HTMLInputElement).value }))
                        }
                        className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500">Pass mark (%)</span>
                      <input
                        type="number"
                        value={examForm.pass_mark}
                        onChange={(e) =>
                          setExamForm((f) => ({ ...f, course_id: selectedCourseId, pass_mark: Number((e.target as HTMLInputElement).value || 0) }))
                        }
                        className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 mt-3">
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500">Time limit (minutes)</span>
                      <input
                        type="number"
                        value={examForm.time_limit_minutes ?? ""}
                        onChange={(e) =>
                          setExamForm((f) => ({
                            ...f,
                            course_id: selectedCourseId,
                            time_limit_minutes:
                              (e.target as HTMLInputElement).value === ""
                                ? null
                                : Number((e.target as HTMLInputElement).value),
                          }))
                        }
                        className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500">Number of questions</span>
                      <input
                        type="number"
                        value={examForm.num_questions ?? ""}
                        onChange={(e) =>
                          setExamForm((f) => ({
                            ...f,
                            course_id: selectedCourseId,
                            num_questions:
                              (e.target as HTMLInputElement).value === ""
                                ? null
                                : Math.max(1, Number((e.target as HTMLInputElement).value)),
                          }))
                        }
                        className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveExam}
                      disabled={examSaving}
                      className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {examSaving ? "Saving…" : exam?.id ? "Update Exam" : "Create Exam"}
                    </button>
                    {exam?.id && (
                      <button onClick={deleteExam} className="rounded-lg bg-red-600 text-white px-4 py-2 font-semibold">
                        Delete Exam
                      </button>
                    )}
                    {exam?.id && (
                      <button
                        onClick={() => void refreshExamQuestions(exam.id!)}
                        className="rounded-lg px-4 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                      >
                        Refresh
                      </button>
                    )}
                  </div>

                  {/* Exam Questions */}
                  {exam?.id ? (
                    <div className="mt-6 grid gap-3">
                      <div className="text-sm font-semibold">Exam Questions</div>
                    <div className="rounded-lg border border-dashed border-black/10 p-3 text-xs flex flex-col gap-2 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-700">Bulk upload (CSV)</span>
                          <a href="/templates/final-exam-bulk-template.csv" className="underline text-blue-700" download>
                            Download template
                          </a>
                        </div>
                        <p className="text-slate-500">
                          Columns: <code>exam_id, prompt, options, correct_index</code>. Options separated by <code>;</code> or <code>|</code>.
                        </p>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={(e) => {
                            const f = (e.target as HTMLInputElement).files?.[0];
                            if (f) void uploadExamCsv(f);
                          }}
                        />
                        {bulkExamStatus && <div className="text-slate-600">{bulkExamStatus}</div>}
                      </div>
                      <div className="grid gap-2">
                        {examQ.map((q, i) => (
                          <div key={q.id ?? i} className="rounded-lg p-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30">
                            {editingExamQId === (q.id ?? null) ? (
                              <div className="grid gap-2">
                                <input
                                  value={examQForm.prompt}
                                  onChange={(e) =>
                                    setExamQForm((f) => ({
                                      ...f,
                                      prompt: (e.target as HTMLInputElement).value,
                                      exam_id: exam.id!,
                                      id: q.id,
                                    }))
                                  }
                                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                                />
                                <input
                                  value={toCsv(examQForm.options)}
                                  onChange={(e) =>
                                    setExamQForm((f) => ({
                                      ...f,
                                      options: fromCsv((e.target as HTMLInputElement).value),
                                      exam_id: exam.id!,
                                      id: q.id,
                                    }))
                                  }
                                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                                  placeholder="Options (comma separated)"
                                />
                                <input
                                  type="number"
                                  value={examQForm.correct_index}
                                  onChange={(e) =>
                                    setExamQForm((f) => ({
                                      ...f,
                                      correct_index: Number((e.target as HTMLInputElement).value || 0),
                                      exam_id: exam.id!,
                                      id: q.id,
                                    }))
                                  }
                                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                                  placeholder="Correct index (0-based)"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => void saveExamQuestion()}
                                    className="px-3 py-1.5 rounded-lg bg-[#0a1156] text-white text-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditExamQuestion}
                                    className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-sm font-medium">{q.prompt}</div>
                                <ol className="text-xs text-slate-500 mt-1 list-decimal ms-5">
                                  {q.options.map((opt, idx) => (
                                    <li key={idx} className={idx === q.correct_index ? "text-slate-900" : ""}>
                                      {opt}
                                      {idx === q.correct_index ? "  ← correct" : ""}
                                    </li>
                                  ))}
                                </ol>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() => startEditExamQuestion(q)}
                                    className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => void deleteExamQuestion(q.id)}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        {examQ.length === 0 && <div className="text-xs text-slate-500">No questions yet.</div>}
                      </div>

                      <div className="mt-2 grid gap-3">
                        <div className="text-sm font-semibold">
                          {examQForm.id ? "Edit Exam Question" : "Add Exam Question"}
                          {examQForm.id && (
                            <span className="ms-2 text-xs text-slate-500">(saving will update this question)</span>
                          )}
                        </div>
                        <label className="grid gap-1">
                          <span className="text-xs text-slate-500">Question</span>
                          <input
                            value={examQForm.prompt}
                            onChange={(e) =>
                              setExamQForm((f) => ({
                                ...f,
                                exam_id: exam.id!,
                                prompt: (e.target as HTMLInputElement).value,
                              }))
                            }
                            className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs text-slate-500">Options (comma separated)</span>
                          <input
                            value={toCsv(examQForm.options)}
                            onChange={(e) =>
                              setExamQForm((f) => ({
                                ...f,
                                exam_id: exam.id!,
                                options: fromCsv((e.target as HTMLInputElement).value),
                              }))
                            }
                            className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs text-slate-500">Correct index (0-based)</span>
                          <input
                            type="number"
                            value={examQForm.correct_index}
                            onChange={(e) =>
                              setExamQForm((f) => ({
                                ...f,
                                exam_id: exam.id!,
                                correct_index: Number((e.target as HTMLInputElement).value || 0),
                              }))
                            }
                            className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={saveExamQuestion}
                            className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
                          >
                            Save Question
                          </button>
                          <button
                            onClick={() =>
                              setExamQForm({ exam_id: exam.id!, prompt: "", options: [], correct_index: 0 })
                            }
                            className="rounded-lg px-4 py-2 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </Section>
          </div>
        </div>
      )}

      {/* ───────────── Prices ───────────── */}
      {tab === "prices" && (
        <div className="mt-6 grid gap-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Prices</h2>
              <p className="text-xs text-slate-500">
                Edit every paid item in one place. All prices are charged in GH₵.
              </p>
            </div>
            <input
              placeholder="Search by title…"
              value={priceSearch}
              onChange={(e) => setPriceSearch((e.target as HTMLInputElement).value)}
              className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 w-full sm:w-80"
            />
          </div>

          <Section
            title="Courses"
            right={<span className="text-xs text-slate-500">{coursePriceRows.length} item(s)</span>}
          >
            <PriceTable rows={coursePriceRows} onSave={savePrice} emptyLabel="No courses." />
          </Section>

          <Section
            title="E-books (digital)"
            right={<span className="text-xs text-slate-500">{ebookDigitalRows.length} item(s)</span>}
          >
            <PriceTable rows={ebookDigitalRows} onSave={savePrice} emptyLabel="No e-books." />
          </Section>

          <Section
            title="Physical books (printed copies)"
            right={<span className="text-xs text-slate-500">Blank/0 uses the digital price</span>}
          >
            <PriceTable rows={ebookPhysicalRows} onSave={savePrice} emptyLabel="No e-books." />
          </Section>
        </div>
      )}

      {/* ───────────── Media ───────────── */}
      {tab === "media" && (
        <div className="mt-6">
          <Section title="Upload to Supabase Storage (public)">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) {
                    void (async () => {
                      setUploading(true);
                      const url = await uploadToStorage(f);
                      setUploading(false);
                      if (url) setUploadedUrl(url);
                    })();
                  }
                }}
              />
              <span className="text-sm">{uploading ? "Uploading…" : ""}</span>
            </div>
            {uploadedUrl && uploadedUrl.startsWith("http") && (
              <div className="mt-4">
                <div className="text-sm mb-2">Preview:</div>
                <Image
                  src={uploadedUrl}
                  alt="Uploaded"
                  width={320}
                  height={180}
                  className="rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 object-cover"
                />
                <div className="text-sm mt-2">URL:</div>
                <code className="text-xs break-all">{uploadedUrl}</code>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ───────────── Users ───────────── */}
      {tab === "users" && (
        <div className="mt-6 grid gap-6">
          <Section
            title="Users"
            right={
              <div className="flex items-center gap-2">
                <input
                  placeholder="Search email or id…"
                  value={userQuery}
                  onChange={(e) => setUserQuery((e.target as HTMLInputElement).value)}
                  className="h-9 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 w-60"
                />
                <button onClick={refreshUsers} className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm">
                  {usersLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            }
          >
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Created</th>
                    <th className="py-2 pr-3">Confirmed</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 w-[540px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-t border-[color:var(--color-light)]/40">
                      <td className="py-2 pr-3">
                        <div className="font-semibold">{u.email ?? u.id}</div>
                        <div className="text-xs text-slate-500">
                          {u.full_name || "—"} {u.highest_education ? `· ${u.highest_education}` : ""}{" "}
                          {u.date_of_birth ? `· DOB: ${u.date_of_birth}` : ""}
                        </div>
                        <div className="text-xs text-slate-500">
                          {u.country_name || u.country_code || "—"}
                        </div>
                      </td>
                      <td className="py-2 pr-3">{u.created_at ?? "—"}</td>
                      <td className="py-2 pr-3">{u.email_confirmed_at ? "Yes" : "No"}</td>
                      <td className="py-2 pr-3">{u.banned ? "Banned" : "Active"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedPurchases(null);
                              void loadPurchases(u.id);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-xs"
                          >
                            View
                          </button>
                          {u.banned ? (
                            <button
                              onClick={() => void act(u.id, "unban")}
                              disabled={userActionBusy === `unban:${u.id}`}
                              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs disabled:opacity-50"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => void act(u.id, "ban")}
                              disabled={userActionBusy === `ban:${u.id}`}
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs disabled:opacity-50"
                            >
                              Ban
                            </button>
                          )}
                          <button
                            onClick={() => void act(u.id, "revoke")}
                            disabled={userActionBusy === `revoke:${u.id}`}
                            className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-xs disabled:opacity-50"
                          >
                            Revoke Sessions
                          </button>
                          <button
                            onClick={() => void act(u.id, "clear-history")}
                            disabled={userActionBusy === `clear-history:${u.id}`}
                            className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-xs disabled:opacity-50"
                          >
                            Clear History
                          </button>
                          <button
                            onClick={() => void act(u.id, "delete")}
                            disabled={userActionBusy === `delete:${u.id}`}
                            className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs disabled:opacity-50"
                          >
                            Delete User
                          </button>
                          <button
                            onClick={() => void generateConfirmLink(u.email)}
                            className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-xs"
                          >
                            Copy Confirm Link
                          </button>
                          <button
                            onClick={() => void generateResetLink(u.email)}
                            className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-xs"
                          >
                            Copy Reset Link
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-sm text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Drawer */}
            {selectedUser && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => {
                    setSelectedUser(null);
                    setSelectedPurchases(null);
                  }}
                />
                <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white border border-[color:var(--color-light)]/40 p-5 max-h-[90vh] overflow-auto shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">User Details</div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setSelectedPurchases(null);
                      }}
                      className="text-sm"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">ID:</span> {selectedUser.id}
                    </div>
                    <div>
                      <span className="text-slate-500">Email:</span> {selectedUser.email ?? "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Name:</span> {selectedUser.full_name || "—"}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500">Date of birth:</span>{" "}
                        {selectedUser.date_of_birth || "—"}
                      </div>
                      <div>
                        <span className="text-slate-500">Education:</span>{" "}
                        {selectedUser.highest_education || "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Country:</span>{" "}
                      {selectedUser.country_name || selectedUser.country_code || "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Created:</span> {selectedUser.created_at ?? "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Confirmed:</span>{" "}
                      {selectedUser.email_confirmed_at ? "Yes" : "No"}
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span> {selectedUser.banned ? "Banned" : "Active"}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg p-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30">
                      <div className="font-medium">Certificates</div>
                      <ul className="mt-2 text-sm list-disc ms-5 space-y-1">
                        {(selectedUser.certificates ?? []).map((c) => (
                          <li key={c.id} className="flex items-center gap-2">
                            <span>{c.course_title || "Course"}</span>
                            <a
                              href={`/verify?cert_id=${encodeURIComponent(c.id)}`}
                              className="text-[11px] underline text-[color:var(--color-brand)]"
                              target="_blank"
                              rel="noreferrer"
                            >
                              View certificate
                            </a>
                          </li>
                        ))}
                        {(selectedUser.certificates?.length ?? 0) === 0 && <li className="text-slate-500">None</li>}
                      </ul>
                    </div>
                    <div className="rounded-lg p-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30">
                      <div className="font-medium">Courses Purchased</div>
                      <ul className="mt-2 text-sm list-disc ms-5 space-y-1">
                        {(selectedPurchases?.courses ?? []).map((c, i) => {
                          const courseId = (c as { course_id?: string; id?: string }).course_id || (c as { id?: string }).id || "";
                          return (
                            <li key={i} className="flex items-center gap-2">
                              <span>{c.title}</span>
                              {courseId && (
                                <div className="flex flex-wrap gap-1 text-[11px]">
                                  <button
                                    onClick={() => void unlockCourse(courseId)}
                                    disabled={courseActionBusy === `unlock:${courseId}`}
                                    className="rounded bg-green-100 px-2 py-0.5 text-green-800 disabled:opacity-50"
                                  >
                                    {courseActionBusy === `unlock:${courseId}` ? "Unlocking…" : "Unlock final exam"}
                                  </button>
                                  <button
                                    onClick={() => void resetCourse("exam", courseId)}
                                    disabled={courseActionBusy === `exam:${courseId}`}
                                    className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 disabled:opacity-50"
                                  >
                                    {courseActionBusy === `exam:${courseId}` ? "Resetting…" : "Reset exam"}
                                  </button>
                                  <button
                                    onClick={() => void resetCourse("course", courseId)}
                                    disabled={courseActionBusy === `course:${courseId}`}
                                    className="rounded bg-blue-100 px-2 py-0.5 text-blue-800 disabled:opacity-50"
                                  >
                                    {courseActionBusy === `course:${courseId}` ? "Resetting…" : "Reset course"}
                                  </button>
                                  <button
                                    onClick={() => void removePurchase("course", courseId)}
                                    className="rounded bg-red-100 px-2 py-0.5 text-red-800"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                        {(selectedPurchases?.courses?.length ?? 0) === 0 && <li className="text-slate-500">None</li>}
                      </ul>
                    </div>
                    <div className="rounded-lg p-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30">
                      <div className="font-medium">E-books Purchased</div>
                      <ul className="mt-2 text-sm list-disc ms-5 space-y-1">
                        {(selectedPurchases?.ebooks ?? []).map((e, i) => {
                          const ebookId = (e as { ebook_id?: string; id?: string }).ebook_id || (e as { id?: string }).id || "";
                          return (
                            <li key={i} className="flex items-center gap-2">
                              <span>{e.title}</span>
                              {ebookId && (
                                <button
                                  onClick={() => void removePurchase("ebook", ebookId)}
                                  className="text-[11px] rounded bg-red-100 px-2 py-0.5 text-red-800"
                                >
                                  Remove
                                </button>
                              )}
                            </li>
                          );
                        })}
                        {(selectedPurchases?.ebooks?.length ?? 0) === 0 && <li className="text-slate-500">None</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ───────────── Purchases ───────────── */}
      {tab === "purchases" && (
        <div className="mt-6 grid gap-6">
          <Section
            title="Purchases"
            right={
              <button
                onClick={refreshPurchases}
                className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-sm"
              >
                {purchasesLoading ? "Refreshing…" : "Refresh"}
              </button>
            }
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Search</span>
                <input
                  placeholder="Search user, item, reference…"
                  value={purchaseQuery}
                  onChange={(e) => setPurchaseQuery((e.target as HTMLInputElement).value)}
                  className="h-9 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 w-64"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Range</span>
                <select
                  value={purchaseRange}
                  onChange={(e) => setPurchaseRange((e.target as HTMLSelectElement).value as PurchaseRange)}
                  className="h-9 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                >
                  <option value="all">All time</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                  <option value="quarter">This quarter</option>
                  <option value="year">This year</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {purchaseRange === "custom" && (
                <>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Start</span>
                    <ModernDatePicker
                      value={purchaseStart}
                      onChange={setPurchaseStart}
                      max={purchaseEnd || undefined}
                      allowClear
                      className="h-9 w-full rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-left"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">End</span>
                    <ModernDatePicker
                      value={purchaseEnd}
                      onChange={setPurchaseEnd}
                      min={purchaseStart || undefined}
                      allowClear
                      className="h-9 w-full rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 text-left"
                    />
                  </label>
                </>
              )}
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Status</span>
                <select
                  value={purchaseStatus}
                  onChange={(e) => setPurchaseStatus((e.target as HTMLSelectElement).value as PurchaseStatusFilter)}
                  className="h-9 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Showing {purchaseRangeLabel.toLowerCase()} · {filteredPurchases.length} records
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[color:var(--color-light)]/40 p-3 shadow-sm">
                <div className="text-xs text-slate-500">Paid total</div>
                <div className="text-lg font-semibold">
                  {Object.keys(purchaseTotals.byCurrency).length === 0 && "—"}
                  {Object.entries(purchaseTotals.byCurrency).map(([code, minor], idx) => (
                    <span key={code}>
                      {idx > 0 ? " · " : ""}
                      {formatMoney(minor, code)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-[color:var(--color-light)]/40 p-3 shadow-sm">
                <div className="text-xs text-slate-500">Transactions</div>
                <div className="text-lg font-semibold">{purchaseTotals.totalCount}</div>
              </div>
              <div className="rounded-lg border border-[color:var(--color-light)]/40 p-3 shadow-sm">
                <div className="text-xs text-slate-500">Paid</div>
                <div className="text-lg font-semibold">{purchaseTotals.paidCount}</div>
              </div>
              <div className="rounded-lg border border-[color:var(--color-light)]/40 p-3 shadow-sm">
                <div className="text-xs text-slate-500">Pending / Failed</div>
                <div className="text-lg font-semibold">
                  {purchaseTotals.pendingCount} / {purchaseTotals.failedCount}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((p) => {
                    const statusText = (p.status ?? "").toLowerCase();
                    const isFailed =
                      statusText.includes("failed") ||
                      statusText.includes("abandoned") ||
                      statusText.includes("cancel");
                    const statusLabel = p.is_paid ? "Paid" : isFailed ? "Failed" : "Pending";
                    const statusClass = p.is_paid
                      ? "bg-green-100 text-green-800"
                      : isFailed
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800";
                    return (
                      <tr key={p.id} className="border-t border-[color:var(--color-light)]/40">
                        <td className="py-2 pr-3 align-top">
                          <div className="font-medium">{formatDateTime(pickPurchaseTime(p))}</div>
                          <div className="text-xs text-slate-500">
                            {p.paid_at ? "paid_at" : p.updated_at ? "updated_at" : "created_at"}
                          </div>
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <div className="font-medium">{p.item_title}</div>
                          <div className="text-xs text-slate-500">
                            {p.kind} · {p.item_id}
                          </div>
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <div className="font-medium">{p.user_email ?? p.user_id}</div>
                          {p.user_email && (
                            <div className="text-xs text-slate-500">{p.user_id}</div>
                          )}
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <div className="font-medium">{formatMoney(p.amount_minor, p.currency)}</div>
                          <div className="text-xs text-slate-500">{p.currency ?? "—"}</div>
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
                            {statusLabel}
                          </span>
                          {p.status && (
                            <div className="text-xs text-slate-500 mt-1">{p.status}</div>
                          )}
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <div className="font-medium">{p.reference ?? "—"}</div>
                          <div className="text-xs text-slate-500">{p.provider ?? "—"}</div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-sm text-slate-500">
                        No purchases found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {/* ───────────── Physical Orders ───────────── */}
      {tab === "orders" && (
        <div className="mt-6 grid gap-6">
          <Section
            title="Physical book orders"
            right={
              <button
                onClick={refreshOrders}
                className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm text-sm"
              >
                {ordersLoading ? "Refreshing…" : "Refresh"}
              </button>
            }
          >
            {ordersSetupRequired && (
              <div className="mb-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                The <code>physical_orders</code> table was not found. Run{" "}
                <code>supabase/physical_store.sql</code> in your Supabase project to enable orders.
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Search</span>
                <input
                  placeholder="Name, email, phone, ref…"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery((e.target as HTMLInputElement).value)}
                  className="h-9 w-64 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Status</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter((e.target as HTMLSelectElement).value as typeof orderStatusFilter)}
                  className="h-9 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="new">New</option>
                  <option value="processing">Processing</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <div className="text-xs text-slate-500">
                {orders.filter((o) => o.status === "new").length} new ·{" "}
                {orders.length} total
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {orders
                .filter((o) => orderStatusFilter === "all" || o.status === orderStatusFilter)
                .filter((o) => {
                  const q = orderQuery.trim().toLowerCase();
                  if (!q) return true;
                  return [o.customer_name, o.email, o.phone, o.order_ref, o.ebook_title ?? ""]
                    .join(" ")
                    .toLowerCase()
                    .includes(q);
                })
                .map((o) => {
                  const statusClass =
                    o.status === "fulfilled"
                      ? "bg-green-100 text-green-800"
                      : o.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : o.status === "processing"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800";
                  return (
                    <div key={o.id} className="rounded-xl border border-[color:var(--color-light)]/40 p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{o.ebook_title ?? o.ebook_slug ?? "—"}</span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
                              {o.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {o.order_ref} · {formatDateTime(o.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatMoney(o.total_cents, "GHS")}</div>
                          <div className="text-xs text-slate-500">
                            {o.quantity} × {formatMoney(o.unit_price_cents, "GHS")}
                            {o.discount_cents > 0 && ` · −${formatMoney(o.discount_cents, "GHS")}`}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <div className="text-xs text-slate-500">Customer</div>
                          <div className="font-medium">{o.customer_name}</div>
                          <div className="text-xs">{o.email}</div>
                          <div className="text-xs">{o.phone}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 capitalize">{o.fulfillment}</div>
                          {o.fulfillment === "delivery" ? (
                            <div className="text-xs">
                              {o.street}
                              <br />
                              {o.city}
                              {o.city && o.region ? ", " : ""}
                              {o.region}
                            </div>
                          ) : (
                            <div className="text-xs">Pickup at office</div>
                          )}
                        </div>
                        <div>
                          {o.voucher_code && (
                            <>
                              <div className="text-xs text-slate-500">Voucher</div>
                              <div className="text-xs font-medium">{o.voucher_code}</div>
                            </>
                          )}
                          {o.notes && (
                            <>
                              <div className="mt-1 text-xs text-slate-500">Notes</div>
                              <div className="text-xs">{o.notes}</div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={o.status}
                          onChange={(e) => void updateOrderStatus(o.id, (e.target as HTMLSelectElement).value as PhysicalOrder["status"])}
                          className="h-9 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm text-sm"
                        >
                          <option value="new">New</option>
                          <option value="processing">Processing</option>
                          <option value="fulfilled">Fulfilled</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <a
                          href={`mailto:${o.email}`}
                          className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm text-sm"
                        >
                          Email
                        </a>
                        <button
                          onClick={() => void deleteOrder(o.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              {orders.length === 0 && !ordersLoading && (
                <div className="text-sm text-slate-500">No orders yet.</div>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ───────────── Discount Vouchers ───────────── */}
      {tab === "vouchers" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Section title="Create voucher code">
            {vouchersSetupRequired && (
              <div className="mb-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                The <code>vouchers</code> table was not found. Run{" "}
                <code>supabase/physical_store.sql</code> in your Supabase project to enable vouchers.
              </div>
            )}
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Code (leave blank to auto-generate)</span>
                <input
                  value={voucherForm.code}
                  onChange={(e) => setVoucherForm((f) => ({ ...f, code: (e.target as HTMLInputElement).value.toUpperCase() }))}
                  placeholder="e.g. WELCOME10"
                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm uppercase"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Discount type</span>
                  <select
                    value={voucherForm.discount_type}
                    onChange={(e) => setVoucherForm((f) => ({ ...f, discount_type: (e.target as HTMLSelectElement).value as "percent" | "fixed" }))}
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed amount (GH₵)</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">
                    {voucherForm.discount_type === "percent" ? "Percent off (1–100)" : "Amount off (GH₵)"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={voucherForm.discount_type === "percent" ? 1 : 0.01}
                    value={String(voucherForm.discount_value)}
                    onChange={(e) => setVoucherForm((f) => ({ ...f, discount_value: Number((e.target as HTMLInputElement).value) }))}
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Max uses (blank = unlimited)</span>
                  <input
                    type="number"
                    min={1}
                    value={voucherForm.max_uses}
                    onChange={(e) => setVoucherForm((f) => ({ ...f, max_uses: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Min order subtotal (GH₵, optional)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={voucherForm.min_subtotal}
                    onChange={(e) => setVoucherForm((f) => ({ ...f, min_subtotal: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm"
                  />
                </label>
              </div>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Expires (optional)</span>
                <input
                  type="date"
                  value={voucherForm.expires_at}
                  onChange={(e) => setVoucherForm((f) => ({ ...f, expires_at: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm"
                />
              </label>
              <div>
                <button
                  onClick={() => void createVoucher()}
                  disabled={creatingVoucher}
                  className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {creatingVoucher ? "Creating…" : "Generate voucher"}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Voucher codes work on the physical-copy order form and on digital e-book checkout.
              </p>
            </div>
          </Section>

          <Section
            title="Voucher codes"
            right={
              <button
                onClick={refreshVouchers}
                className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm text-sm"
              >
                {vouchersLoading ? "Refreshing…" : "Refresh"}
              </button>
            }
          >
            <div className="grid gap-2">
              {vouchers.map((v) => {
                const expired = v.expires_at ? new Date(v.expires_at).getTime() <= Date.now() : false;
                const exhausted = v.max_uses != null && v.used_count >= v.max_uses;
                return (
                  <div key={v.id} className="flex items-start justify-between gap-3 rounded-lg border border-[color:var(--color-light)]/40 p-3 shadow-sm">
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{v.code}</span>
                        {!v.active && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">Inactive</span>}
                        {expired && <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">Expired</span>}
                        {exhausted && <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">Used up</span>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {v.discount_type === "percent"
                          ? `${v.discount_value}% off`
                          : `${formatMoney(v.discount_value, "GHS")} off`}
                        {" · "}
                        {v.used_count}
                        {v.max_uses != null ? `/${v.max_uses}` : ""} used
                        {v.min_subtotal_cents > 0 && ` · min ${formatMoney(v.min_subtotal_cents, "GHS")}`}
                        {v.expires_at && ` · expires ${formatDateTime(v.expires_at)}`}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => void toggleVoucher(v)}
                        className="px-3 py-1.5 rounded-lg border border-[color:var(--color-light)]/40 shadow-sm text-sm"
                      >
                        {v.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => void deleteVoucher(v.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {vouchers.length === 0 && !vouchersLoading && (
                <div className="text-sm text-slate-500">No vouchers yet.</div>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ───────────── SCM AI Glossary ───────────── */}
      {tab === "ai" && <AiGlossaryAdmin />}

      {/* ───────────── Deploy ───────────── */}
      {tab === "deploy" && (
        <div className="mt-6">
          <Section title="Deployment">
            <p className="text-sm text-slate-500">
              Trigger a Vercel rebuild (requires <code>VERCEL_DEPLOY_HOOK_URL</code>).
            </p>
            <button onClick={triggerDeploy} className="mt-3 rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90">
              Trigger Deploy
            </button>
          </Section>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Subcomponent: PriceTable ───────────────────── */
type PriceFieldKind = "course" | "ebook_digital" | "ebook_physical";
function PriceTable({
  rows,
  onSave,
  emptyLabel,
}: {
  rows: Array<{ field: PriceFieldKind; id: string; title: string; price: number; currency: "GHS" | "USD" }>;
  onSave: (r: { field: PriceFieldKind; id: string; price: number }) => Promise<void>;
  emptyLabel: string;
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="py-2 pr-3">Title</th>
            <th className="py-2 pr-3">Price</th>
            <th className="py-2 pr-3 w-32">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <PriceRow key={`${r.field}-${r.id}`} row={r} onSave={onSave} />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-3 text-sm text-slate-500">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────────── Subcomponent: PriceRow ───────────────────── */
function PriceRow({
  row,
  onSave,
}: {
  row: { field: "course" | "ebook_digital" | "ebook_physical"; id: string; title: string; price: number; currency: "GHS" | "USD" };
  onSave: (r: { field: "course" | "ebook_digital" | "ebook_physical"; id: string; price: number }) => Promise<void>;
}) {
  const [val, setVal] = useState<string>(row.price.toString());
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setVal(row.price.toString());
  }, [row.price]);

  async function handleSave() {
    const p = Number(val);
    if (!Number.isFinite(p) || p < 0) return alert("Enter a valid price");
    setSaving(true);
    await onSave({ field: row.field, id: row.id, price: p });
    setSaving(false);
  }

  return (
    <tr className="border-t border-[color:var(--color-light)]/40">
      <td className="py-2 pr-3">{row.title}</td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{row.currency}</span>
          <input
            value={val}
            onChange={(e) => setVal((e.target as HTMLInputElement).value)}
            className="h-9 w-32 rounded-lg bg-white px-3 border border-[color:var(--color-light)]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
          />
        </div>
      </td>
      <td className="py-2 pr-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-[#0a1156] text-white text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
