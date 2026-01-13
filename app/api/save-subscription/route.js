import { NextResponse } from "next/server";

let subscriptions = []; // مؤقتًا في الذاكرة، ممكن تخزن في DB بعدين

export async function POST(req) {
  const subscription = await req.json();
  subscriptions.push(subscription);
  return NextResponse.json({ success: true });
}

export { subscriptions }; // هستخدمه لاحقًا للإرسال
