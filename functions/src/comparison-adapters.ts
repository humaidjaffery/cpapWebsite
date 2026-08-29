import { createHash } from "node:crypto";

import { Firestore } from "firebase-admin/firestore";

import {
  ComparisonCacheRecord,
  MaskSourceRecord,
} from "./comparison-summary";

const CACHE_COLLECTION = "maskComparisonSummaries";

export class PublishedMaskDataSource {
  constructor(private readonly dataBaseUrl: string) {}

  async getMask(slug: string): Promise<MaskSourceRecord> {
    const [profileResponse, pricesResponse] = await Promise.all([
      fetch(`${this.dataBaseUrl}/masks/${encodeURIComponent(slug)}.json`),
      fetch(`${this.dataBaseUrl}/prices/${encodeURIComponent(slug)}.json`),
    ]);
    if (!profileResponse.ok) {
      throw new PublishedMaskNotFoundError();
    }
    const profile = (await profileResponse.json()) as MaskSourceRecord["profile"] & {
      schemaVersion?: unknown;
    };
    const prices = pricesResponse.ok
      ? ((await pricesResponse.json()) as NonNullable<MaskSourceRecord["prices"]>)
      : null;
    if (profile.slug !== slug || !Array.isArray(profile.dimensions)) {
      throw new PublishedMaskNotFoundError();
    }
    const revision = createHash("sha256")
      .update(
        JSON.stringify({
          schemaVersion: profile.schemaVersion ?? null,
          processedReviews: profile.coverage?.processedReviews ?? null,
          pricesGeneratedAt: prices?.generatedAt ?? null,
        }),
      )
      .digest("hex");
    return { revision, profile, prices };
  }
}

export class FirestoreComparisonCache {
  constructor(private readonly firestore: Firestore) {}

  async get(key: string): Promise<ComparisonCacheRecord | null> {
    const snapshot = await this.firestore.collection(CACHE_COLLECTION).doc(key).get();
    return snapshot.exists ? (snapshot.data() as ComparisonCacheRecord) : null;
  }

  async set(key: string, record: ComparisonCacheRecord): Promise<void> {
    await this.firestore.collection(CACHE_COLLECTION).doc(key).set(record);
  }
}

export class PublishedMaskNotFoundError extends Error {
  constructor() {
    super("Published mask data was not found");
  }
}
