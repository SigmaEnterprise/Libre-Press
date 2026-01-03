import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to fetch all versions of an article by its d-tag identifier
 * Returns versions sorted by created_at (newest first)
 */
export function useArticleVersions(dTag: string, authorPubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['article-versions', dTag, authorPubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const filter: Record<string, unknown> = {
        kinds: [30023, 30024], // Published articles and drafts
        '#d': [dTag],
        limit: 100,
      };

      // Only filter by author if provided
      if (authorPubkey) {
        filter.authors = [authorPubkey];
      }

      const events = await nostr.query([filter], { signal });

      // Sort by created_at descending (newest first)
      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!dTag,
  });
}

/**
 * Validate NIP-23 article event structure
 */
export function validateArticleEvent(event: NostrEvent): boolean {
  // Check if it's a long-form content kind
  if (![30023, 30024].includes(event.kind)) return false;

  // Check for required d tag
  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) return false;

  return true;
}
