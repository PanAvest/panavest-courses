"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import styles from "./ai.module.css";

type Entry = {
  id?: string;
  term: string;
  definition: string;
  synonyms?: string;
  tags?: string;
  pronunciation?: string;
  pos?: string;
  examples?: string;
  [key: string]: unknown;
};

type MessageRole = "user" | "assistant";

type MessageSections = {
  concept: string;
  example: string;
  caseStudy: string;
};

type MessageImage = {
  url?: string;
  altUrl?: string;
  loading?: boolean;
  error?: string;
};

type MessageMeta = {
  term?: string;
  sections?: Partial<MessageSections>;
  image?: MessageImage;
  actions?: string[];
  entry?: Entry;
  mode?: "db" | "ai";
};

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  meta?: MessageMeta;
  status?: "idle" | "streaming" | "done" | "error";
  timestamp?: number;
};

type CSVRow = Record<string, string | undefined>;

type PapaParseResult = {
  data: CSVRow[];
};

type PapaParse = {
  parse: (csv: string, options: { header: boolean; skipEmptyLines: boolean }) => PapaParseResult;
};

type FuseSearchResult = {
  item: Entry;
};

type FuseInstance = {
  search: (query: string) => FuseSearchResult[];
};

type FuseConstructor = new (
  data: Entry[],
  options: {
    keys: Array<{ name: string; weight: number }>;
    threshold: number;
    includeScore: boolean;
  }
) => FuseInstance;

type TransformersPipeline = (prompt: string, opts: { max_new_tokens: number }) => Promise<Array<{ generated_text?: string }>>;

type TransformersLib = {
  pipeline: (task: string, model: string) => Promise<TransformersPipeline>;
};

type TransformersModule = {
  default?: TransformersLib;
  pipeline?: TransformersLib["pipeline"];
};

type ImageApiResponse = {
  url?: string;
  thumbnail?: string;
  link?: string;
  error?: string;
};

const USE_TRANSFORMERS = process.env.NEXT_PUBLIC_USE_TRANSFORMERS === "true";

const DEFAULT_ACTIONS = ["read", "explain", "details", "copy", "regen", "images"] as const;

type WindowWithGlobals = Window & {
  Fuse?: FuseConstructor;
  Papa?: PapaParse;
  transformers?: TransformersLib;
  Transformers?: TransformersLib;
};

type TTS = {
  speak: (id: string, text: string) => void;
  speakingId: string | null;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (value: string) => void;
};

const uuid = () => Math.random().toString(36).substring(2, 9);

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripHtml = (input: string) => input.replace(/<[^>]*>/g, "");

const stripMarkdown = (input: string) =>
  input
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

const buildCaseStudy = (entry: Entry) => {
  const sector = entry.tags?.split(",")[0]?.trim();
  const industry = sector ? sector.toLowerCase() : "manufacturing";
  return `In West Africa, a ${industry} company applied ${entry.term} to reduce delays, stabilize sourcing, and improve service levels across regional distribution hubs.`;
};

const buildFallbackSections = (entry: Entry): MessageSections => {
  const concept = entry.definition || `${entry.term} is a supply chain concept.`;
  const example =
    entry.examples ||
    `A practical example is when a company uses ${entry.term} to improve planning and execution across suppliers and logistics partners.`;
  return {
    concept,
    example,
    caseStudy: buildCaseStudy(entry),
  };
};

const buildFallbackMarkdown = (entry: Entry) => {
  const sections = buildFallbackSections(entry);
  return `### Concept\n${sections.concept}\n\n### Real-World Example\n${sections.example}\n\n### Region-Tailored Case Study\n${sections.caseStudy}`;
};

const normalizeMarkdown = (raw: string, entry: Entry) => {
  const base = stripHtml(raw || "").trim();
  if (!base) return buildFallbackMarkdown(entry);

  let text = base;
  const fallback = buildFallbackSections(entry);

  if (!/#+\s*Concept/i.test(text)) {
    text = `### Concept\n${text}`;
  }

  if (!/#+\s*Real[- ]World Example/i.test(text)) {
    text += `\n\n### Real-World Example\n${fallback.example}`;
  }

  if (!/#+\s*Region[- ]Tailored Case Study/i.test(text)) {
    text += `\n\n### Region-Tailored Case Study\n${fallback.caseStudy}`;
  }

  return text.trim();
};

