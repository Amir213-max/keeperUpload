import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { text, target } = await req.json();

    const res = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",   // لو عارف المصدر
        target,         // "ar"
        format: "text"
      }),
    });
console.log("TAP SECRET KEY:", process.env.TAP_SECRET_KEY);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Translate API error:", err);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
