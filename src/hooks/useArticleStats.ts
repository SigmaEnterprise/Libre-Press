import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

interface ArticleStats {
  zaps: NostrEvent[];
  reactions: NostrEvent[];
  reposts: NostrEvent[];
  comments: NostrEvent[];
  totalZapAmount: number;
}

/**
 * Hook to fetch engagement statistics for an article version
 * Includes zaps, reactions, reposts, and comments
 */
export function useArticleStats(eventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['article-stats', eventId],
    queryFn: async (c) => {
      if (!eventId) {
        return {
          zaps: [],
          reactions: [],
          reposts: [],
          comments: [],
          totalZapAmount: 0,
        };
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Query all engagement types in a single request
      const events = await nostr.query(
        [
          {
            kinds: [9735, 7, 6, 16, 1111], // Zaps, reactions, reposts, generic reposts, comments
            '#e': [eventId],
            limit: 500,
          },
        ],
        { signal }
      );

      // Separate by type
      const zaps = events.filter((e) => e.kind === 9735);
      const reactions = events.filter((e) => e.kind === 7);
      const reposts = events.filter((e) => e.kind === 6 || e.kind === 16);
      const comments = events.filter((e) => e.kind === 1111);

      // Calculate total zap amount from bolt11 invoices
      let totalZapAmount = 0;
      for (const zap of zaps) {
        const bolt11Tag = zap.tags.find(([name]) => name === 'bolt11')?.[1];
        if (bolt11Tag) {
          // Extract amount from bolt11 invoice
          const amountMatch = bolt11Tag.match(/lnbc?(\d+)([munp]?)/i);
          if (amountMatch) {
            const amount = parseInt(amountMatch[1], 10);
            const unit = amountMatch[2]?.toLowerCase();

            // Convert to millisatoshis
            let msats = 0;
            if (!unit || unit === 'n') {
              // nano-bitcoin (0.000000001 BTC) = 100 millisats
              msats = amount * 100;
            } else if (unit === 'u') {
              // micro-bitcoin (0.000001 BTC) = 100,000 millisats
              msats = amount * 100000;
            } else if (unit === 'm') {
              // milli-bitcoin (0.001 BTC) = 100,000,000 millisats
              msats = amount * 100000000;
            } else if (unit === 'p') {
              // pico-bitcoin (0.000000000001 BTC) = 0.1 millisats
              msats = amount * 0.1;
            }

            totalZapAmount += msats;
          }
        }
      }

      return {
        zaps,
        reactions,
        reposts,
        comments,
        totalZapAmount,
      } as ArticleStats;
    },
    enabled: !!eventId,
  });
}
