import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompare, Plus, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { computeDiff, getDiffStats } from '@/lib/diffUtils';
import type { NostrEvent } from '@nostrify/nostrify';
import type { DiffSegment } from '@/lib/diffUtils';

interface DiffViewerProps {
  oldVersion: NostrEvent;
  newVersion: NostrEvent;
  onClose?: () => void;
}

function DiffLine({ segment }: { segment: DiffSegment }) {
  const lines = segment.value.split('\n').filter((line) => line.length > 0);

  if (segment.type === 'added') {
    return (
      <>
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2 bg-green-900/20 border-l-2 border-green-500 pl-3 py-1">
            <Plus className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-green-400 font-mono text-sm flex-1">{line}</span>
          </div>
        ))}
      </>
    );
  }

  if (segment.type === 'removed') {
    return (
      <>
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2 bg-red-900/20 border-l-2 border-red-500 pl-3 py-1">
            <Minus className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-red-400 font-mono text-sm flex-1 line-through">{line}</span>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="flex items-start gap-2 pl-8 py-1">
          <span className="text-gray-400 font-mono text-sm flex-1">{line}</span>
        </div>
      ))}
    </>
  );
}

export function DiffViewer({ oldVersion, newVersion, onClose }: DiffViewerProps) {
  const diff = useMemo(() => {
    return computeDiff(oldVersion.content, newVersion.content);
  }, [oldVersion.content, newVersion.content]);

  const stats = useMemo(() => {
    return getDiffStats(diff);
  }, [diff]);

  const oldTitle = oldVersion.tags.find(([name]) => name === 'title')?.[1] || 'Untitled';
  const newTitle = newVersion.tags.find(([name]) => name === 'title')?.[1] || 'Untitled';

  const oldDate = new Date(oldVersion.created_at * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const newDate = new Date(newVersion.created_at * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const totalChanges = stats.added + stats.removed;
  const changePercentage = totalChanges > 0 
    ? Math.round((totalChanges / (stats.added + stats.removed + stats.unchanged)) * 100)
    : 0;

  return (
    <Card className="bg-[#0d1117] border-gray-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl text-white flex items-center gap-2 mb-2">
              <GitCompare className="h-6 w-6 text-[#f0883e]" />
              Version Comparison
            </CardTitle>
            <CardDescription className="text-gray-400">
              Comparing changes between two versions
            </CardDescription>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-xs font-medium text-gray-400">OLD VERSION</span>
            </div>
            <p className="font-medium text-white text-sm mb-1">{oldTitle}</p>
            <p className="text-xs text-gray-500">{oldDate}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs font-medium text-gray-400">NEW VERSION</span>
            </div>
            <p className="font-medium text-white text-sm mb-1">{newTitle}</p>
            <p className="text-xs text-gray-500">{newDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Badge className="bg-green-900/20 text-green-400 border border-green-500/30">
            <Plus className="h-3 w-3 mr-1" />
            {stats.added} lines added
          </Badge>
          <Badge className="bg-red-900/20 text-red-400 border border-red-500/30">
            <Minus className="h-3 w-3 mr-1" />
            {stats.removed} lines removed
          </Badge>
          <Badge variant="secondary" className="bg-gray-800 text-gray-300">
            {changePercentage}% changed
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full rounded-lg border border-gray-700 bg-gray-900">
          <div className="p-4 space-y-0.5">
            {diff.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No differences found</p>
              </div>
            ) : (
              diff.map((segment, index) => (
                <DiffLine key={index} segment={segment} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
