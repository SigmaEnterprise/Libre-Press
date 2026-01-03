/**
 * Utilities for computing text differences between article versions
 */

export interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

/**
 * Compute a simple diff between two strings using a basic algorithm
 * Returns an array of segments indicating what was added, removed, or unchanged
 */
export function computeDiff(oldText: string, newText: string): DiffSegment[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const result: DiffSegment[] = [];
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      // Only new lines remain
      result.push({
        type: 'added',
        value: newLines.slice(j).join('\n'),
      });
      break;
    } else if (j >= newLines.length) {
      // Only old lines remain
      result.push({
        type: 'removed',
        value: oldLines.slice(i).join('\n'),
      });
      break;
    } else if (oldLines[i] === newLines[j]) {
      // Lines match
      result.push({
        type: 'unchanged',
        value: oldLines[i] + '\n',
      });
      i++;
      j++;
    } else {
      // Lines differ - simple heuristic: check if old line exists later in new
      const oldInNew = newLines.indexOf(oldLines[i], j);
      const newInOld = oldLines.indexOf(newLines[j], i);

      if (oldInNew !== -1 && (newInOld === -1 || oldInNew - j < newInOld - i)) {
        // Old line exists later in new - treat current new lines as additions
        const addedLines = newLines.slice(j, oldInNew);
        result.push({
          type: 'added',
          value: addedLines.join('\n') + '\n',
        });
        j = oldInNew;
      } else if (newInOld !== -1) {
        // New line exists later in old - treat current old lines as removals
        const removedLines = oldLines.slice(i, newInOld);
        result.push({
          type: 'removed',
          value: removedLines.join('\n') + '\n',
        });
        i = newInOld;
      } else {
        // No match found - treat as replacement
        result.push({
          type: 'removed',
          value: oldLines[i] + '\n',
        });
        result.push({
          type: 'added',
          value: newLines[j] + '\n',
        });
        i++;
        j++;
      }
    }
  }

  return result;
}

/**
 * Calculate diff statistics
 */
export function getDiffStats(segments: DiffSegment[]) {
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const segment of segments) {
    const lineCount = segment.value.split('\n').filter((line) => line.length > 0).length;
    if (segment.type === 'added') {
      added += lineCount;
    } else if (segment.type === 'removed') {
      removed += lineCount;
    } else {
      unchanged += lineCount;
    }
  }

  return { added, removed, unchanged };
}

/**
 * Calculate contribution weight for a collaborator based on their edits
 */
export function calculateContributionWeight(
  authorPubkey: string,
  versions: Array<{ pubkey: string; content: string; created_at: number }>
): number {
  let totalChanges = 0;
  let authorChanges = 0;

  for (let i = 1; i < versions.length; i++) {
    const oldContent = versions[i].content;
    const newContent = versions[i - 1].content;
    const diff = computeDiff(oldContent, newContent);
    const stats = getDiffStats(diff);
    const changes = stats.added + stats.removed;

    totalChanges += changes;

    if (versions[i - 1].pubkey === authorPubkey) {
      authorChanges += changes;
    }
  }

  if (totalChanges === 0) return 0;
  return authorChanges / totalChanges;
}
