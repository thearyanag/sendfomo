import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import axios, { AxiosError } from "axios"

/**
 * Merges multiple class names into a single string, intelligently handling conflicts.
 *
 * @param inputs - An array of class values.
 * @returns A merged string of class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Interface representing the structure of the CollectionStats response.
 */
interface CollectionStatsResponse {
  instrumentTV2: {
    id: string;
    slug: string;
    slugMe: string;
    slugDisplay: string;
    statsV2: {
      currency: string;
      buyNowPrice: number;
      buyNowPriceNetFees: number;
      sellNowPrice: number;
      sellNowPriceNetFees: number;
      numListed: number;
      numMints: number;
      floor1h: number;
      floor24h: number;
      floor7d: number;
      sales1h: number;
      sales24h: number;
      sales7d: number;
      salesAll: number;
      volume1h: number;
      volume24h: number;
      volume7d: number;
      volumeAll: number;
    };
    firstListDate: string;
    name: string;
  };
}

/**
 * Simple in-memory cache to store collection stats with a timestamp.
 */
const collectionStatsCache: {
  [slug: string]: {
    timestamp: number;
    data: CollectionStatsResponse["instrumentTV2"];
  };
} = {};

/**
 * Fetches collection statistics from the Tensor API based on the provided slugDisplay.
 * Implements caching to respect the API rate limit of 1 request per second by caching responses for at least 10 seconds.
 *
 * @param slugDisplay - The slugDisplay value of the collection.
 * @returns A promise that resolves to the collection statistics.
 * @throws Will throw an error if the API request fails.
 */
export async function fetchCollectionStats(
  slugDisplay: string
): Promise<CollectionStatsResponse["instrumentTV2"]> {
  const cacheDuration = 10000; // 10 seconds in milliseconds
  const currentTime = Date.now();

  // Check if the data is in cache and still valid
  if (
    collectionStatsCache[slugDisplay] &&
    currentTime - collectionStatsCache[slugDisplay].timestamp < cacheDuration
  ) {
    console.log(`Returning cached data for slug: ${slugDisplay}`);
    return collectionStatsCache[slugDisplay].data;
  }

  try {
    const { data } = await axios.post<{
      data: CollectionStatsResponse;
      errors?: unknown[];
    }>(
      "https://api.tensor.so/graphql",
      {
        query: `query CollectionStats($slug: String!) {
          instrumentTV2(slug: $slug) {
            id # Used to find corresponding whitelist PDA (uuid) if using SDK
            slug # internal ID for collection (UUID or human-readable)
            slugMe # MagicEden's symbol
            slugDisplay # What's displayed in the URL on tensor.trade
            statsV2 {
              currency
              buyNowPrice
              buyNowPriceNetFees
              sellNowPrice
              sellNowPriceNetFees
              numListed
              numMints
              floor1h
              floor24h
              floor7d
              sales1h
              sales24h
              sales7d
              salesAll
              volume1h
              volume24h
              volume7d
              volumeAll
            }
            firstListDate
            name
          }
        }`,
        variables: {
          slug: slugDisplay,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-TENSOR-API-KEY": process.env.TENSOR_API_KEY ?? "",
        },
      }
    );

    if (data.errors) {
      console.error("GraphQL Errors:", data.errors);
      throw new Error("Failed to fetch collection statistics.");
    }

    // Update the cache with the new data and current timestamp
    collectionStatsCache[slugDisplay] = {
      timestamp: currentTime,
      data: data.data.instrumentTV2,
    };

    return data.data.instrumentTV2;
  } catch (err: unknown) {
    console.error("Error fetching collection stats:", err);
    if (err instanceof AxiosError) {
      console.error("Axios Error:", err.response?.data.errors);
    }
    throw err;
  }
}
