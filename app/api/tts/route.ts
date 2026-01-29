import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import {
  TextToSpeechConvertRequestOutputFormat as TTSOutputFormat,
  type TextToSpeechConvertRequestOutputFormat,
} from "@elevenlabs/elevenlabs-js/api/resources/textToSpeech/types/TextToSpeechConvertRequestOutputFormat";

export const runtime = "nodejs";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "VR5rq02kIGuHRg0JKxB6";
const DEFAULT_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const DEFAULT_OUTPUT_FORMAT: TextToSpeechConvertRequestOutputFormat = "mp3_44100_128";

type TtsRequest = {
  text?: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
};

const resolveText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const resolveOutputFormat = (value: string) => {
  const formats = Object.values(TTSOutputFormat) as TextToSpeechConvertRequestOutputFormat[];
  if (formats.includes(value as TextToSpeechConvertRequestOutputFormat)) {
    return value as TextToSpeechConvertRequestOutputFormat;
  }
  return DEFAULT_OUTPUT_FORMAT;
};

const toBodyInit = (audio: unknown): BodyInit | null => {
  if (!audio) return null;
  if (audio instanceof ReadableStream) return audio;
  if (audio instanceof ArrayBuffer) return audio;
  if (ArrayBuffer.isView(audio)) return audio as BodyInit;
  if (audio instanceof Blob) return audio;
  if (audio instanceof Response) return audio.body;
  return audio as BodyInit;
};

export async function POST(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Missing ElevenLabs API key" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as TtsRequest;
  const text = resolveText(body?.text);
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const voiceId = resolveText(body?.voiceId) || DEFAULT_VOICE_ID;
  const modelId = resolveText(body?.modelId) || DEFAULT_MODEL_ID;
  const outputFormat = resolveOutputFormat(
    resolveText(body?.outputFormat) || process.env.ELEVENLABS_OUTPUT_FORMAT || DEFAULT_OUTPUT_FORMAT
  );

  try {
    const client = new ElevenLabsClient({ apiKey: API_KEY });
    const audio = await client.textToSpeech.convert(voiceId, {
      text,
      modelId,
      outputFormat,
    });

    const payload = toBodyInit(audio);
    if (!payload) {
      return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
    }

    return new Response(payload as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
