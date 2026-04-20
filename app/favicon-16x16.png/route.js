import { buildLogoPngWithBlackBackground } from "../lib/logoIconResponse";

export const revalidate = 300;

export async function GET() {
  return buildLogoPngWithBlackBackground(16);
}
