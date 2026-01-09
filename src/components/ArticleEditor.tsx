import { useState, useEffect } from 'react';
import { nip19 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Eye, Users, Calendar, FileText, Share2, Copy, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';
import { ArticlePreview } from '@/components/ArticlePreview';

interface ArticleEditorProps {
  initialArticle?: NostrEvent;
  dTag: string;
  onPublish?: (event: NostrEvent) => void;
}

export function ArticleEditor({ initialArticle, dTag, onPublish }: ArticleEditorProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [topics, setTopics] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [isDraft, setIsDraft] = useState(true);

  // Collaborator state - array of { pubkey, weight }
  interface Collaborator {
    pubkey: string;
    weight: number;
  }
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Preview state
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Share state
  const [naddr, setNaddr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load initial article data
  useEffect(() => {
    if (initialArticle) {
      const titleTag = initialArticle.tags.find(([name]) => name === 'title')?.[1];
      const summaryTag = initialArticle.tags.find(([name]) => name === 'summary')?.[1];
      const imageTag = initialArticle.tags.find(([name]) => name === 'image')?.[1];
      const publishedAtTag = initialArticle.tags.find(([name]) => name === 'published_at')?.[1];
      const topicTags = initialArticle.tags.filter(([name]) => name === 't').map(([, value]) => value);

      // Load collaborators with weights
      const collaboratorTags = initialArticle.tags.filter(([name]) => name === 'p').map(([, pubkey]) => pubkey);
      const loadedCollaborators: Collaborator[] = [];

      for (const pubkey of collaboratorTags) {
        const weightTag = initialArticle.tags.find(
          ([name, p]) => name === 'contribution_weight' && p === pubkey
        );
        const weight = weightTag ? parseFloat(weightTag[2]) : 1;
        loadedCollaborators.push({ pubkey, weight });
      }

      setTitle(titleTag || '');
      setSummary(summaryTag || '');
      setContent(initialArticle.content);
      setImage(imageTag || '');
      setTopics(topicTags.join(', '));
      setCollaborators(loadedCollaborators);
      setPublishedAt(publishedAtTag || '');
      setIsDraft(initialArticle.kind === 30024);

      // Generate naddr for published articles
      if (initialArticle.kind === 30023) {
        generateNaddr(initialArticle);
      }
    }
  }, [initialArticle]);

  const generateNaddr = (event: NostrEvent) => {
    try {
      const naddrString = nip19.naddrEncode({
        kind: event.kind,
        pubkey: event.pubkey,
        identifier: dTag,
      });
      setNaddr(naddrString);
    } catch (error) {
      console.error('Failed to generate naddr:', error);
    }
  };

  const handleCopyNaddr = async () => {
    if (naddr) {
      try {
        await navigator.clipboard.writeText(naddr);
        setCopied(true);
        toast({
          title: 'Copied!',
          description: 'Article address copied to clipboard',
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast({
          title: 'Failed to copy',
          description: 'Please copy the address manually',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSave = (asDraft: boolean) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to save articles',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your article',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Content Required',
        description: 'Please enter content for your article',
        variant: 'destructive',
      });
      return;
    }

    // Build tags array
    const tags: string[][] = [
      ['d', dTag],
      ['title', title],
    ];

    if (summary.trim()) {
      tags.push(['summary', summary]);
    }

    if (image.trim()) {
      tags.push(['image', image]);
    }

    // Add topic tags
    const topicList = topics
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    for (const topic of topicList) {
      tags.push(['t', topic]);
    }

    // Add collaborator tags with contribution weight
    // Normalize weights to sum to 1.0
    const totalWeight = collaborators.reduce((sum, c) => sum + c.weight, 0);
    const normalizedCollaborators = totalWeight > 0
      ? collaborators.map((c) => ({ ...c, weight: c.weight / totalWeight }))
      : collaborators;

    for (const collaborator of normalizedCollaborators) {
      tags.push(['p', collaborator.pubkey]);
      tags.push(['contribution_weight', collaborator.pubkey, collaborator.weight.toFixed(4)]);
    }

    // Add published_at tag for first publication
    if (!asDraft && !publishedAt) {
      const now = Math.floor(Date.now() / 1000).toString();
      tags.push(['published_at', now]);
      setPublishedAt(now);
    } else if (publishedAt) {
      tags.push(['published_at', publishedAt]);
    }

    // Add NIP-31 alt tag for accessibility
    tags.push(['alt', `Article: ${title}`]);

    createEvent(
      {
        kind: asDraft ? 30024 : 30023,
        content,
        tags,
      },
      {
        onSuccess: (event) => {
          toast({
            title: asDraft ? 'Draft Saved' : 'Article Published',
            description: asDraft
              ? 'Your draft has been saved successfully'
              : 'Your article has been published successfully',
          });
          setIsDraft(asDraft);

          // Generate naddr for published articles
          if (!asDraft) {
            generateNaddr(event);
          }

          if (onPublish) {
            onPublish(event);
          }
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: `Failed to ${asDraft ? 'save draft' : 'publish article'}: ${error.message}`,
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Please log in to create or edit articles.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0d1117] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#f0883e]" />
              {initialArticle ? 'Edit Article' : 'New Article'}
            </CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              {isDraft ? 'Draft - Not published' : 'Published article'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isDraft ? 'secondary' : 'default'} className="bg-[#f0883e] text-white">
              {isDraft ? 'Draft' : 'Published'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-800">
            <TabsTrigger value="edit" className="data-[state=active]:bg-[#f0883e]">
              <FileText className="h-4 w-4 mr-2" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-[#f0883e]">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white">
                Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary" className="text-white">
                Summary
              </Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief summary of your article"
                rows={2}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-white">
                Content (Markdown) *
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article in Markdown format..."
                rows={16}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 font-mono text-sm"
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="image" className="text-white">
                Header Image URL
              </Label>
              <Input
                id="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <Label htmlFor="topics" className="text-white flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Topics (comma-separated)
              </Label>
              <Input
                id="topics"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="nostr, decentralization, web3"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Collaborators */}
            <div className="space-y-3">
              <Label className="text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Collaborators & Revenue Splits
              </Label>

              {collaborators.map((collab, index) => (
                <div key={index} className="grid grid-cols-[1fr_120px_auto] gap-2 items-start">
                  <div>
                    <Input
                      value={collab.pubkey}
                      onChange={(e) => {
                        const updated = [...collaborators];
                        updated[index].pubkey = e.target.value;
                        setCollaborators(updated);
                      }}
                      placeholder="npub1... or hex pubkey"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={collab.weight}
                      onChange={(e) => {
                        const updated = [...collaborators];
                        updated[index].weight = Math.max(0, parseFloat(e.target.value) || 0);
                        setCollaborators(updated);
                      }}
                      placeholder="Weight"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = collaborators.filter((_, i) => i !== index);
                      setCollaborators(updated);
                    }}
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCollaborators([...collaborators, { pubkey: '', weight: 1 }]);
                }}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Add Collaborator
              </Button>

              <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-2">
                  Revenue Split Preview:
                </p>
                {collaborators.length > 0 ? (
                  <div className="space-y-1">
                    {(() => {
                      const total = collaborators.reduce((sum, c) => sum + c.weight, 0);
                      return collaborators.map((c, i) => {
                        const percentage = total > 0 ? (c.weight / total) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 font-mono truncate flex-1 mr-2">
                              {c.pubkey || 'Empty'}
                            </span>
                            <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                              {percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No collaborators added yet</p>
                )}
              </div>

              <p className="text-xs text-gray-500">
                Weights determine automatic revenue splits from zaps. They will be normalized to percentages.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                onClick={() => handleSave(true)}
                disabled={isPending}
                variant="outline"
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSave(false)}
                disabled={isPending}
                className="bg-[#f0883e] hover:bg-[#d97735] text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isDraft ? 'Publish' : 'Update'}
              </Button>
            </div>

            {/* Share Section */}
            {naddr && !isDraft && (
              <Alert className="mt-6 bg-gray-800 border-gray-700">
                <Share2 className="h-4 w-4 text-[#f0883e]" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="text-sm text-white font-medium">
                      Share this article
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={naddr}
                        readOnly
                        className="bg-gray-900 border-gray-700 text-white font-mono text-xs"
                      />
                      <Button
                        onClick={handleCopyNaddr}
                        size="sm"
                        className="bg-[#f0883e] hover:bg-[#d97735] text-white flex-shrink-0"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Use this naddr to share your article with others. They can paste it into the Article Manager to load all versions.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="preview" className="min-h-[600px]">
            <ArticlePreview
              title={title}
              summary={summary}
              content={content}
              image={image}
              topics={topics
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t.length > 0)}
              publishedAt={publishedAt}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
