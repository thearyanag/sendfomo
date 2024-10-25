import { NextResponse } from "next/server";
import { fetchCollectionStats } from "@/lib/utils";

/**
 * Handles GET requests to fetch collection statistics.
 *
 * **Endpoint:** `/api/stats?slugDisplay=<slug>`
 *
 * @param request - The incoming request object.
 * @returns A JSON response containing the collection statistics or an error message.
 */
export async function GET() {
  try {
    const stats = await fetchCollectionStats("sendfomo");
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 's-maxage=10, stale-while-revalidate=59'
      }
    });
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection statistics." },
      { status: 500 }
    );
  }
}
