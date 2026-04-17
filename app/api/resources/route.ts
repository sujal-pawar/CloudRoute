import { RESOURCES } from "@/lib/mock-data/generator";

export async function GET() {
  return Response.json({
    count: RESOURCES.length,
    resources: RESOURCES,
  });
}