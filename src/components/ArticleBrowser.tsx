import { useState } from 'react';
import { useNostrArticles, validateArticle } from '@/hooks/useNostrArticles';
import { useAuthor } from '@/hooks/useAuthor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Clock, User, RefreshCw, ExternalLink } from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
import { ArticlePreview } from '@/components/ArticlePreview';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';

function ArticleCard({ article, onClick }: { article: NostrEvent; onClick: () => void }) {
  const author = useAuthor(article.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.name ?? genUserName(article.pubkey);
  const profileImage = metadata?.picture;

  const titleTag = article.tags.find(([name]) => name === 'title')?.[1];
  const summaryTag = article.tags.find(([name]) => name === 'summary')?.[1];
  const imageTag = article.tags.find(([name]) => name === 'image')?.[1];
  const topicTags = article.tags.filter(([name]) => name === 't').map(([, value]) => value);

  const contentPreview = article.content
    .replace(/[#*`>\-\[\]]/g, '')
    .slice(0, 200) + (article.content.length > 200 ? '...' : '');

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card
      className="bg-gray-800 border-gray-700 hover:border-[#f0883e] transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Author */}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {profileImage && <AvatarImage src={profileImage} alt={displayName} />}
              <AvatarFallback className="bg-gray-700 text-white text-xs">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(article.created_at)}
              </p>
            </div>
          </div>

          {/* Image */}
          {imageTag && (
            <div className="w-full h-32 bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={imageTag}
                alt={titleTag || 'Article'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-[#f0883e] transition-colors">
            {titleTag || 'Untitled Article'}
          </h3>

          {/* Summary or Content Preview */}
          <p className="text-sm text-gray-400 line-clamp-3">
            {summaryTag || contentPreview}
          </p>

          {/* Topics */}
          {topicTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {topicTags.slice(0, 3).map((topic) => (
                <Badge
                  key={topic}
                  variant="secondary"
                  className="bg-gray-700 text-gray-300 text-xs"
                >
                  #{topic}
                </Badge>
              ))}
              {topicTags.length > 3 && (
                <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                  +{topicTags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ArticleCardSkeleton() {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full bg-gray-700" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-24 bg-gray-700" />
              <Skeleton className="h-3 w-16 bg-gray-700" />
            </div>
          </div>
          <Skeleton className="h-32 w-full bg-gray-700" />
          <Skeleton className="h-6 w-3/4 bg-gray-700" />
          <Skeleton className="h-4 w-full bg-gray-700" />
          <Skeleton className="h-4 w-2/3 bg-gray-700" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ArticleBrowser() {
  const { data: articles, isLoading, refetch, isFetching } = useNostrArticles(50);
  const [selectedArticle, setSelectedArticle] = useState<NostrEvent | null>(null);

  const validArticles = articles?.filter(validateArticle) || [];

  const handleCopyNaddr = (article: NostrEvent) => {
    const dTag = article.tags.find(([name]) => name === 'd')?.[1];
    if (!dTag) return;

    try {
      const naddr = nip19.naddrEncode({
        kind: article.kind,
        pubkey: article.pubkey,
        identifier: dTag,
      });

      navigator.clipboard.writeText(naddr);
    } catch (error) {
      console.error('Failed to copy naddr:', error);
    }
  };

  return (
    <>
      <Card className="bg-[#0d1117] border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#f0883e]" />
              Latest Nostr Articles
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                {validArticles.length} articles
              </Badge>
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
                size="sm"
                variant="outline"
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Showing latest articles from Damus, Primal, and Nos.lol • Updates every 30 seconds
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : validArticles.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No articles found</p>
            </div>
          ) : (
            <ScrollArea className="h-[700px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {validArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onClick={() => setSelectedArticle(article)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Article Detail Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="bg-[#0d1117] border-gray-800 text-white max-w-4xl max-h-[90vh]">
          {selectedArticle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#f0883e]" />
                    Article
                  </span>
                  <Button
                    onClick={() => handleCopyNaddr(selectedArticle)}
                    size="sm"
                    className="bg-[#f0883e] hover:bg-[#d97735] text-white"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Copy naddr
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
                <ArticlePreview
                  title={selectedArticle.tags.find(([name]) => name === 'title')?.[1] || 'Untitled'}
                  summary={selectedArticle.tags.find(([name]) => name === 'summary')?.[1]}
                  content={selectedArticle.content}
                  image={selectedArticle.tags.find(([name]) => name === 'image')?.[1]}
                  topics={selectedArticle.tags
                    .filter(([name]) => name === 't')
                    .map(([, value]) => value)}
                  publishedAt={selectedArticle.tags.find(([name]) => name === 'published_at')?.[1]}
                />
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