const parseSections = (content: string, entry: Entry): MessageSections => {
  const fallback = buildFallbackSections(entry);
  if (!content) return fallback;

  const normalized = content.replace(/\r/g, "");
  const sections: Partial<MessageSections> = {};

  const headingRegex =
    /(?:^|\n)#{2,}\s*(Concept|Real[- ]World Example|Real World Example|Example|Region[- ]Tailored Case Study|Case Study)\s*\n([\s\S]*?)(?=\n#{2,}\s*|$)/gi;
  let match: RegExpExecArray | null = null;

  while ((match = headingRegex.exec(normalized)) !== null) {
    const label = match[1]?.toLowerCase() || "";
    const body = (match[2] || "").trim();
    if (!body) continue;
    if (label.includes("concept")) sections.concept = body;
    if (label.includes("case")) sections.caseStudy = body;
    if (label.includes("example")) sections.example = body;
  }

  if (!sections.concept || !sections.example || !sections.caseStudy) {
    const labelRegex =
      /(?:^|\n)\s*(Concept|Real[- ]World Example|Real World Example|Example|Region[- ]Tailored Case Study|Case Study)\s*:\s*([\s\S]*?)(?=\n\s*(Concept|Real[- ]World Example|Real World Example|Example|Region[- ]Tailored Case Study|Case Study)\s*:|$)/gi;
    while ((match = labelRegex.exec(normalized)) !== null) {
      const label = match[1]?.toLowerCase() || "";
      const body = (match[2] || "").trim();
      if (!body) continue;
      if (!sections.concept && label.includes("concept")) sections.concept = body;
      if (!sections.caseStudy && label.includes("case")) sections.caseStudy = body;
      if (!sections.example && label.includes("example")) sections.example = body;
    }
  }

  return {
    concept: sections.concept || fallback.concept,
    example: sections.example || fallback.example,
    caseStudy: sections.caseStudy || fallback.caseStudy,
  };
};

