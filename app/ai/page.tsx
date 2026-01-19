"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type Message = {
  id: string;
  role: "user" | "bot";
  content?: string;
  entry?: Entry;
  related?: Entry[];
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

type AIClient = {
  status: "loading" | "ready" | "error";
  generate: (e: Entry, regen?: boolean) => Promise<string>;
};

const uuid = () => Math.random().toString(36).substring(2, 9);

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const fallbackExplanation = (anchor: Entry) => {
  const concept = escapeHtml(anchor.definition || `${anchor.term} is a supply chain concept.`);
  const exampleText =
    anchor.examples ||
    `In practice, ${anchor.term} could involve ${anchor.definition?.replace(/\.$/, "") || "real-world operations"}.`;
  const example = escapeHtml(exampleText);
  return `<b>Concept:</b> ${concept}<br/><br/><b>Real-World Example:</b> ${example}`;
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

  const formatToHtml = (raw: string, anchor: Entry) => {
    let text = raw.trim();
    if (!text) return fallbackExplanation(anchor);
    const hasHtml = /<\/?[a-z][\s\S]*>/i.test(text);
    if (!hasHtml) {
      text = escapeHtml(text).replace(/\r?\n+/g, "\n");
    }
    text = text.replace(/Concept:/i, "<b>Concept:</b>").replace(/Real-World Example:/i, "<b>Real-World Example:</b>");
    if (!text.includes("<b>Concept:</b>")) text = `<b>Concept:</b> ${text}`;
    if (!text.includes("<b>Real-World Example:</b>")) {
      text += `<br/><br/><b>Real-World Example:</b> ${escapeHtml(
        anchor.examples || "A practical example can be observed in day-to-day supply chain operations."
      )}`;
    } else {
      text = text.replace(/\n/g, "<br/>");
    }
    return text;
  };

  const pollinationsGenerate = async (anchor: Entry, isRegen?: boolean) => {
    const instruction = isRegen
      ? "Re-explain this concept simply for a beginner. Use a fresh analogy."
      : "Explain this concept simply to a professional. Provide a clear definition and a real-world supply chain example.";

    const prompt = `You are a Supply Chain Tutor.\nTerm: "${anchor.term}"\nDefinition: "${anchor.definition}"\nTags: "${anchor.tags || ""}"\n\nTask: ${instruction}\n\nOutput Format:\nReturn strictly HTML with <b> tags. No markdown.\n1. <b>Concept:</b> (Explanation)\n2. <b>Real-World Example:</b> (Example)`;

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(JSON.stringify({ status: response.status, body: errText || "SCM AI error" }));
    }

    const data = await response.json();
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
      text.includes("important notice") ||
      text.includes("legacy text api") ||
      text.includes("being deprecated") ||
      text.includes("migrate to our new service") ||
      text.includes("enter.pollinations.ai")
    );
  };

  const loadTransformers = () => {
    if (transformersRef.current) return Promise.resolve(transformersRef.current);
    if (transformersReadyRef.current) return transformersReadyRef.current;

    transformersReadyRef.current = new Promise<TransformersLib>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Transformers.js unavailable"));
        return;
      }

      const existing = (window as WindowWithGlobals).transformers || (window as WindowWithGlobals).Transformers;
      if (existing?.pipeline) {
        transformersRef.current = existing;
        resolve(existing);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.2/dist/transformers.min.js";
      script.async = true;
      script.onload = () => {
        const lib = (window as WindowWithGlobals).transformers || (window as WindowWithGlobals).Transformers;
        if (!lib?.pipeline) {
          reject(new Error("Transformers.js failed to load"));
          return;
        }
        transformersRef.current = lib;
        resolve(lib);
      };
      script.onerror = () => reject(new Error("Transformers.js failed to load"));
      document.head.appendChild(script);
    }).catch((err) => {
      transformersReadyRef.current = null;
      throw err;
    });

    return transformersReadyRef.current;
  };

  const transformersGenerate = async (anchor: Entry, isRegen?: boolean) => {
    const instruction = isRegen
      ? "Explain simply for a beginner with a fresh analogy."
      : "Explain simply to a professional with a clear definition and a real-world supply chain example.";
    const prompt = `Explain the supply chain term: ${anchor.term}. ${instruction} Definition: ${anchor.definition}. Tags: ${
      anchor.tags || ""
    }.`;

    const lib = await loadTransformers();
    if (!lib?.pipeline) throw new Error("Transformers.js unavailable");

    const generator = await lib.pipeline("text2text-generation", "Xenova/flan-t5-small");
    const out = await generator(prompt, { max_new_tokens: 160 });
    const text = out?.[0]?.generated_text || "";
    if (!text) throw new Error("Transformers.js returned empty response");
    return text;
  };

  const generate = async (anchor: Entry, isRegen?: boolean) => {
    try {
      const text = await pollinationsGenerate(anchor, isRegen);
      return formatToHtml(text, anchor);
    } catch (e) {
      console.error("SCM AI error", e);

      if (shouldFallback(String(e))) {
        try {
          const fallback = await transformersGenerate(anchor, isRegen);
          return formatToHtml(fallback, anchor);
        } catch (fallbackErr) {
          console.error("Transformers.js fallback error", fallbackErr);
        }
      }
    }

    return `<i>Could not reach SCM AI services. Here is a summary:</i><br/><br/><b>Concept:</b> ${
      anchor.term
    } is a concept in ${anchor.tags || "supply chain"} regarding ${
      anchor.definition
    }.<br/><br/><b>Real-World Example:</b> This often appears when companies manage sourcing, inventory, logistics, or supplier performance related to the term.`;
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
            Tip: &quot;Google US English&quot; or &quot;Microsoft Natural&quot; sound most human-like.
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
        SCM AI is Thinking...
      </div>
      <div className={styles.thoughtProcess}>
        <span className={styles.fadeText}>» {thought}</span>
      </div>
    </div>
  );
};

