import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, Users, Calendar, FileText } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';
import ReactMarkdown from 'react-markdown';

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
  const [collaborators, setCollaborators] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [isDraft, setIsDraft] = useState(true);

  // Preview state
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Load initial article data
  useEffect(() => {
    if (initialArticle) {
      const titleTag = initialArticle.tags.find(([name]) => name === 'title')?.[1];
      const summaryTag = initialArticle.tags.find(([name]) => name === 'summary')?.[1];
      const imageTag = initialArticle.tags.find(([name]) => name === 'image')?.[1];
      const publishedAtTag = initialArticle.tags.find(([name]) => name === 'published_at')?.[1];
      const topicTags = initialArticle.tags.filter(([name]) => name === 't').map(([, value]) => value);
      const collaboratorTags = initialArticle.tags.filter(([name]) => name === 'p').map(([, pubkey]) => pubkey);

      setTitle(titleTag || '');
      setSummary(summaryTag || '');
      setContent(initialArticle.content);
      setImage(imageTag || '');
      setTopics(topicTags.join(', '));
      setCollaborators(collaboratorTags.join(', '));
      setPublishedAt(publishedAtTag || '');
      setIsDraft(initialArticle.kind === 30024);
    }
  }, [initialArticle]);

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
    const collaboratorList = collaborators
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    
    for (const collaborator of collaboratorList) {
      tags.push(['p', collaborator]);
      // Equal weight for now - will be calculated based on actual contributions
      tags.push(['contribution_weight', collaborator, '1']);
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
            <div className="space-y-2">
              <Label htmlFor="collaborators" className="text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Collaborators (pubkeys, comma-separated)
              </Label>
              <Input
                id="collaborators"
                value={collaborators}
                onChange={(e) => setCollaborators(e.target.value)}
                placeholder="npub1..., npub2..."
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500">
                Add collaborators to enable automatic revenue splits from zaps
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
          </TabsContent>

          <TabsContent value="preview" className="min-h-[600px]">
            <div className="prose prose-invert max-w-none">
              {image && (
                <img
                  src={image}
                  alt={title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}
              <h1 className="text-4xl font-bold text-white mb-2">{title || 'Untitled'}</h1>
              {summary && <p className="text-xl text-gray-400 mb-6">{summary}</p>}
              {topics && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {topics
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0)
                    .map((topic) => (
                      <Badge key={topic} variant="secondary" className="bg-gray-800 text-gray-300">
                        #{topic}
                      </Badge>
                    ))}
                </div>
              )}
              <div className="text-gray-300">
                <ReactMarkdown>{content || '*No content yet*'}</ReactMarkdown>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