const markdownToHtml = (input: string) => {
  if (!input) return "";
  let text = escapeHtml(input);
  const listBlocks: string[] = [];

  text = text.replace(/(?:^|\n)(- .+(?:\n- .+)*)/g, (match) => {
    const items = match
      .trim()
      .split("\n")
      .map((line) => line.replace(/^- /, "").trim())
      .filter(Boolean);
    if (!items.length) return match;
    const html = `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    const token = `@@LIST${listBlocks.length}@@`;
    listBlocks.push(html);
    return `\n${token}`;
  });

  text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(?!\*)([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\n/g, "<br/>");

  listBlocks.forEach((html, idx) => {
    text = text.replace(`@@LIST${idx}@@`, html);
  });

  return text;
};

const buildSpeechText = (entry: Entry, sections: MessageSections) => {
  const parts = [entry.term];
  if (sections.concept) parts.push(`Concept. ${stripMarkdown(sections.concept)}`);
  if (sections.example) parts.push(`Real-world example. ${stripMarkdown(sections.example)}`);
  if (sections.caseStudy) parts.push(`Region-tailored case study. ${stripMarkdown(sections.caseStudy)}`);
  return parts.join(" ").trim();
};

const buildDefinitionSpeech = (entry: Entry) => {
  const definition = stripMarkdown(entry.definition || "").trim();
  if (!definition) return entry.term;
  return `${entry.term}. Definition. ${definition}`;
};

const buildCopyText = (entry: Entry, sections: MessageSections) => {
  return [
    entry.term,
    "",
    "Concept:",
    stripMarkdown(sections.concept),
    "",
    "Real-World Example:",
    stripMarkdown(sections.example),
    "",
    "Region-Tailored Case Study:",
    stripMarkdown(sections.caseStudy),
  ].join("\n");
};

const buildDefinitionCopy = (entry: Entry) => {
  const definition = stripMarkdown(entry.definition || "").trim();
  return [entry.term, "", "Definition:", definition].join("\n");
};

const MarkdownBlock = ({ text, className }: { text: string; className?: string }) => {
  const html = useMemo(() => markdownToHtml(text), [text]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

const loadScript = <T,>(src: string, globalName: keyof WindowWithGlobals) =>
  new Promise<T>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window unavailable"));
      return;
    }
    const win = window as WindowWithGlobals;
    const existing = win[globalName];
    if (existing) return resolve(existing as T);
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      const value = (window as WindowWithGlobals)[globalName];
      if (!value) {
        reject(new Error(`Failed to load ${src}`));
        return;
      }
      resolve(value as T);
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

function useData() {
  const [data, setData] = useState<Entry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">("loading");
  const papaRef = useRef<PapaParse | null>(null);
  const fuseLibRef = useRef<FuseConstructor | null>(null);
  const fuseRef = useRef<FuseInstance | null>(null);

  const processCSV = useCallback((csv: string) => {
    if (!papaRef.current) return;
    try {
      const res = papaRef.current.parse(csv, { header: true, skipEmptyLines: true });
      const entries = res.data
        .map((r: CSVRow) => ({
          term: (r.term || r.Term || "").trim(),
          definition: (r.definition || r.Definition || "").trim(),
          synonyms: r.synonyms || r.Synonyms || "",
          tags: r.tags || r.Tags || "",
          pos: r.pos || r.Pos || "",
          pronunciation: r.pronunciation || r.Pronunciation || "",
          examples: r.examples || r.Examples || "",
        }))
        .filter((e: Entry) => e.term && e.definition);

      if (entries.length) {
        setData(entries);
        if (fuseLibRef.current) {
          fuseRef.current = new fuseLibRef.current(entries, {
            keys: [
              { name: "term", weight: 0.7 },
              { name: "definition", weight: 0.3 },
              { name: "tags", weight: 0.1 },
            ],
            threshold: 0.3,
            includeScore: true,
          });
        }
        setStatus("ready");
      } else {
        setStatus("empty");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadScript<FuseConstructor>("https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.basic.min.js", "Fuse"),
      loadScript<PapaParse>("https://cdn.jsdelivr.net/npm/papaparse@5.3.0/papaparse.min.js", "Papa"),
    ])
      .then(([F, P]) => {
        if (!mounted) return;
        fuseLibRef.current = F;
        papaRef.current = P;
        return fetch("/scmpedia_full.csv");
      })
      .then((r) => (r?.ok ? r.text() : Promise.reject(new Error("Failed to load CSV"))))
      .then((text) => {
        if (!mounted) return;
        processCSV(text as string);
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("empty");
      });

    return () => {
      mounted = false;
    };
  }, [processCSV]);

  return { data, status, processCSV, fuseRef };
}

function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    synthRef.current = window.speechSynthesis;
  }, []);

  useEffect(() => {
    const synth = synthRef.current;
    if (!synth) return;

    const load = () => {
      const v = synth.getVoices().sort((a, b) => a.name.localeCompare(b.name));
      setVoices(v);
      if (!selectedVoiceURI) {
        const best =
          v.find((x) => x.name.toLowerCase().includes("moira") && x.lang.toLowerCase() === "en-ie") ||
          v.find((x) => (x.name.includes("Google") || x.name.includes("Natural")) && x.lang.startsWith("en")) ||
          v.find((x) => x.lang.startsWith("en"));
        if (best) setSelectedVoiceURI(best.voiceURI);
      }
    };

    load();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = load;
    }
  }, [selectedVoiceURI]);

  const speak = (id: string, text: string) => {
    const synth = synthRef.current;
    if (!synth) return;

    if (speakingId === id) {
      synth.cancel();
      setSpeakingId(null);
      return;
    }

    synth.cancel();
    setSpeakingId(id);

    const u = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    if (voice) u.voice = voice;

    u.rate = 1.0;
    u.pitch = 1.0;
    u.onend = () => setSpeakingId(null);
    synth.speak(u);
  };

  return { speak, speakingId, voices, selectedVoiceURI, setSelectedVoiceURI };
}

function useAI() {
  const [status] = useState<"loading" | "ready" | "error">("ready");
  const transformersRef = useRef<TransformersLib | null>(null);
  const transformersReadyRef = useRef<Promise<TransformersLib> | null>(null);

  const pollinationsGenerate = async (anchor: Entry, isRegen?: boolean) => {
    const instruction = isRegen
      ? "Re-explain this concept simply for a beginner. Use a fresh analogy."
      : "Explain this concept simply to a professional. Provide a clear definition, a real-world example, and a region-tailored case study.";

    const prompt = `You are a Supply Chain Tutor.\nTerm: "${anchor.term}"\nDefinition: "${anchor.definition}"\nTags: "${anchor.tags || ""}"\n\nTask: ${instruction}\n\nOutput Format (Markdown):\n### Concept\n(Explanation)\n\n### Real-World Example\n(Example)\n\n### Region-Tailored Case Study\n(Case study focused on Africa or emerging markets)`;

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      const errText = typeof data?.error === "string" ? data.error : "SCM AI error";
      throw new Error(JSON.stringify({ status: response.status, body: errText }));
    }
    const text = data?.text || "";
    if (!text) throw new Error("SCM AI returned empty response");
    return text;
  };

  const shouldFallback = (message: string) => {
    const text = message.toLowerCase();
    return (
      text.includes('"status":402') ||
      text.includes('"status":404') ||
      text.includes('"status":429') ||
      text.includes("insufficient_quota") ||
      text.includes("quota") ||
      text.includes("rate limit") ||
      text.includes("payment required") ||
      text.includes("unauthorized") ||
      text.includes("authenticate") ||
      text.includes("authentication") ||
      text.includes('"status":401') ||
      text.includes("important notice") ||
      text.includes("legacy text api") ||
      text.includes("being deprecated") ||
      text.includes("migrate to our new service") ||
      text.includes("enter.pollinations.ai")
    );
  };

  const resolveTransformersLib = (mod: unknown) => {
    const resolved = mod as TransformersModule;
    if (resolved?.pipeline) return resolved as TransformersLib;
    if (resolved?.default?.pipeline) return resolved.default;
    return null;
  };

  const loadTransformers = () => {
    if (transformersRef.current) return Promise.resolve(transformersRef.current);
    if (transformersReadyRef.current) return transformersReadyRef.current;

    if (typeof window === "undefined") {
      return Promise.reject(new Error("Transformers.js unavailable"));
    }

    const existing = (window as WindowWithGlobals).transformers || (window as WindowWithGlobals).Transformers;
    if (existing?.pipeline) {
      transformersRef.current = existing;
      return Promise.resolve(existing);
    }

    const moduleUrl: string =
      "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.2/dist/transformers.min.js";
    transformersReadyRef.current = import(/* webpackIgnore: true */ moduleUrl)
      .then((mod: unknown) => {
        const lib = resolveTransformersLib(mod);
        if (!lib?.pipeline) {
          throw new Error("Transformers.js failed to load");
        }
        transformersRef.current = lib;
        return lib;
      })
      .catch((err) => {
        transformersReadyRef.current = null;
        throw err;
      });

    return transformersReadyRef.current;
  };

  const transformersGenerate = async (anchor: Entry, isRegen?: boolean) => {
    const instruction = isRegen
      ? "Explain simply for a beginner with a fresh analogy."
      : "Explain simply to a professional with a clear definition, real-world example, and a region-tailored case study.";
    const prompt = `Explain the supply chain term: ${anchor.term}. ${instruction} Definition: ${anchor.definition}. Tags: ${
      anchor.tags || ""
    }.`;

    const lib = await loadTransformers();
    if (!lib?.pipeline) throw new Error("Transformers.js unavailable");

    const generator = await lib.pipeline("text2text-generation", "Xenova/flan-t5-small");
    const out = await generator(prompt, { max_new_tokens: 200 });
    const text = out?.[0]?.generated_text || "";
    if (!text) throw new Error("Transformers.js returned empty response");
    return text;
  };

  const generate = async (anchor: Entry, isRegen?: boolean) => {
    try {
      const text = await pollinationsGenerate(anchor, isRegen);
      return normalizeMarkdown(text, anchor);
    } catch (e) {
      const shouldUseFallback = shouldFallback(String(e));
      if (!shouldUseFallback) {
        console.error("SCM AI error", e);
      }
      if (shouldUseFallback && USE_TRANSFORMERS) {
        try {
          const fallback = await transformersGenerate(anchor, isRegen);
          return normalizeMarkdown(fallback, anchor);
        } catch (fallbackErr) {
          console.error("Transformers.js fallback error", fallbackErr);
        }
      }
    }

    return buildFallbackMarkdown(anchor);
  };

  return { status, generate };
}

