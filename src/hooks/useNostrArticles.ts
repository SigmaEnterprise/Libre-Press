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
 * Hook to fetch latest long-form articles from major Nostr relays
 */
export function useNostrArticles(limit = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr-articles', limit],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Create relay group for major relays
      const relayGroup = nostr.group(MAJOR_RELAYS);

      // Query for published long-form articles only (kind 30023)
      const events = await relayGroup.query(
        [
          {
            kinds: [30023],
            limit,
          },
        ],
        { signal }
      );

      // Deduplicate by event ID (same event from different relays)
      const uniqueEvents = new Map<string, NostrEvent>();
      for (const event of events) {
        if (!uniqueEvents.has(event.id)) {
          uniqueEvents.set(event.id, event);
        }
      }

      // Sort by created_at descending (newest first)
      const sortedEvents = Array.from(uniqueEvents.values()).sort(
        (a, b) => b.created_at - a.created_at
      );

      return sortedEvents;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

/**
 * Validate NIP-23 article event
 */
export function validateArticle(event: NostrEvent): boolean {
  if (event.kind !== 30023) return false;

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) return false;

  return true;
}
