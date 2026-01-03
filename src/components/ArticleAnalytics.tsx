import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap, Heart, Repeat, MessageSquare, TrendingUp, Users } from 'lucide-react';
import { useArticleStats } from '@/hooks/useArticleStats';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { calculateContributionWeight } from '@/lib/diffUtils';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

interface ArticleAnalyticsProps {
  currentVersion?: NostrEvent;
  allVersions: NostrEvent[];
}

function ContributorCard({ pubkey, weight, versions }: { pubkey: string; weight: number; versions: NostrEvent[] }) {
  const author = useAuthor(pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.name ?? genUserName(pubkey);
  const profileImage = metadata?.picture;

  const contributionCount = versions.filter((v) => v.pubkey === pubkey).length;
  const percentage = Math.round(weight * 100);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
      <Avatar className="h-10 w-10">
        {profileImage && <AvatarImage src={profileImage} alt={displayName} />}
        <AvatarFallback className="bg-gray-700 text-white">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{displayName}</p>
        <p className="text-xs text-gray-400">
          {contributionCount} {contributionCount === 1 ? 'edit' : 'edits'}
        </p>
      </div>
      <Badge className="bg-[#f0883e] text-white">
        {percentage}%
      </Badge>
    </div>
  );
}

export function ArticleAnalytics({ currentVersion, allVersions }: ArticleAnalyticsProps) {
  const stats = useArticleStats(currentVersion?.id);

  // Calculate contributor weights
  const contributorWeights = new Map<string, number>();
  const uniqueContributors = new Set(allVersions.map((v) => v.pubkey));

  for (const pubkey of uniqueContributors) {
    const weight = calculateContributionWeight(
      pubkey,
      allVersions.map((v) => ({
        pubkey: v.pubkey,
        content: v.content,
        created_at: v.created_at,
      }))
    );
    contributorWeights.set(pubkey, weight);
  }

  const sortedContributors = Array.from(contributorWeights.entries())
    .sort(([, a], [, b]) => b - a)
    .filter(([, weight]) => weight > 0);

  const zapAmountSats = Math.floor((stats.data?.totalZapAmount || 0) / 1000);

  // Calculate quality score (simple heuristic based on engagement)
  const qualityScore = currentVersion
    ? Math.min(
        100,
        Math.floor(
          ((stats.data?.reactions.length || 0) * 2) +
          ((stats.data?.comments.length || 0) * 3) +
          ((stats.data?.reposts.length || 0) * 5) +
          ((stats.data?.zaps.length || 0) * 10)
        )
      )
    : 0;

  return (
    <div className="space-y-4">
      {/* Engagement Stats */}
      <Card className="bg-[#0d1117] border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#f0883e]" />
            Engagement Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-[#f0883e]" />
                <span className="text-xs font-medium text-gray-400 uppercase">Zaps</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.data?.zaps.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {zapAmountSats.toLocaleString()} sats
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-pink-500" />
                <span className="text-xs font-medium text-gray-400 uppercase">Reactions</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.data?.reactions.length || 0}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Repeat className="h-5 w-5 text-green-500" />
                <span className="text-xs font-medium text-gray-400 uppercase">Reposts</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.data?.reposts.length || 0}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium text-gray-400 uppercase">Comments</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.data?.comments.length || 0}</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Quality Score</span>
              <Badge 
                variant={qualityScore >= 70 ? 'default' : qualityScore >= 40 ? 'secondary' : 'outline'}
                className={qualityScore >= 70 ? 'bg-green-600' : qualityScore >= 40 ? 'bg-yellow-600' : 'bg-gray-700'}
              >
                {qualityScore}/100
              </Badge>
            </div>
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#f0883e] to-orange-500 transition-all"
                style={{ width: `${qualityScore}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contributors */}
      <Card className="bg-[#0d1117] border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#f0883e]" />
            Contributors
            <Badge variant="secondary" className="ml-auto bg-gray-800 text-gray-300">
              {sortedContributors.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedContributors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No contributors yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {sortedContributors.map(([pubkey, weight]) => (
                  <ContributorCard
                    key={pubkey}
                    pubkey={pubkey}
                    weight={weight}
                    versions={allVersions}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
          <p className="text-xs text-gray-500 mt-4">
            Contribution weights are calculated based on the amount of content changes made by each collaborator.
            These weights can be used for automatic revenue splits from zaps.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