const SettingsDialog = ({
  open,
  onClose,
  tts,
  autoReadAi,
  setAutoReadAi,
}: {
  open: boolean;
  onClose: () => void;
  tts: TTS;
  autoReadAi: boolean;
  setAutoReadAi: (v: boolean) => void;
}) => {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Settings</h2>
        <div className={styles.modalRow}>
          <label className={styles.modalLabel}>Voice Selection</label>
          <select
            className={styles.modalSelect}
            value={tts.selectedVoiceURI}
            onChange={(e) => tts.setSelectedVoiceURI(e.target.value)}
          >
            {tts.voices
              .filter((v) => v.lang.startsWith("en"))
              .map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
          </select>
          <div className={styles.apiHint}>
            Tip: &apos;Google US English&apos; or &apos;Microsoft Natural&apos; sound most human-like.
          </div>
        </div>
        <div className={styles.modalRow}>
          <label className={styles.modalLabel}>Text-to-Speech</label>
          <label className={styles.modalLabel} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" checked={autoReadAi} onChange={(e) => setAutoReadAi(e.target.checked)} />
            Auto-read SCM AI insights
          </label>
        </div>
        <div className={styles.modalActions}>
          <button className={`${styles.modalBtn} ${styles.modalBtnPrimary}`} onClick={onClose}>
            <svg
              className={styles.buttonIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const ThinkingIndicator = () => {
  const [thought, setThought] = useState("Initializing...");
  const thoughts = useMemo(
    () => ["Scanning database...", "Connecting concepts...", "Analyzing context...", "Drafting insight...", "Formatting response..."],
    []
  );

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setThought(thoughts[i % thoughts.length]);
      i += 1;
    }, 1200);
    return () => clearInterval(interval);
  }, [thoughts]);

  return (
    <div className={styles.thinkingBox}>
      <div className={styles.thinkingHeader}>
        <div className={styles.pulseDot}></div>
        SCM AI is thinking...
      </div>
      <div className={styles.thoughtProcess}>
        <span className={styles.fadeText}>» {thought}</span>
      </div>
    </div>
  );
};

