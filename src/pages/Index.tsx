import { useState, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useArticleVersions } from '@/hooks/useArticleVersions';
import { LoginArea } from '@/components/auth/LoginArea';
import { ArticleEditor } from '@/components/ArticleEditor';
import { VersionHistory } from '@/components/VersionHistory';
import { DiffViewer } from '@/components/DiffViewer';
import { ArticleAnalytics } from '@/components/ArticleAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, GitBranch, BarChart3, Sparkles } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Article Version Manager - Collaborative Long-Form Publishing',
    description: 'A decentralized publishing platform for NIP-23 long-form content with versioning, collaborative editing, peer review, and Lightning payments.',
  });

  const { user } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  // Article identifier state
  const [dTag, setDTag] = useState(searchParams.get('article') || '');
  const [inputDTag, setInputDTag] = useState(searchParams.get('article') || '');

  // Fetch article versions
  const { data: versions, isLoading } = useArticleVersions(dTag, user?.pubkey);

  // Current view state
  const [currentVersion, setCurrentVersion] = useState<NostrEvent | undefined>();
  const [compareMode, setCompareMode] = useState<{ v1: NostrEvent; v2: NostrEvent } | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'versions' | 'analytics'>('editor');

  // Update URL when article changes
  useEffect(() => {
    if (dTag) {
      setSearchParams({ article: dTag });
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

  const handleLoadArticle = () => {
    if (inputDTag.trim()) {
      setDTag(inputDTag.trim());
      setCurrentVersion(undefined);
    }
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

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0d1117]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#f0883e] to-orange-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Nostr Article Versions</h1>
                <p className="text-xs text-gray-400">Collaborative Long-Form Publishing</p>
              </div>
            </div>
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
                  Article Identifier (d-tag)
                </Label>
                <Input
                  id="article-id"
                  value={inputDTag}
                  onChange={(e) => setInputDTag(e.target.value)}
                  placeholder="article-unique-id"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLoadArticle();
                    }
                  }}
                />
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
            {dTag && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400">
                  Current Article: <span className="text-white font-mono">{dTag}</span>
                </p>
                {versions && versions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {versions.length} {versions.length === 1 ? 'version' : 'versions'} found
                  </p>
                )}
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
