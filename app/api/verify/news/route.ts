import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CoverageItem = {
  title: string;
  url: string;
  publisher: string | null;
  publisherUrl: string | null;
  publishedAt: string | null;
};

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .trim();
}

function tagValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, "")) : null;
}

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseItems(xml: string): CoverageItem[] {
  const items: CoverageItem[] = [];
  const matches = xml.matchAll(/<item(?:\\s[^>]*)?>([\\s\\S]*?)<\\/item>/gi);
  for (const match of matches) {
    const item = match[1];
    const title = tagValue(item, "title");
    const url = safeUrl(tagValue(item, "link"));
    const rawDate = tagValue(item, "pubDate");
    const publisherMatch = item.match(/<source(?:\\s+url="([^"]*)")?[^>]*>([\\s\\S]*?)<\\/source>/i);
    const publisher = publisherMatch ? decodeXml(publisherMatch[2].replace(/<[^>]+>/g, "")) : null;
    const publisherUrl = publisherMatch ? safeUrl(decodeXml(publisherMatch[1] || "")) : null;
    const parsedDate = rawDate ? new Date(rawDate) : null;
    if (!title || !url) continue;
    items.push({
      title,
      url,
      publisher,
      publisherUrl,
      publishedAt: parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.toISOString() : null,
    });
    if (items.length >= 8) break;
  }
  return items;
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") || "";
  const query = rawQuery.replace(/[\\u0000-\\u001f\\u007f]/g, " ").replace(/\\s+/g, " ").trim();

  if (query.length < 12 || query.length > 240) {
    return NextResponse.json(
      { error: "Enter a search phrase between 12 and 240 characters." },
      { status: 400 },
    );
  }

  const feedUrl = new URL("https://news.google.com/rss/search");
  feedUrl.searchParams.set("q", query);
  feedUrl.searchParams.set("hl", "en-IN");
  feedUrl.searchParams.set("gl", "IN");
  feedUrl.searchParams.set("ceid", "IN:en");

  try {
    const response = await fetch(feedUrl, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "The news search provider is temporarily unavailable. Try again later." },
        { status: 502 },
      );
    }

    const xml = await response.text();
    if (!xml.includes("<rss") && !xml.includes("<feed")) {
      return NextResponse.json(
        { error: "The news provider returned an unexpected response." },
        { status: 502 },
      );
    }

    const results = parseItems(xml);
    return NextResponse.json(
      {
        provider: "Google News RSS",
        query,
        checkedAt: new Date().toISOString(),
        results,
        interpretation:
          "These are related news search results, not verified evidence or a truth verdict. Read the original reports, compare dates and sources, and check whether each article addresses the exact claim.",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "News search timed out or could not be reached. No assessment was recorded." },
      { status: 502 },
    );
  }
}