const AssistantCard = ({
  message,
  entry,
  tts,
  autoReadAi,
  onExplain,
  onRegenerate,
  onStop,
}: {
  message: Message;
  entry: Entry;
  tts: TTS;
  autoReadAi: boolean;
  onExplain: (entry: Entry, messageId: string) => void;
  onRegenerate: (entry: Entry, messageId: string) => void;
  onStop: (messageId: string) => void;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const mode = message.meta?.mode ?? "ai";
  const isAiMode = mode === "ai";
  const definitionText = entry.definition?.trim() || "Definition unavailable.";
  const sections = useMemo(() => parseSections(message.content, entry), [message.content, entry]);
  const image = message.meta?.image;
  const [imgUrl, setImgUrl] = useState(image?.url || "");
  const [imgAltUrl, setImgAltUrl] = useState(image?.altUrl || "");
  const [imgFailed, setImgFailed] = useState(false);
  const prevStatusRef = useRef(message.status);

  useEffect(() => {
    setImgUrl(image?.url || "");
    setImgAltUrl(image?.altUrl || "");
    setImgFailed(false);
  }, [image?.url, image?.altUrl]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    if (autoReadAi && isAiMode && message.status === "done" && prev !== "done") {
      const speech = buildSpeechText(entry, sections);
      if (speech) tts.speak(message.id, speech);
    }
    prevStatusRef.current = message.status;
  }, [autoReadAi, entry, isAiMode, message.id, message.status, sections, tts]);

  const isSpeaking = tts.speakingId === message.id;

  const handleRead = () => {
    const speech = isAiMode ? buildSpeechText(entry, sections) : buildDefinitionSpeech(entry);
    if (speech) tts.speak(message.id, speech);
  };

  const handleCopy = () => {
    const text = isAiMode ? buildCopyText(entry, sections) : buildDefinitionCopy(entry);
    navigator.clipboard.writeText(text);
  };

  const handleImageError = () => {
    if (imgAltUrl && imgUrl !== imgAltUrl) {
      setImgUrl(imgAltUrl);
      return;
    }
    setImgFailed(true);
  };

  const showThinking = isAiMode && message.status === "streaming" && !message.content;
  const showTyping = isAiMode && message.status === "streaming" && message.content;
  const canRead = isAiMode ? Boolean(message.content) : Boolean(definitionText);

  return (
    <div className={styles.smartCard}>
      <div className={styles.termHeader}>
        <div className={styles.termStack}>
          <h2 className={styles.termTitle}>{entry.term}</h2>
          <div className={styles.termMeta}>
            {entry.pos && <span className={styles.termPos}>{entry.pos}</span>}
            {entry.pronunciation && <span className={styles.termPron}>/{entry.pronunciation}/</span>}
            {entry.tags && <span className={styles.termTag}>{entry.tags}</span>}
          </div>
        </div>
        <div className={styles.termBadge}>SCM AI</div>
      </div>

      {imgUrl && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          className={styles.contextImg}
          alt={entry.term}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
      ) : (
        <div className={`${styles.contextImg} ${styles.contextImgPlaceholder}`}>
          {image?.loading
            ? "Loading image..."
            : image?.error && image.error.toLowerCase().includes("google cse")
            ? "Image unavailable (set Google CSE keys)"
            : "Image unavailable"}
        </div>
      )}

      {showThinking ? (
        <ThinkingIndicator />
      ) : isAiMode ? (
        <div className={styles.sectionStack}>
          <div className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>Concept</div>
            <MarkdownBlock text={sections.concept} className={styles.markdown} />
          </div>
          <div className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>Real-World Example</div>
            <MarkdownBlock text={sections.example} className={styles.markdown} />
          </div>
          <div className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>Region-Tailored Case Study</div>
            <MarkdownBlock text={sections.caseStudy} className={styles.markdown} />
          </div>
        </div>
      ) : (
        <div className={styles.sectionStack}>
          <div className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>Definition</div>
            <MarkdownBlock text={definitionText} className={styles.markdown} />
          </div>
        </div>
      )}

      {showTyping ? <div className={styles.typingIndicator}>SCM AI is typing...</div> : null}

      <div className={styles.actionBar}>
        {!isAiMode && (
          <button
            className={styles.actionBtn}
            onClick={() => onExplain(entry, message.id)}
            disabled={message.status === "streaming"}
          >
            <svg
              className={styles.buttonIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 3l2.2 4.7L19 9l-4.8 1.3L12 15l-2.2-4.7L5 9l4.8-1.3L12 3z" />
              <path d="M5 15l.9 2 2.1.9-2.1.9-.9 2-.9-2-2.1-.9 2.1-.9.9-2z" />
            </svg>
            Explain with SCM AI
          </button>
        )}

        <button
          className={`${styles.actionBtn} ${isSpeaking ? styles.actionBtnActive : ""}`}
          onClick={handleRead}
          disabled={!canRead}
        >
          <svg
            className={styles.buttonIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 10v4h3l4 4V6l-4 4H4z" />
            <path d="M16 9a3 3 0 0 1 0 6" />
            <path d="M18.5 6.5a6 6 0 0 1 0 11" />
          </svg>
          {isSpeaking ? "Reading" : "Read"}
        </button>

        <button className={styles.actionBtn} onClick={() => setShowDetails((prev) => !prev)}>
          <svg
            className={styles.buttonIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 10v6" />
            <path d="M12 7h.01" />
          </svg>
          Details
        </button>

        <button className={styles.actionBtn} onClick={handleCopy} disabled={!canRead}>
          <svg
            className={styles.buttonIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <rect x="4" y="4" width="11" height="11" rx="2" />
          </svg>
          Copy
        </button>

        {isAiMode && (
          <>
            <button
              className={styles.actionBtn}
              onClick={() => onRegenerate(entry, message.id)}
              disabled={message.status === "streaming"}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 11a8 8 0 0 1 13-5l2 2" />
                <path d="M19 4v4h-4" />
                <path d="M20 13a8 8 0 0 1-13 5l-2-2" />
                <path d="M5 20v-4h4" />
              </svg>
              Try Different Explanation
            </button>

            <a
              href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${entry.term} supply chain`)}`}
              target="_blank"
              rel="noreferrer"
              className={styles.actionBtn}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8" cy="10" r="2" />
                <path d="M21 17l-6-6-4 4-3-3-5 5" />
              </svg>
              View Google Images
            </a>
          </>
        )}

        {isAiMode && message.status === "streaming" && (
          <button className={styles.actionBtn} onClick={() => onStop(message.id)}>
            <svg
              className={styles.buttonIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
            Stop generating
          </button>
        )}
      </div>

      {showDetails && (
        <div className={styles.detailsPanel}>
          {entry.synonyms && (
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Synonyms</div>
              <div className={styles.detailVal}>{entry.synonyms}</div>
            </div>
          )}
          {entry.tags && (
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Tags</div>
              <div className={styles.detailVal}>{entry.tags}</div>
            </div>
          )}
          {entry.examples && (
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Example</div>
              <div className={styles.detailVal}>{entry.examples}</div>
            </div>
          )}
          {!entry.synonyms && !entry.tags && !entry.examples && (
            <div style={{ color: "#888", fontStyle: "italic" }}>No additional details available.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default function PanAvestAIPage() {
  const { data, status, fuseRef } = useData();
  const tts = useTTS();
  const ai = useAI();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Entry[]>([]);
  const [selectedSug, setSelectedSug] = useState(-1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoReadAi, setAutoReadAi] = useState(false);
  const [showBeta, setShowBeta] = useState(true);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);
  const streamTimersRef = useRef<Record<string, number>>({});
  const isNearBottomRef = useRef(true);

  const deferredInput = useDeferredValue(input);

  const stopWords = useMemo(
    () => /^(what is|what's|define|explain|describe|meaning of|tell me about|search for|look up|do you know)\s+/i,
    []
  );

  useEffect(() => {
    const t = window.setTimeout(() => setShowBeta(false), 1500);
    return () => window.clearTimeout(t);
  }, []);

  const updateMessage = useCallback((id: string, updater: (m: Message) => Message) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
  }, []);

  const stopStream = useCallback(
    (id: string, markDone = true) => {
      const timer = streamTimersRef.current[id];
      if (timer) {
        window.clearInterval(timer);
        delete streamTimersRef.current[id];
      }
      if (markDone) {
        updateMessage(id, (m) => ({ ...m, status: "done" }));
      }
    },
    [updateMessage]
  );

  useEffect(() => {
    return () => {
      Object.values(streamTimersRef.current).forEach((timer) => window.clearInterval(timer));
      streamTimersRef.current = {};
    };
  }, []);

  const streamMessage = useCallback(
    (id: string, fullText: string) => {
      stopStream(id, false);
      if (!fullText.trim()) {
        updateMessage(id, (m) => ({ ...m, content: "", status: "done" }));
        return;
      }

      const chars = Array.from(fullText);
      let index = 0;
      const step = () => {
        index = Math.min(chars.length, index + 6);
        const chunk = chars.slice(0, index).join("");
        updateMessage(id, (m) => ({ ...m, content: chunk, status: index >= chars.length ? "done" : "streaming" }));
        if (index >= chars.length) {
          stopStream(id, false);
        }
      };

      step();
      streamTimersRef.current[id] = window.setInterval(step, 24);
    },
    [stopStream, updateMessage]
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance < 140;
    isNearBottomRef.current = nearBottom;
    setShowJump(!nearBottom && el.scrollHeight > el.clientHeight + 20);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [messages, updateScrollState]);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    scrollToBottom("auto");
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const query = deferredInput.trim();
    if (!query || status !== "ready" || !fuseRef.current) {
      setSuggestions([]);
      return;
    }
    const hits = fuseRef.current.search(query).slice(0, 5).map((h) => h.item);
    setSuggestions(hits);
  }, [deferredInput, status, fuseRef]);

  const loadImageForMessage = useCallback(
    async (entry: Entry, messageId: string) => {
      updateMessage(messageId, (m) => ({
        ...m,
        meta: {
          ...m.meta,
          image: {
            ...(m.meta?.image || {}),
            loading: true,
            error: "",
          },
        },
      }));

      try {
        const res = await fetch(`/api/image?q=${encodeURIComponent(entry.term)}`);
        const bodyText = await res.text();
        let data: ImageApiResponse = {};
        if (bodyText) {
          try {
            data = JSON.parse(bodyText) as ImageApiResponse;
          } catch {
            data = {};
          }
        }
        if (!res.ok || data?.error) {
          const serverError = typeof data?.error === "string" ? data.error : bodyText;
          throw new Error(serverError || `Image lookup failed (${res.status})`);
        }
        const full = typeof data?.link === "string" ? data.link : typeof data?.url === "string" ? data.url : "";
        const thumb = typeof data?.thumbnail === "string" ? data.thumbnail : "";
        if (!full && !thumb) throw new Error("No image found");
        updateMessage(messageId, (m) => ({
          ...m,
          meta: {
            ...m.meta,
            image: {
              url: full || thumb,
              altUrl: thumb && thumb !== full ? thumb : "",
              loading: false,
              error: "",
            },
          },
        }));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const fallbackQuery = entry.tags?.split(",")[0] || entry.term || "business";
        const fallbackUrl = `https://loremflickr.com/600/300/${encodeURIComponent(
          fallbackQuery
        )},logistics/all?lock=${entry.term.length}`;
        updateMessage(messageId, (m) => ({
          ...m,
          meta: {
            ...m.meta,
            image: {
              url: fallbackUrl,
              altUrl: "",
              loading: false,
              error: message,
            },
          },
        }));
      }
    },
    [updateMessage]
  );

  const generateAssistant = useCallback(
    async (entry: Entry, messageId: string, regen?: boolean) => {
      updateMessage(messageId, (m) => ({
        ...m,
        status: "streaming",
        content: "",
        meta: {
          ...m.meta,
          term: entry.term,
          entry,
          actions: [...DEFAULT_ACTIONS],
          mode: "ai",
        },
      }));

      const text = await ai.generate(entry, regen);
      streamMessage(messageId, text);
    },
    [ai, streamMessage, updateMessage]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const nativeComposing = (e.nativeEvent as { isComposing?: boolean }).isComposing;
    if (composingRef.current || nativeComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSug((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSug((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedSug >= 0 && suggestions[selectedSug]) {
        handleSubmit(suggestions[selectedSug].term);
      } else {
        handleSubmit(input);
      }
    }
  };

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const originalQuery = text.trim();
      setInput("");
      setSuggestions([]);
      setSelectedSug(-1);

      const userMessage: Message = {
        id: uuid(),
        role: "user",
        content: originalQuery,
        timestamp: Date.now(),
      };

      if (status !== "ready") {
        const assistantMessage: Message = {
          id: uuid(),
          role: "assistant",
          content: "Database is still loading. Please try again in a moment.",
          status: "done",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        return;
      }

      const cleanQuery = originalQuery.replace(stopWords, "").replace(/[?]/g, "").trim();

      let match = data.find((d) => d.term.toLowerCase() === cleanQuery.toLowerCase());

      if (!match && fuseRef.current) {
        const res = fuseRef.current.search(cleanQuery);
        if (res.length > 0) match = res[0].item;
      }

      if (!match && cleanQuery !== originalQuery && fuseRef.current) {
        const exactOrig = data.find((d) => d.term.toLowerCase() === originalQuery.toLowerCase());
        if (exactOrig) {
          match = exactOrig;
        } else {
          const res = fuseRef.current.search(originalQuery);
          if (res.length > 0) match = res[0].item;
        }
      }

      if (!match) {
        const assistantMessage: Message = {
          id: uuid(),
          role: "assistant",
          content: `I couldn't find a match for "${cleanQuery}". Try a different term.`,
          status: "done",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        return;
      }

      const assistantId = uuid();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "done",
        meta: {
          term: match.term,
          entry: match,
          actions: [...DEFAULT_ACTIONS],
          image: { loading: true },
          mode: "db",
        },
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      loadImageForMessage(match, assistantId);
    },
    [data, fuseRef, loadImageForMessage, status, stopWords]
  );

  return (
    <section className={styles.aiRoot}>
      {showBeta && (
        <div className={styles.betaOverlay} role="dialog" aria-modal="true" aria-label="SCM AI beta">
          <div className={styles.betaCard}>
            <div className={styles.betaBadge}>Beta</div>
            <h1 className={styles.betaTitle}>SCM AI</h1>
            <p className={styles.betaCopy}>
              You are entering the beta preview of our intelligent search and glossary experience. Feedback helps us
              improve.
            </p>
            <button className={styles.betaButton} onClick={() => setShowBeta(false)}>
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
              Enter SCM AI
            </button>
          </div>
        </div>
      )}

      <div className={styles.appContainer}>
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          tts={tts}
          autoReadAi={autoReadAi}
          setAutoReadAi={setAutoReadAi}
        />

        <div className={`${styles.aiHeader} ${messages.length > 0 ? styles.aiHeaderScrolled : ""}`}>
          <div className={styles.brand}>
            <span>SCM</span> AI
          </div>

          <div className={styles.headerControls}>
            <button className={styles.settingsBtn} onClick={() => setSettingsOpen(true)}>
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 6h10" />
                <path d="M4 12h16" />
                <path d="M4 18h10" />
                <circle cx="18" cy="6" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
              Settings
            </button>

            <div className={styles.dbStatus} aria-live="polite">
              <div
                className={`${styles.indicator} ${status === "ready" ? styles.indicatorReady : styles.indicatorError}`}
              ></div>
              {status === "ready" ? "Database Active" : "Database Loading"}
            </div>
          </div>
        </div>

        <div className={styles.chatShell}>
          <div className={styles.chatScroll} ref={scrollRef} onScroll={updateScrollState}>
            <div className={styles.widthConstraint}>
              {messages.length === 0 ? (
                <div className={styles.welcomeScreen}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>✨</div>
                  <h1 className={styles.wTitle}>SCM AI</h1>
                  <p className={styles.wSub}>
                    SCM AI is a next-generation Global <span className={styles.highlight}>(Supply Chain Management)</span>, a
                    dictionary designed for professionals, students, and businesses across Africa. <span className={styles.highlight}>(Powered by AI)</span>, it transforms complex supply-chain concepts into
                    clear definitions, practical insights, and region-relevant case studies.
                  </p>
                  {status === "empty" && (
                    <div className={styles.wHint}>Database is unavailable. Please contact support.</div>
                  )}
                </div>
              ) : (
                <div className={styles.messageList}>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`${styles.messageRow} ${
                        m.role === "user" ? styles.messageRowUser : styles.messageRowAssistant
                      }`}
                    >
                      {m.role === "assistant" && <div className={`${styles.avatar} ${styles.avatarBot}`}>SCM</div>}
                      <div className={styles.bubble}>
                        {m.role === "user" ? (
                          <div className={styles.userBubble}>{m.content}</div>
                        ) : m.meta?.entry ? (
                          <AssistantCard
                            message={m}
                            entry={m.meta.entry}
                            tts={tts}
                            autoReadAi={autoReadAi}
                            onExplain={(entry, messageId) => generateAssistant(entry, messageId, false)}
                            onRegenerate={(entry, messageId) => generateAssistant(entry, messageId, true)}
                            onStop={(id) => stopStream(id)}
                          />
                        ) : (
                          <div className={styles.botContent}>{m.content}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.composerWrap}>
            <div className={styles.widthConstraint}>
              {showJump && (
                <button className={styles.jumpButton} onClick={() => scrollToBottom("smooth")}>
                  <svg
                    className={styles.buttonIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 4v14" />
                    <path d="M6 12l6 6 6-6" />
                  </svg>
                  Jump to bottom
                </button>
              )}

              <div className={styles.inputContainer}>
                {suggestions.length > 0 && (
                  <div className={styles.predictiveList}>
                    {suggestions.map((s, i) => (
                      <div
                        key={`${s.term}-${i}`}
                        className={`${styles.predictiveItem} ${i === selectedSug ? styles.predictiveItemSelected : ""}`}
                        onClick={() => handleSubmit(s.term)}
                      >
                        <span className={styles.pTerm}>{s.term}</span>
                        <span className={styles.pDef}>{s.definition}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.inputWrapper}>
                  <input
                    className={styles.chatInput}
                    placeholder={status === "ready" ? "Ask about a concept..." : "Load database to start..."}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setSelectedSug(-1);
                    }}
                    onCompositionStart={() => {
                      composingRef.current = true;
                    }}
                    onCompositionEnd={() => {
                      composingRef.current = false;
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={status !== "ready"}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <button
                    className={`${styles.sendBtn} ${input.trim() ? styles.sendBtnActive : ""}`}
                    onClick={() => handleSubmit(input)}
                    disabled={!input.trim()}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div className={styles.footerNote}>Powered by PanAvest International & Partners • Prof. Douglas Boateng</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
