import { NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_CSE_API_KEY;
const CX = process.env.GOOGLE_CSE_CX;

type GoogleCseImageItem = {
  link?: string;
  image?: {
    thumbnailLink?: string;
  };
};

type GoogleCseResponse = {
  items?: GoogleCseImageItem[];
};

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (!API_KEY || !CX) {
    return NextResponse.json({ error: "Missing Google CSE configuration" }, { status: 200 });
  }

  const params = new URLSearchParams({
    key: API_KEY,
    cx: CX,
    q: query,
    searchType: "image",
    imgSize: "xlarge",
    imgType: "photo",
    num: "1",
    safe: "active",
  });

  const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;

  try {
    const response = await fetch(url);
    const body = await response.text();
    if (!response.ok) {
      return NextResponse.json({ error: body.slice(0, 500) }, { status: 200 });
    }

    let data: GoogleCseResponse;
    try {
      data = JSON.parse(body) as GoogleCseResponse;
    } catch {
      return NextResponse.json({ error: "Invalid response from Google" }, { status: 200 });
    }

    const item = data?.items?.[0];
    const link = typeof item?.link === "string" ? item.link : "";
    const thumbnail = typeof item?.image?.thumbnailLink === "string" ? item.image.thumbnailLink : "";

    if (!link && !thumbnail) {
      return NextResponse.json({ error: "No image results" }, { status: 200 });
    }

    return NextResponse.json(
      { url: link || thumbnail, thumbnail, link },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 200 }
    );
  }
}
