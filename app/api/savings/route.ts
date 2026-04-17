import { getSavingsEntries } from "@/lib/server-state";

export async function GET() {
  const savings = getSavingsEntries();

  return Response.json({
    count: savings.length,
    totalRealizedSavings: round2(
      savings.reduce((sum, entry) => sum + entry.totalRealizedSavings, 0)
    ),
    savings,
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}