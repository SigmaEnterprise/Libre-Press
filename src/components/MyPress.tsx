import { useState, useMemo } from 'react';
import { nip19 } from 'nostr-tools';
import { useMyArticles, useMyArticleStats } from '@/hooks/useMyArticles';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArticlePreview } from '@/components/ArticlePreview';
import { LoginArea } from '@/components/auth/LoginArea';
import {
  BookOpen,
  FileEdit,
  BarChart3,
  Clock,
  Tag,
  Globe,
  FileText,
  Search,
  RefreshCw,
  Copy,
  CheckCircle,
  ExternalLink,
  Newspaper,
  TrendingUp,
  Layers,
  Filter,
  SortDesc,
  Eye,
  Zap,
  Pencil,
  X,
} from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useToast } from '@/hooks/useToast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 86400 * 365) return `${Math.floor(seconds / (86400 * 30))}mo ago`;
  return `${Math.floor(seconds / (86400 * 365))}y ago`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function readingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

function getArticleNaddr(article: NostrEvent): string | null {
  const dTag = article.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) return null;
  try {
    return nip19.naddrEncode({
      kind: article.kind,
      pubkey: article.pubkey,
      identifier: dTag,
    });
  } catch {
    return null;
  }
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border transition-all ${
        accent
          ? 'bg-gradient-to-br from-[#f0883e]/20 to-orange-900/10 border-[#f0883e]/40'
          : 'bg-gray-800/60 border-gray-700/60'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent ? 'text-[#f0883e]' : 'text-gray-400'}`} />
        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-[#f0883e]' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────

interface ArticleCardProps {
  article: NostrEvent;
  onRead: (article: NostrEvent) => void;
  onEdit: (article: NostrEvent) => void;
  onCopyNaddr: (article: NostrEvent) => void;
}

function ArticleCard({ article, onRead, onEdit, onCopyNaddr }: ArticleCardProps) {
  const titleTag = article.tags.find(([name]) => name === 'title')?.[1];
  const summaryTag = article.tags.find(([name]) => name === 'summary')?.[1];
  const imageTag = article.tags.find(([name]) => name === 'image')?.[1];
  const topicTags = article.tags.filter(([name]) => name === 't').map(([, value]) => value);
  const isPublished = article.kind === 30023;

  const contentPreview = (summaryTag || article.content)
    .replace(/[#*`>\-\[\]!]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 160);

  return (
    <article
      className="group relative bg-gray-800/50 border border-gray-700/60 rounded-2xl overflow-hidden hover:border-[#f0883e]/60 hover:bg-gray-800/80 transition-all duration-300 hover:shadow-lg hover:shadow-[#f0883e]/5 flex flex-col"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Header image */}
      {imageTag ? (
        <div className="relative h-44 overflow-hidden bg-gray-900 flex-shrink-0">
          <img
            src={imageTag}
            alt={titleTag || 'Article'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
          {/* Status badge on image */}
          <div className="absolute top-3 right-3">
            <Badge
              className={`text-xs font-semibold px-2.5 py-1 ${
                isPublished
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isPublished ? (
                <><Globe className="h-3 w-3 mr-1 inline" />Published</>
              ) : (
                <><FileEdit className="h-3 w-3 mr-1 inline" />Draft</>
              )}
            </Badge>
          </div>
        </div>
      ) : (
        /* No-image variant with decorative gradient */
        <div className="relative h-20 overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-[#f0883e] blur-2xl" />
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-orange-600 blur-2xl" />
          </div>
          <div className="absolute top-3 right-3">
            <Badge
              className={`text-xs font-semibold px-2.5 py-1 ${
                isPublished
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isPublished ? (
                <><Globe className="h-3 w-3 mr-1 inline" />Published</>
              ) : (
                <><FileEdit className="h-3 w-3 mr-1 inline" />Draft</>
              )}
            </Badge>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Title */}
        <h3
          className="text-base font-bold text-white line-clamp-2 group-hover:text-[#f0883e] transition-colors duration-200 mb-2 cursor-pointer leading-snug"
          onClick={() => onRead(article)}
        >
          {titleTag || 'Untitled Article'}
        </h3>

        {/* Summary */}
        <p className="text-sm text-gray-400 line-clamp-3 mb-3 flex-1 leading-relaxed">
          {contentPreview || 'No summary available.'}
        </p>

        {/* Topics */}
        {topicTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {topicTags.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-700/50 rounded-full px-2.5 py-0.5 border border-gray-600/40"
              >
                <Tag className="h-2.5 w-2.5" />
                {topic}
              </span>
            ))}
            {topicTags.length > 3 && (
              <span className="text-xs text-gray-600">+{topicTags.length - 3}</span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pt-3 border-t border-gray-700/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(article.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {readingTime(article.content)}
            </span>
          </div>
          <span className="text-gray-600 font-mono text-[10px] truncate max-w-[120px]">
            {formatDate(article.created_at)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onRead(article)}
            size="sm"
            className="flex-1 bg-[#f0883e] hover:bg-[#d97735] text-white text-xs h-8 font-medium"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Read
          </Button>
          <Button
            onClick={() => onEdit(article)}
            size="sm"
            variant="outline"
            className="flex-1 bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-xs h-8"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            onClick={() => onCopyNaddr(article)}
            size="sm"
            variant="outline"
            className="bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white h-8 px-2.5"
            title="Copy naddr"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

// ─── Skeleton Card ──────────────────────────────────────────────────────────

function ArticleCardSkeleton() {
  return (
    <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl overflow-hidden">
      <Skeleton className="h-44 w-full bg-gray-700/50" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-4/5 bg-gray-700/50" />
        <Skeleton className="h-4 w-full bg-gray-700/50" />
        <Skeleton className="h-4 w-2/3 bg-gray-700/50" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 flex-1 bg-gray-700/50" />
          <Skeleton className="h-8 flex-1 bg-gray-700/50" />
          <Skeleton className="h-8 w-8 bg-gray-700/50" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onNewArticle }: { onNewArticle: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative mb-6">
        <div className="bg-gradient-to-br from-[#f0883e]/20 to-orange-900/10 border border-[#f0883e]/20 rounded-2xl p-6 w-24 h-24 flex items-center justify-center">
          <Newspaper className="h-12 w-12 text-[#f0883e]/60" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#f0883e] rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">0</span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No articles yet</h3>
      <p className="text-gray-400 text-sm max-w-xs mb-6 leading-relaxed">
        Your published articles and drafts will appear here. Start writing your first piece for the world to read.
      </p>
      <Button
        onClick={onNewArticle}
        className="bg-[#f0883e] hover:bg-[#d97735] text-white px-6"
      >
        <Pencil className="h-4 w-4 mr-2" />
        Write Your First Article
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SortOption = 'newest' | 'oldest' | 'title';
type FilterOption = 'all' | 'published' | 'drafts';

interface MyPressProps {
  onEditArticle?: (dTag: string) => void;
}

export function MyPress({ onEditArticle }: MyPressProps) {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey);
  const { toast } = useToast();

  const { data: articles, isLoading, refetch, isFetching } = useMyArticles(user?.pubkey);
  const { data: stats } = useMyArticleStats(user?.pubkey);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedArticle, setSelectedArticle] = useState<NostrEvent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const displayName = metadata?.display_name || metadata?.name || genUserName(user?.pubkey || '');
  const profileImage = metadata?.picture;

  // Filtered + sorted articles
  const processedArticles = useMemo(() => {
    if (!articles) return [];

    let result = [...articles];

    // Filter by status
    if (filterBy === 'published') result = result.filter((a) => a.kind === 30023);
    if (filterBy === 'drafts') result = result.filter((a) => a.kind === 30024);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => {
        const title = a.tags.find(([n]) => n === 'title')?.[1] || '';
        const summary = a.tags.find(([n]) => n === 'summary')?.[1] || '';
        const topics = a.tags.filter(([n]) => n === 't').map(([, v]) => v).join(' ');
        return (
          title.toLowerCase().includes(q) ||
          summary.toLowerCase().includes(q) ||
          topics.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    if (sortBy === 'newest') result.sort((a, b) => b.created_at - a.created_at);
    if (sortBy === 'oldest') result.sort((a, b) => a.created_at - b.created_at);
    if (sortBy === 'title') {
      result.sort((a, b) => {
        const ta = a.tags.find(([n]) => n === 'title')?.[1] || '';
        const tb = b.tags.find(([n]) => n === 'title')?.[1] || '';
        return ta.localeCompare(tb);
      });
    }

    return result;
  }, [articles, searchQuery, sortBy, filterBy]);

  const publishedCount = articles?.filter((a) => a.kind === 30023).length ?? 0;
  const draftCount = articles?.filter((a) => a.kind === 30024).length ?? 0;
  const totalCount = articles?.length ?? 0;

  const handleCopyNaddr = (article: NostrEvent) => {
    const naddr = getArticleNaddr(article);
    if (!naddr) {
      toast({ title: 'Error', description: 'Could not generate naddr', variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(naddr).then(() => {
      setCopiedId(article.id);
      toast({ title: 'Copied!', description: 'Article address copied to clipboard' });
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleEdit = (article: NostrEvent) => {
    const dTag = article.tags.find(([n]) => n === 'd')?.[1];
    if (dTag && onEditArticle) {
      onEditArticle(dTag);
    }
  };

  const handleNewArticle = () => {
    if (onEditArticle) {
      onEditArticle(`article-${Date.now()}`);
    }
  };

  // ── Not logged in ──
  if (!user) {
    return (
      <Card className="bg-[#0d1117] border-gray-800">
        <CardContent className="py-20 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <div className="bg-gradient-to-br from-[#f0883e]/20 to-orange-900/10 border border-[#f0883e]/20 rounded-2xl p-6 w-20 h-20 mx-auto flex items-center justify-center">
              <Newspaper className="h-10 w-10 text-[#f0883e]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Sign in to view your press</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Log in with your Nostr identity to see all the articles you've ever written across the decentralized web.
              </p>
            </div>
            <div className="flex justify-center">
              <LoginArea className="max-w-xs" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-[#0d1117] to-gray-900 border border-gray-700/60 p-6 md:p-8">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f0883e]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-900/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profileImage ? (
              <img
                src={profileImage}
                alt={displayName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#f0883e]/30 ring-4 ring-[#f0883e]/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f0883e] to-orange-700 flex items-center justify-center text-white text-xl font-bold border-2 border-[#f0883e]/30">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Newspaper className="h-4 w-4 text-[#f0883e]" />
              <span className="text-xs uppercase tracking-widest text-[#f0883e] font-semibold">My Press</span>
            </div>
            <h2 className="text-2xl font-bold text-white truncate">{displayName}</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Your decentralized publishing portfolio on Nostr
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              size="sm"
              variant="outline"
              className="bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700 h-9"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleNewArticle}
              size="sm"
              className="bg-[#f0883e] hover:bg-[#d97735] text-white h-9 px-4 font-medium"
            >
              <Pencil className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        {!isLoading && (
          <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Layers} label="Total Articles" value={totalCount} accent />
            <StatCard icon={Globe} label="Published" value={publishedCount} />
            <StatCard icon={FileEdit} label="Drafts" value={draftCount} />
            <StatCard icon={TrendingUp} label="All Versions" value={stats?.totalVersions ?? '—'} />
          </div>
        )}
        {isLoading && (
          <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-gray-700/40" />
            ))}
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles, topics, content…"
            className="pl-10 pr-10 bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-500 h-10 rounded-xl focus:border-[#f0883e]/50 focus:ring-1 focus:ring-[#f0883e]/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter by status */}
        <div className="flex items-center gap-2">
          {(['all', 'published', 'drafts'] as FilterOption[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterBy(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all capitalize h-10 border ${
                filterBy === f
                  ? 'bg-[#f0883e] text-white border-[#f0883e]'
                  : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-white'
              }`}
            >
              {f === 'all'
                ? `All (${totalCount})`
                : f === 'published'
                ? `Published (${publishedCount})`
                : `Drafts (${draftCount})`}
            </button>
          ))}
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700 h-10 px-3 rounded-xl gap-2"
            >
              <SortDesc className="h-4 w-4" />
              <span className="text-xs capitalize hidden sm:inline">
                {sortBy === 'newest' ? 'Newest first' : sortBy === 'oldest' ? 'Oldest first' : 'A–Z'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-gray-900 border-gray-700 text-white min-w-[160px]"
          >
            <DropdownMenuLabel className="text-gray-400 text-xs">Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            {[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'title', label: 'Title (A–Z)' },
            ].map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setSortBy(option.value as SortOption)}
                className={`cursor-pointer hover:bg-gray-800 ${
                  sortBy === option.value ? 'text-[#f0883e]' : ''
                }`}
              >
                {sortBy === option.value && <CheckCircle className="h-3.5 w-3.5 mr-2 text-[#f0883e]" />}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Results count ── */}
      {!isLoading && processedArticles.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="h-3.5 w-3.5" />
          <span>
            Showing <span className="text-white font-medium">{processedArticles.length}</span>{' '}
            {processedArticles.length === 1 ? 'article' : 'articles'}
            {searchQuery && (
              <> matching <span className="text-[#f0883e]">"{searchQuery}"</span></>
            )}
          </span>
        </div>
      )}

      {/* ── Article Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      ) : processedArticles.length === 0 ? (
        searchQuery || filterBy !== 'all' ? (
          /* No search results */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-white font-semibold mb-2">No results found</h3>
            <p className="text-gray-400 text-sm mb-4">
              Try adjusting your search or filter criteria
            </p>
            <div className="flex gap-2">
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear search
                </Button>
              )}
              {filterBy !== 'all' && (
                <Button
                  onClick={() => setFilterBy('all')}
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                >
                  Show all
                </Button>
              )}
            </div>
          </div>
        ) : (
          <EmptyState onNewArticle={handleNewArticle} />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {processedArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onRead={(a) => setSelectedArticle(a)}
              onEdit={handleEdit}
              onCopyNaddr={handleCopyNaddr}
            />
          ))}
        </div>
      )}

      {/* ── Article Detail Modal ── */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="bg-[#0d1117] border-gray-800 text-white max-w-4xl w-[95vw] max-h-[92vh] p-0 overflow-hidden rounded-2xl">
          {selectedArticle && (
            <>
              {/* Modal header */}
              <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-800 flex-row items-center justify-between space-y-0">
                <DialogTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="h-5 w-5 text-[#f0883e]" />
                  <span className="truncate max-w-xs">
                    {selectedArticle.tags.find(([n]) => n === 'title')?.[1] || 'Untitled'}
                  </span>
                </DialogTitle>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Naddr copy */}
                  <Button
                    onClick={() => handleCopyNaddr(selectedArticle)}
                    size="sm"
                    variant="outline"
                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 h-8 px-3 text-xs"
                  >
                    {copiedId === selectedArticle.id ? (
                      <><CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy naddr</>
                    )}
                  </Button>
                  {/* Edit button */}
                  <Button
                    onClick={() => {
                      handleEdit(selectedArticle);
                      setSelectedArticle(null);
                    }}
                    size="sm"
                    className="bg-[#f0883e] hover:bg-[#d97735] text-white h-8 px-3 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </DialogHeader>

              {/* Article badges */}
              <div className="px-6 py-3 flex items-center gap-3 border-b border-gray-800/50">
                <Badge
                  className={`text-xs px-2.5 py-1 ${
                    selectedArticle.kind === 30023
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {selectedArticle.kind === 30023 ? (
                    <><Globe className="h-3 w-3 mr-1 inline" />Published</>
                  ) : (
                    <><FileEdit className="h-3 w-3 mr-1 inline" />Draft</>
                  )}
                </Badge>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(selectedArticle.created_at)}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {readingTime(selectedArticle.content)}
                </span>
              </div>

              {/* Article content */}
              <ScrollArea className="max-h-[calc(92vh-140px)]">
                <div className="px-6 py-6">
                  <ArticlePreview
                    title={selectedArticle.tags.find(([n]) => n === 'title')?.[1] || 'Untitled'}
                    summary={selectedArticle.tags.find(([n]) => n === 'summary')?.[1]}
                    content={selectedArticle.content}
                    image={selectedArticle.tags.find(([n]) => n === 'image')?.[1]}
                    topics={selectedArticle.tags
                      .filter(([n]) => n === 't')
                      .map(([, v]) => v)}
                    publishedAt={selectedArticle.tags.find(([n]) => n === 'published_at')?.[1]}
                  />
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
