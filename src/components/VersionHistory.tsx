import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, GitBranch, Eye, FileText, User } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

interface VersionHistoryProps {
  versions: NostrEvent[];
  currentVersionId?: string;
  onSelectVersion: (version: NostrEvent) => void;
  onCompare: (v1: NostrEvent, v2: NostrEvent) => void;
}

function VersionItem({
  version,
  isCurrent,
  onClick,
}: {
  version: NostrEvent;
  isCurrent: boolean;
  onClick: () => void;
}) {
  const author = useAuthor(version.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.name ?? genUserName(version.pubkey);
  const profileImage = metadata?.picture;

  const titleTag = version.tags.find(([name]) => name === 'title')?.[1];
  const isDraft = version.kind === 30024;

  const formattedDate = new Date(version.created_at * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const contentPreview = version.content.slice(0, 120) + (version.content.length > 120 ? '...' : '');

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isCurrent
          ? 'bg-[#f0883e]/10 border-[#f0883e]'
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          {profileImage && <AvatarImage src={profileImage} alt={displayName} />}
          <AvatarFallback className="bg-gray-700 text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white text-sm">{displayName}</span>
            {isDraft && (
              <Badge variant="secondary" className="text-xs bg-gray-700">
                Draft
              </Badge>
            )}
            {isCurrent && (
              <Badge className="text-xs bg-[#f0883e]">Current</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Clock className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>

          {titleTag && (
            <p className="text-sm font-medium text-white mb-1 truncate">{titleTag}</p>
          )}

          <p className="text-xs text-gray-500 line-clamp-2">{contentPreview}</p>
        </div>

        {isCurrent && (
          <Eye className="h-5 w-5 text-[#f0883e] flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

export function VersionHistory({
  versions,
  currentVersionId,
  onSelectVersion,
  onCompare,
}: VersionHistoryProps) {
  const [selectedForCompare, setSelectedForCompare] = useState<NostrEvent[]>([]);

  const handleVersionClick = (version: NostrEvent) => {
    // If in compare mode, add to selection
    if (selectedForCompare.length > 0 && selectedForCompare.length < 2) {
      const newSelection = [...selectedForCompare, version];
      setSelectedForCompare(newSelection);

      if (newSelection.length === 2) {
        // Trigger comparison
        onCompare(newSelection[0], newSelection[1]);
        setSelectedForCompare([]);
      }
    } else {
      // Normal selection
      onSelectVersion(version);
    }
  };

  const startCompareMode = () => {
    setSelectedForCompare([]);
  };

  const cancelCompareMode = () => {
    setSelectedForCompare([]);
  };

  const isInCompareMode = selectedForCompare.length > 0;

  return (
    <Card className="bg-[#0d1117] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[#f0883e]" />
            Version History
          </CardTitle>
          <Badge variant="secondary" className="bg-gray-800 text-gray-300">
            {versions.length} {versions.length === 1 ? 'version' : 'versions'}
          </Badge>
        </div>
        {!isInCompareMode && versions.length >= 2 && (
          <Button
            onClick={startCompareMode}
            variant="outline"
            size="sm"
            className="mt-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Compare Versions
          </Button>
        )}
        {isInCompareMode && (
          <div className="mt-3 p-3 bg-[#f0883e]/10 border border-[#f0883e] rounded-lg">
            <p className="text-sm text-white mb-2">
              Select {2 - selectedForCompare.length} more version(s) to compare
            </p>
            <Button
              onClick={cancelCompareMode}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No versions found</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {versions.map((version) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isCurrent={version.id === currentVersionId}
                  onClick={() => handleVersionClick(version)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
