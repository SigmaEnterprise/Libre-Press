import { ArticleZapButton } from '@/components/ArticleZapButton';
import { useAuthor } from '@/hooks/useAuthor';
import { Skeleton } from '@/components/ui/skeleton';
import type { NostrEvent } from '@nostrify/nostrify';

interface Contributor {
  pubkey: string;
  weight: number;
  lud16?: string;
}

interface ArticleZapButtonWrapperProps {
  article: NostrEvent;
  className?: string;
}

export function ArticleZapButtonWrapper({ article, className }: ArticleZapButtonWrapperProps) {
  // Extract collaborators from article tags
  const contributorPubkeys = article.tags
    .filter(([name]) => name === 'p')
    .map(([, pubkey]) => pubkey);

  // Fetch metadata for all contributors
  const contributorData = contributorPubkeys.map((pubkey) => {
    const weightTag = article.tags.find(
      ([name, p]) => name === 'contribution_weight' && p === pubkey
    );
    const weight = weightTag ? parseFloat(weightTag[2]) : 1;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: author, isLoading } = useAuthor(pubkey);

    return {
      pubkey,
      weight,
      lud16: author?.metadata?.lud16,
      isLoading,
    };
  });

  // Check if any contributor data is still loading
  const isLoading = contributorData.some((c) => c.isLoading);

  // If no contributors, don't show zap button
  if (contributorPubkeys.length === 0) {
    return null;
  }

  // Show skeleton while loading
  if (isLoading) {
    return <Skeleton className="h-10 w-32 bg-gray-800" />;
  }

  // Filter out contributors without lightning addresses
  const validContributors: Contributor[] = contributorData
    .filter((c) => c.lud16)
    .map((c) => ({
      pubkey: c.pubkey,
      weight: c.weight,
      lud16: c.lud16,
    }));

  // If no valid contributors with lightning addresses, don't show button
  if (validContributors.length === 0) {
    return null;
  }

  return (
    <ArticleZapButton
      article={article}
      contributors={validContributors}
      className={className}
    />
  );
}
