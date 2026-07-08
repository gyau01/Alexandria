import { Redis } from "@upstash/redis";

let client: Redis | null = null;

/**
 * Returns an Upstash Redis client, or null if the env vars aren't configured.
 * Callers should degrade gracefully when this returns null.
 */
export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!client) {
    client = new Redis({ url, token });
  }
  return client;
}

/** Hash of users this user has removed from their matches: field = otherUserId, value = ISO timestamp. */
export const removedMatchesKey = (userId: string) => `removed_matches:${userId}`;

/** Hash of polls this user has archived (hidden from their feed): field = pollId, value = ISO timestamp. */
export const archivedPollsKey = (userId: string) => `archived_polls:${userId}`;

/** Hash of community posts this user has archived: field = postId, value = ISO timestamp. */
export const archivedPostsKey = (userId: string) => `archived_posts:${userId}`;
