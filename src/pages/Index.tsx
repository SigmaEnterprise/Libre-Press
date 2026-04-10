import { useState, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useArticleVersions } from '@/hooks/useArticleVersions';
import { LoginArea } from '@/components/auth/LoginArea';
import { ArticleEditor } from '@/components/ArticleEditor';
import { VersionHistory } from '@/components/VersionHistory';
import { DiffViewer } from '@/components/DiffViewer';
import { ArticleAnalytics } from '@/components/ArticleAnalytics';
import { ArticleZapButtonWrapper } from '@/components/ArticleZapButtonWrapper';
import { ArticleBrowser } from '@/components/ArticleBrowser';
import { MyPress } from '@/components/MyPress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';
import {
  FileText,
  GitBranch,
  BarChart3,
  Sparkles,
  AlertCircle,
  BookOpen,
  Newspaper,
  Globe,
  PenLine,
} from 'lucide-react';

// ─── Tab types ────────────────────────────────────────────────────────────────

type TopTab = 'press' | 'editor' | 'browse';
type EditorTab = 'editor' | 'versions' | 'analytics';

// ─── Nav Tab Button ───────────────────────────────────────────────────────────

function NavTab({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
        active
          ? 'bg-[#f0883e] text-white shadow-lg shadow-[#f0883e]/20'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
      {badge && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
            active ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const Index = () => {
  useSeoMeta({
    title: 'Libre Press — Nostr Long-Form Publishing',
    description:
      'A decentralized publishing platform for NIP-23 long-form content with versioning, collaborative editing, peer review, and Lightning payments.',
  });

  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Top-level tab state ──
  const [topTab, setTopTab] = useState<TopTab>('press');

  // ── Article identifier state ──
  const [dTag, setDTag] = useState('');
  const [authorPubkey, setAuthorPubkey] = useState<string | undefined>();
  const [inputDTag, setInputDTag] = useState(searchParams.get('article') || '');
  const [parseError, setParseError] = useState<string | null>(null);

  // ── Fetch article versions ──
  const { data: versions, isLoading } = useArticleVersions(dTag, authorPubkey);

  // ── Editor sub-tab + compare mode ──
  const [currentVersion, setCurrentVersion] = useState<NostrEvent | undefined>();
  const [compareMode, setCompareMode] = useState<{ v1: NostrEvent; v2: NostrEvent } | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>('editor');

  // ── Init from URL ──
  useEffect(() => {
    const articleParam = searchParams.get('article');
    if (articleParam) {
      parseAndLoadArticle(articleParam);
      setTopTab('editor');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync URL when article changes ──
  useEffect(() => {
    if (dTag && topTab === 'editor') {
      setSearchParams({ article: inputDTag || dTag });
    } else if (topTab !== 'editor') {
      setSearchParams({});
    }
  }, [dTag, topTab, setSearchParams]);

  // ── Set current version to latest on load ──
  useEffect(() => {
    if (versions && versions.length > 0 && !currentVersion) {
      setCurrentVersion(versions[0]);
    }
  }, [versions, currentVersion]);

  // ── Helpers ──

  const parseAndLoadArticle = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setParseError(null);

    if (trimmed.startsWith('naddr1')) {
      try {
        const decoded = nip19.decode(trimmed);

        if (decoded.type !== 'naddr') {
          setParseError('Invalid identifier type. Please use an naddr for articles.');
          toast({
            title: 'Invalid Identifier',
            description: 'Please provide an naddr identifier for articles',
            variant: 'destructive',
          });
          return;
        }

        const naddr = decoded.data;

        if (naddr.kind !== 30023 && naddr.kind !== 30024) {
          setParseError(`Invalid article kind: ${naddr.kind}. Expected 30023 or 30024.`);
          toast({
            title: 'Invalid Article Kind',
            description: `This naddr points to kind ${naddr.kind}, but articles use kind 30023 or 30024`,
            variant: 'destructive',
          });
          return;
        }

        setDTag(naddr.identifier);
        setAuthorPubkey(naddr.pubkey);
        setCurrentVersion(undefined);

        toast({ title: 'Article Loaded', description: 'Loading versions from Nostr…' });
      } catch (error) {
        setParseError('Failed to decode naddr. Please check the format.');
        toast({
          title: 'Decode Error',
          description: 'Invalid naddr format. Please check and try again.',
          variant: 'destructive',
        });
        console.error('naddr decode error:', error);
      }
    } else {
      setDTag(trimmed);
      setAuthorPubkey(user?.pubkey);
      setCurrentVersion(undefined);
    }
  };

  const handleLoadArticle = () => {
    parseAndLoadArticle(inputDTag);
  };

  const handleNewArticle = (id?: string) => {
    const newId = id || `article-${Date.now()}`;
    setDTag(newId);
    setInputDTag(newId);
    setCurrentVersion(undefined);
    setEditorTab('editor');
    setTopTab('editor');
  };

  const handleSelectVersion = (version: NostrEvent) => {
    setCurrentVersion(version);
    setCompareMode(null);
    setEditorTab('editor');
  };

  const handleCompare = (v1: NostrEvent, v2: NostrEvent) => {
    const ordered = v1.created_at < v2.created_at ? [v1, v2] : [v2, v1];
    setCompareMode({ v1: ordered[0], v2: ordered[1] });
    setEditorTab('versions');
  };

  const handlePublish = (event: NostrEvent) => {
    setCurrentVersion(event);
  };

  const handleReset = () => {
    setDTag('');
    setAuthorPubkey(undefined);
    setInputDTag('');
    setCurrentVersion(undefined);
    setCompareMode(null);
    setParseError(null);
    setEditorTab('editor');
    setSearchParams({});
  };

  // Called from MyPress when user clicks "Edit" on one of their articles
  const handleEditFromPress = (id: string) => {
    setDTag(id);
    setInputDTag(id);
    setAuthorPubkey(user?.pubkey);
    setCurrentVersion(undefined);
    setEditorTab('editor');
    setTopTab('editor');
  };

  // ── Render ──

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* ── Sticky Header ── */}
      <header className="border-b border-gray-800 bg-[#0d1117]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <button
              onClick={() => {
                handleReset();
                setTopTab('press');
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
            >
              <div className="bg-gradient-to-br from-[#f0883e] to-orange-600 p-2 rounded-xl shadow-lg shadow-[#f0883e]/20">
                <PenLine className="h-5 w-5 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <h1 className="text-lg font-bold text-white leading-none">Libre Press</h1>
                <p className="text-[10px] text-gray-500 tracking-wider uppercase mt-0.5">
                  Decentralized Publishing
                </p>
              </div>
            </button>

            {/* Navigation tabs — desktop */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-900/60 border border-gray-700/60 rounded-xl p-1">
              <NavTab
                active={topTab === 'press'}
                onClick={() => setTopTab('press')}
                icon={Newspaper}
                label="My Press"
              />
              <NavTab
                active={topTab === 'editor'}
                onClick={() => setTopTab('editor')}
                icon={FileText}
                label="Editor"
                badge={dTag ? '1' : undefined}
              />
              <NavTab
                active={topTab === 'browse'}
                onClick={() => setTopTab('browse')}
                icon={Globe}
                label="Browse"
              />
            </nav>

            {/* Login */}
            <LoginArea className="max-w-48 flex-shrink-0" />
          </div>

          {/* Navigation tabs — mobile (below header) */}
          <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto scrollbar-hide">
            <NavTab
              active={topTab === 'press'}
              onClick={() => setTopTab('press')}
              icon={Newspaper}
              label="My Press"
            />
            <NavTab
              active={topTab === 'editor'}
              onClick={() => setTopTab('editor')}
              icon={FileText}
              label="Editor"
              badge={dTag ? '1' : undefined}
            />
            <NavTab
              active={topTab === 'browse'}
              onClick={() => setTopTab('browse')}
              icon={Globe}
              label="Browse"
            />
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="container mx-auto px-4 py-6 md:py-8">

        {/* ════════════════════ MY PRESS TAB ════════════════════ */}
        {topTab === 'press' && (
          <MyPress onEditArticle={handleEditFromPress} />
        )}

        {/* ════════════════════ EDITOR TAB ════════════════════ */}
        {topTab === 'editor' && (
          <div className="space-y-6">
            {/* Article Selector Card */}
            <Card className="bg-[#0d1117] border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-[#f0883e]" />
                  Article Manager
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Create a new article or load one by its d-tag or naddr
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="article-id" className="text-white text-sm">
                      Article Identifier
                    </Label>
                    <Input
                      id="article-id"
                      value={inputDTag}
                      onChange={(e) => {
                        setInputDTag(e.target.value);
                        setParseError(null);
                      }}
                      placeholder="article-unique-id or naddr1…"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLoadArticle();
                      }}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={handleLoadArticle}
                      disabled={!inputDTag.trim() || isLoading}
                      className="bg-[#f0883e] hover:bg-[#d97735] text-white h-10 px-4"
                    >
                      <GitBranch className="h-4 w-4 mr-2" />
                      Load
                    </Button>
                    <Button
                      onClick={() => handleNewArticle()}
                      variant="outline"
                      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 h-10 px-4"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      New
                    </Button>
                  </div>
                </div>

                {parseError && (
                  <Alert variant="destructive" className="mt-4 bg-red-900/20 border-red-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-400">{parseError}</AlertDescription>
                  </Alert>
                )}

                {dTag && (
                  <div className="mt-4 p-3 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">Current article</p>
                      <p className="text-sm text-white font-mono truncate">{dTag}</p>
                      {versions && versions.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
                        </p>
                      )}
                    </div>
                    {currentVersion && currentVersion.kind === 30023 && (
                      <ArticleZapButtonWrapper article={currentVersion} />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Editor Interface ── */}
            {dTag && (
              <div className="grid lg:grid-cols-[1fr_380px] gap-6">
                {/* Left column — tabs */}
                <div>
                  {compareMode ? (
                    <DiffViewer
                      oldVersion={compareMode.v1}
                      newVersion={compareMode.v2}
                      onClose={() => setCompareMode(null)}
                    />
                  ) : (
                    <div>
                      {/* Sub-tab nav */}
                      <div className="flex items-center gap-1 bg-gray-900/60 border border-gray-700/60 rounded-xl p-1 mb-5 overflow-x-auto">
                        {[
                          { value: 'editor' as EditorTab, icon: FileText, label: 'Editor' },
                          { value: 'versions' as EditorTab, icon: GitBranch, label: 'Versions' },
                          { value: 'analytics' as EditorTab, icon: BarChart3, label: 'Analytics' },
                        ].map(({ value, icon: Icon, label }) => (
                          <button
                            key={value}
                            onClick={() => setEditorTab(value)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                              editorTab === value
                                ? 'bg-[#f0883e] text-white shadow-md shadow-[#f0883e]/20'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </button>
                        ))}
                      </div>

                      {editorTab === 'editor' && (
                        <ArticleEditor
                          initialArticle={currentVersion}
                          dTag={dTag}
                          onPublish={handlePublish}
                        />
                      )}

                      {editorTab === 'versions' && (
                        <VersionHistory
                          versions={versions || []}
                          currentVersionId={currentVersion?.id}
                          onSelectVersion={handleSelectVersion}
                          onCompare={handleCompare}
                        />
                      )}

                      {editorTab === 'analytics' && (
                        <ArticleAnalytics
                          currentVersion={currentVersion}
                          allVersions={versions || []}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Right column — versions sidebar (desktop only) */}
                <div className="hidden lg:block">
                  <VersionHistory
                    versions={versions || []}
                    currentVersionId={currentVersion?.id}
                    onSelectVersion={handleSelectVersion}
                    onCompare={handleCompare}
                  />
                </div>
              </div>
            )}

            {/* ── Empty / welcome state ── */}
            {!dTag && (
              <Card className="border-dashed border-gray-700 bg-[#0d1117]">
                <CardContent className="py-16 px-8 text-center">
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="bg-gradient-to-br from-[#f0883e] to-orange-600 p-4 rounded-2xl w-20 h-20 mx-auto flex items-center justify-center shadow-xl shadow-[#f0883e]/20">
                      <FileText className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Article Editor</h2>
                      <p className="text-gray-400">
                        Create a new article or load an existing one using its identifier above.
                      </p>
                    </div>
                    <div className="space-y-3 text-sm text-gray-400 text-left bg-gray-800 p-4 rounded-xl border border-gray-700">
                      <div className="flex items-start gap-3">
                        <GitBranch className="h-5 w-5 text-[#f0883e] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-white">Version Control</p>
                          <p className="text-xs">Track all changes and restore previous versions</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-[#f0883e] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-white">Collaborative Editing</p>
                          <p className="text-xs">Work with multiple contributors and split revenue</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <BarChart3 className="h-5 w-5 text-[#f0883e] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-white">Analytics & Engagement</p>
                          <p className="text-xs">Track zaps, reactions, comments, and quality metrics</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => handleNewArticle()}
                        className="bg-[#f0883e] hover:bg-[#d97735] text-white px-6"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        New Article
                      </Button>
                      <Button
                        onClick={() => setTopTab('press')}
                        variant="outline"
                        className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 px-6"
                      >
                        <Newspaper className="h-4 w-4 mr-2" />
                        My Press
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ════════════════════ BROWSE TAB ════════════════════ */}
        {topTab === 'browse' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-[#f0883e]/20 to-orange-900/10 border border-[#f0883e]/20 rounded-xl p-2.5">
                <BookOpen className="h-5 w-5 text-[#f0883e]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Global Article Feed</h2>
                <p className="text-sm text-gray-400">Browse the latest long-form content from the Nostr network</p>
              </div>
            </div>
            <ArticleBrowser />
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 mt-16 py-8 bg-[#0d1117]">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <span>Powered by</span>
            <a
              href="https://github.com/nostr-protocol/nips/blob/master/23.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f0883e] hover:underline"
            >
              NIP-23
            </a>
            <span>·</span>
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f0883e] hover:underline"
            >
              Vibed with Shakespeare
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
