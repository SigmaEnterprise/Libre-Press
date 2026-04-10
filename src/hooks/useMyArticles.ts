import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

const MAJOR_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
];

/**
 * Hook to fetch all articles (published + drafts) authored by a specific pubkey
 * Returns articles deduplicated by d-tag, showing only the latest version per article
 */
export function useMyArticles(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['my-articles', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);

      // Try both from the default pool and a wider relay group
      const relayGroup = nostr.group(MAJOR_RELAYS);

      const [poolEvents, relayEvents] = await Promise.allSettled([
        nostr.query(
          [{ kinds: [30023, 30024], authors: [pubkey], limit: 500 }],
          { signal }
        ),
        relayGroup.query(
          [{ kinds: [30023, 30024], authors: [pubkey], limit: 500 }],
          { signal }
        ),
      ]);

      const allEvents: NostrEvent[] = [];
      if (poolEvents.status === 'fulfilled') allEvents.push(...poolEvents.value);
      if (relayEvents.status === 'fulfilled') allEvents.push(...relayEvents.value);

      // Deduplicate by event ID first
      const uniqueById = new Map<string, NostrEvent>();
      for (const event of allEvents) {
        if (!uniqueById.has(event.id)) {
          uniqueById.set(event.id, event);
        }
      }

      // Group by d-tag and keep the latest version per article
      const latestByDTag = new Map<string, NostrEvent>();
      for (const event of uniqueById.values()) {
        const dTag = event.tags.find(([name]) => name === 'd')?.[1];
        if (!dTag) continue;

        const existing = latestByDTag.get(dTag);
        if (!existing || event.created_at > existing.created_at) {
          latestByDTag.set(dTag, event);
        }
      }

      // Sort by created_at descending (newest first)
      return Array.from(latestByDTag.values()).sort(
        (a, b) => b.created_at - a.created_at
      );
    },
    enabled: !!pubkey,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

/**
 * Hook to count total versions of all articles by a pubkey
 */
export function useMyArticleStats(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['my-article-stats', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return { publishedCount: 0, draftCount: 0, totalVersions: 0 };

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query(
        [{ kinds: [30023, 30024], authors: [pubkey], limit: 1000 }],
        { signal }
      );

      const publishedCount = events.filter((e) => e.kind === 30023).length;
      const draftCount = events.filter((e) => e.kind === 30024).length;

      // Count unique articles
      const uniqueDTags = new Set(
        events.map((e) => e.tags.find(([name]) => name === 'd')?.[1]).filter(Boolean)
      );

      return {
        publishedCount,
        draftCount,
        totalVersions: events.length,
        uniqueArticles: uniqueDTags.size,
      };
    },
    enabled: !!pubkey,
    staleTime: 60000,
  });
}
