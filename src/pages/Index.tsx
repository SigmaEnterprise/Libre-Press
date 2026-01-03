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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, GitBranch, BarChart3, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Article Version Manager - Collaborative Long-Form Publishing',
    description: 'A decentralized publishing platform for NIP-23 long-form content with versioning, collaborative editing, peer review, and Lightning payments.',
  });

  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Article identifier state
  const [dTag, setDTag] = useState('');
  const [authorPubkey, setAuthorPubkey] = useState<string | undefined>();
  const [inputDTag, setInputDTag] = useState(searchParams.get('article') || '');
  const [parseError, setParseError] = useState<string | null>(null);

  // Fetch article versions
  const { data: versions, isLoading } = useArticleVersions(dTag, authorPubkey);

  // Current view state
  const [currentVersion, setCurrentVersion] = useState<NostrEvent | undefined>();
  const [compareMode, setCompareMode] = useState<{ v1: NostrEvent; v2: NostrEvent } | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'versions' | 'analytics'>('editor');

  // Initialize from URL on mount
  useEffect(() => {
    const articleParam = searchParams.get('article');
    if (articleParam) {
      parseAndLoadArticle(articleParam);
    }
  }, []); // Only run on mount

  // Update URL when article changes
  useEffect(() => {
    if (dTag) {
      setSearchParams({ article: inputDTag || dTag });
    } else {
      setSearchParams({});
    }
  }, [dTag, setSearchParams]);

  // Set current version to latest when versions load
  useEffect(() => {
    if (versions && versions.length > 0 && !currentVersion) {
      setCurrentVersion(versions[0]);
    }
  }, [versions, currentVersion]);

  /**
   * Parse article identifier - supports both plain d-tag and naddr format
   */
  const parseAndLoadArticle = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setParseError(null);

    // Check if it's an naddr
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

        // Validate it's a long-form content kind
        if (naddr.kind !== 30023 && naddr.kind !== 30024) {
          setParseError(`Invalid article kind: ${naddr.kind}. Expected 30023 or 30024.`);
          toast({
            title: 'Invalid Article Kind',
            description: `This naddr points to kind ${naddr.kind}, but articles use kind 30023 or 30024`,
            variant: 'destructive',
          });
          return;
        }

        // Set the d-tag and author from the naddr
        setDTag(naddr.identifier);
        setAuthorPubkey(naddr.pubkey);
        setCurrentVersion(undefined);

        toast({
          title: 'Article Loaded',
          description: 'Loading versions from Nostr...',
        });
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
      // Plain d-tag - load without author filter
      setDTag(trimmed);
      setAuthorPubkey(user?.pubkey); // Use current user's pubkey if available
      setCurrentVersion(undefined);
    }
  };

  const handleLoadArticle = () => {
    parseAndLoadArticle(inputDTag);
  };

  const handleNewArticle = () => {
    const newId = `article-${Date.now()}`;
    setDTag(newId);
    setInputDTag(newId);
    setCurrentVersion(undefined);
  };

  const handleSelectVersion = (version: NostrEvent) => {
    setCurrentVersion(version);
    setCompareMode(null);
    setActiveTab('editor');
  };

  const handleCompare = (v1: NostrEvent, v2: NostrEvent) => {
    // Ensure older version is first
    const ordered = v1.created_at < v2.created_at ? [v1, v2] : [v2, v1];
    setCompareMode({ v1: ordered[0], v2: ordered[1] });
    setActiveTab('versions');
  };

  const handlePublish = (event: NostrEvent) => {
    setCurrentVersion(event);
  };

  const handleReset = () => {
    // Clear all state
    setDTag('');
    setAuthorPubkey(undefined);
    setInputDTag('');
    setCurrentVersion(undefined);
    setCompareMode(null);
    setParseError(null);
    setActiveTab('editor');

    // Clear URL params
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0d1117]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="bg-gradient-to-br from-[#f0883e] to-orange-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-white">Nostr Article Versions</h1>
                <p className="text-xs text-gray-400">Collaborative Long-Form Publishing</p>
              </div>
            </button>
            <LoginArea className="max-w-60" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Article Selector */}
        <Card className="bg-[#0d1117] border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#f0883e]" />
              Article Manager
            </CardTitle>
            <CardDescription className="text-gray-400">
              Create a new article or load an existing one by its identifier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-[1fr_auto_auto] gap-3">
              <div className="space-y-2">
                <Label htmlFor="article-id" className="text-white">
                  Article Identifier (d-tag or naddr)
                </Label>
                <Input
                  id="article-id"
                  value={inputDTag}
                  onChange={(e) => {
                    setInputDTag(e.target.value);
                    setParseError(null);
                  }}
                  placeholder="article-unique-id or naddr1..."
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLoadArticle();
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  Enter a plain d-tag identifier or an naddr for a specific article
                </p>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleLoadArticle}
                  disabled={!inputDTag.trim() || isLoading}
                  className="bg-[#f0883e] hover:bg-[#d97735] text-white w-full md:w-auto"
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  Load Article
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleNewArticle}
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 w-full md:w-auto"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  New Article
                </Button>
              </div>
            </div>

            {parseError && (
              <Alert variant="destructive" className="mt-4 bg-red-900/20 border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-400">
                  {parseError}
                </AlertDescription>
              </Alert>
            )}
            {dTag && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">
                        Current Article: <span className="text-white font-mono">{dTag}</span>
                      </p>
                      {versions && versions.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {versions.length} {versions.length === 1 ? 'version' : 'versions'} found
                        </p>
                      )}
                    </div>
                    {currentVersion && currentVersion.kind === 30023 && (
                      <ArticleZapButtonWrapper article={currentVersion} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Interface */}
        {dTag && (
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            {/* Left Column - Editor/Diff Viewer */}
            <div>
              {compareMode ? (
                <DiffViewer
                  oldVersion={compareMode.v1}
                  newVersion={compareMode.v2}
                  onClose={() => setCompareMode(null)}
                />
              ) : (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                  <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-800">
                    <TabsTrigger
                      value="editor"
                      className="data-[state=active]:bg-[#f0883e]"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger
                      value="versions"
                      className="data-[state=active]:bg-[#f0883e]"
                    >
                      <GitBranch className="h-4 w-4 mr-2" />
                      Versions
                    </TabsTrigger>
                    <TabsTrigger
                      value="analytics"
                      className="data-[state=active]:bg-[#f0883e]"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor">
                    <ArticleEditor
                      initialArticle={currentVersion}
                      dTag={dTag}
                      onPublish={handlePublish}
                    />
                  </TabsContent>

                  <TabsContent value="versions">
                    <VersionHistory
                      versions={versions || []}
                      currentVersionId={currentVersion?.id}
                      onSelectVersion={handleSelectVersion}
                      onCompare={handleCompare}
                    />
                  </TabsContent>

                  <TabsContent value="analytics">
                    <ArticleAnalytics
                      currentVersion={currentVersion}
                      allVersions={versions || []}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>

            {/* Right Column - Version History (Desktop) */}
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

        {/* Empty State */}
        {!dTag && (
          <Card className="border-dashed border-gray-700 bg-[#0d1117]">
            <CardContent className="py-16 px-8 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="bg-gradient-to-br from-[#f0883e] to-orange-600 p-4 rounded-2xl w-20 h-20 mx-auto flex items-center justify-center">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Welcome to Article Versions
                  </h2>
                  <p className="text-gray-400">
                    A decentralized publishing platform for long-form content with version control,
                    collaborative editing, and Lightning payments.
                  </p>
                </div>
                <div className="space-y-3 text-sm text-gray-400 text-left bg-gray-800 p-4 rounded-lg border border-gray-700">
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
                      <p className="text-xs">Work with multiple contributors and track contributions</p>
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
                <p className="text-xs text-gray-500">
                  Get started by creating a new article or loading an existing one
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16 py-8 bg-[#0d1117]">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>
            Powered by{' '}
            <a
              href="https://github.com/nostr-protocol/nips/blob/master/23.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f0883e] hover:underline"
            >
              NIP-23
            </a>{' '}
            and{' '}
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f0883e] hover:underline"
            >
              Shakespeare
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