const SmartCard = ({
  entry,
  tts,
  ai,
  autoReadAi,
}: {
  entry: Entry;
  tts: TTS;
  ai: AIClient;
  autoReadAi: boolean;
}) => {
  const [expanded, setExpanded] = useState<"details" | "ai" | null>(null);
  const [aiText, setAiText] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchAi = async (regen = false) => {
    setLoadingAi(true);
    try {
      const txt = await ai.generate(entry, regen);
      const next = txt || "";
      setAiText(next);
      if (autoReadAi && next) {
        tts.speak(`ai-${entry.term}`, next.replace(/<[^>]*>/g, ""));
      }
    } catch (e) {
      console.error("SCM AI generate error", e);
      setAiText(fallbackExplanation(entry));
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAi = async () => {
    if (expanded === "ai") {
      setExpanded(null);
      return;
    }
    setExpanded("ai");
    if (!aiText) fetchAi();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${entry.term}: ${entry.definition}`);
  };

  const isSpeakingDef = tts.speakingId === `def-${entry.term}`;
  const isSpeakingAi = tts.speakingId === `ai-${entry.term}`;

  return (
    <div className={styles.smartCard}>
      <div className={styles.termHeader}>
        <h2 className={styles.termTitle}>{entry.term}</h2>
        {entry.pos && <span className={styles.termPos}>{entry.pos}</span>}
        {entry.pronunciation && <span className={styles.termPron}>/{entry.pronunciation}/</span>}
      </div>
      <div className={styles.termDef}>{entry.definition}</div>

      <div className={styles.actionBar}>
        <button
          className={`${styles.actionBtn} ${isSpeakingDef ? styles.actionBtnActive : ""}`}
          onClick={() => tts.speak(`def-${entry.term}`, `${entry.term}. ${entry.definition}`)}
        >
          <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          {isSpeakingDef ? "Reading" : "Read"}
          {isSpeakingDef && (
            <div className={styles.voiceMeter} aria-hidden>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={styles.voiceBar}
                  style={{ height: "100%", animationDuration: `${0.4 + i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </button>

        <button
          className={`${styles.actionBtn} ${expanded === "ai" ? styles.actionBtnActive : ""}`}
          onClick={handleAi}
        >
          <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2zm0-4H7V7h10v2z" />
          </svg>
          {ai.status === "loading" ? "Loading SCM AI..." : "Explain with SCM AI"}
        </button>

        <button
          className={`${styles.actionBtn} ${expanded === "details" ? styles.actionBtnActive : ""}`}
          onClick={() => setExpanded(expanded === "details" ? null : "details")}
        >
          <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
          Details
        </button>

        <button className={styles.actionBtn} onClick={handleCopy}>
          <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
          </svg>
          Copy
        </button>
      </div>

      {expanded === "details" && (
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

      {expanded === "ai" && (
        <div className={`${styles.detailsPanel} ${styles.aiBox}`}>
          <div className={styles.aiBoxHeader}>
            <div className={styles.aiBadge}>✨ SCM AI</div>
            {aiText && !loadingAi && (
              <button
                className={styles.miniReadBtn}
                onClick={() => tts.speak(`ai-${entry.term}`, aiText.replace(/<[^>]*>/g, ""))}
              >
                {isSpeakingAi ? "Stop Reading" : "Read Insight"}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </button>
            )}
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://loremflickr.com/600/300/${encodeURIComponent(
              entry.tags?.split(",")[0] || entry.term || "business"
            )},logistics/all?lock=${entry.term.length}`}
            className={styles.contextImg}
            alt={entry.term}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />

          {loadingAi ? (
            <ThinkingIndicator />
          ) : (
            <>
              <div
                style={{ whiteSpace: "pre-wrap", marginTop: "12px" }}
                dangerouslySetInnerHTML={{ __html: aiText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
              />

              <a
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${entry.term} supply chain`)}`}
                target="_blank"
                rel="noreferrer"
                className={styles.googleLinkBtn}
              >
                View Google Images
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>

              <button className={styles.regenBtn} onClick={() => fetchAi(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                Try Different Explanation
              </button>
            </>
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const footerRafRef = useRef<number | null>(null);

  const stopWords = useMemo(
    () => /^(what is|what's|define|explain|describe|meaning of|tell me about|search for|look up|do you know)\s+/i,
    []
  );

  useEffect(() => {
    const t = window.setTimeout(() => setShowBeta(false), 1500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const footer = document.querySelector("footer");
    if (!root || !footer) return;

    const update = () => {
      const rect = footer.getBoundingClientRect();
      const overlap = Math.max(0, window.innerHeight - rect.top);
      root.style.setProperty("--ai-footer-offset", `${overlap}px`);
    };

    const onScroll = () => {
      if (footerRafRef.current !== null) return;
      footerRafRef.current = window.requestAnimationFrame(() => {
        footerRafRef.current = null;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : null;
    resizeObserver?.observe(footer);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      resizeObserver?.disconnect();
      if (footerRafRef.current !== null) {
        window.cancelAnimationFrame(footerRafRef.current);
        footerRafRef.current = null;
      }
      root.style.removeProperty("--ai-footer-offset");
    };
  }, []);

  useEffect(() => {
    if (!input.trim() || !fuseRef.current) {
      setSuggestions([]);
      return;
    }
    const hits = fuseRef.current.search(input).slice(0, 5).map((h) => h.item);
    setSuggestions(hits);
  }, [input, fuseRef]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;
    const originalQuery = text.trim();
    setInput("");
    setSuggestions([]);
    setSelectedSug(-1);

    setMessages((prev) => [...prev, { id: uuid(), role: "user", content: originalQuery, timestamp: Date.now() }]);

    if (status !== "ready") {
      setTimeout(
        () =>
          setMessages((p) => [
            ...p,
            { id: uuid(), role: "bot", content: "Database is still loading. Please try again in a moment." },
          ]),
        200
      );
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

    if (match) {
      setMessages((p) => [...p, { id: uuid(), role: "bot", entry: match, timestamp: Date.now() }]);
    } else {
      setTimeout(
        () =>
          setMessages((p) => [
            ...p,
            { id: uuid(), role: "bot", content: `I couldn't find a match for "${cleanQuery}". Try a different term.` },
          ]),
        300
      );
    }
  };

  return (
    <section ref={rootRef} className={styles.aiRoot}>
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
              <span aria-hidden>⚙️</span> Settings
            </button>

            <div className={styles.dbStatus} aria-live="polite">
              <div
                className={`${styles.indicator} ${status === "ready" ? styles.indicatorReady : styles.indicatorError}`}
              ></div>
              {status === "ready" ? "Database Active" : "Database Loading"}
            </div>
          </div>
        </div>

        <div className={styles.chatWindow}>
          {messages.length === 0 ? (
            <div className={`${styles.welcomeScreen} ${styles.widthConstraint}`}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✨</div>
              <h1 className={styles.wTitle}>SCM AI</h1>
              <p className={styles.wSub}>
                SCM AI is a next-generation Global{" "}
                <span className={styles.highlight}>(Supply Chain Management)</span> dictionary designed for
                professionals, students, and businesses across Africa.{" "}
                <span className={styles.highlight}>(Powered by AI)</span>, it transforms complex supply-chain concepts into
                clear definitions, practical insights, and region-relevant case studies.
              </p>
              {status === "empty" && (
                <div className={styles.wHint}>Database is unavailable. Please contact support.</div>
              )}
            </div>
          ) : (
            <div className={styles.widthConstraint}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`${styles.messageRow} ${m.role === "user" ? styles.messageRowUser : styles.messageRowBot}`}
                >
                  {m.role === "bot" && <div className={`${styles.avatar} ${styles.avatarBot}`}>SCM</div>}
                  <div className={styles.bubble}>
                    {m.content && (
                      <div className={m.role === "bot" ? styles.botContent : styles.userBubble}>{m.content}</div>
                    )}
                    {m.entry && <SmartCard entry={m.entry} tts={tts} ai={ai} autoReadAi={autoReadAi} />}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputContainer}>
            {suggestions.length > 0 && (
              <div className={styles.predictiveList}>
                {suggestions.map((s, i) => (
                  <div
                    key={s.term}
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={status !== "ready"}
              />
              <button
                className={`${styles.sendBtn} ${input.trim() ? styles.sendBtnActive : ""}`}
                onClick={() => handleSubmit(input)}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                </svg>
              </button>
            </div>
            <div className={styles.footerNote}>Powered by PanAvest International & Partners • Prof. Douglas Boateng</div>
          </div>
        </div>
      </div>
    </section>
  );
}
