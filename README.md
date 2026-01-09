# Nostr Article Version Manager

A decentralized publishing platform for NIP-23 long-form content with version control, collaborative editing, peer review workflow, and Lightning payment integration.

![Version Manager](https://img.shields.io/badge/NIP-23-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🔄 Version Control System
- **Complete Version History**: Track all changes to your articles with full version history
- **Visual Diff Viewer**: Compare any two versions side-by-side with highlighted additions and deletions
- **One-Click Restore**: Restore any previous version of your article instantly
- **Draft & Published States**: Work on drafts (kind 30024) before publishing (kind 30023)

### 👥 Collaborative Editing
- **Multi-Author Support**: Add collaborators by their Nostr public keys
- **Custom Revenue Splits**: Set custom weight for each collaborator
- **Visual Split Preview**: See exact percentage breakdown before publishing
- **Contribution Tracking**: Track each contributor's involvement
- **Peer Review Workflow**: Comment system using NIP-22 (kind 1111) for feedback

### 💰 Lightning Integration & Revenue Splits
- **Zap Support**: Receive Lightning payments (zaps) on your articles
- **Automatic Multi-Recipient Splits**: Payments automatically divided among all collaborators
- **NWC Integration**: Full Nostr Wallet Connect (NIP-47) support for seamless payments
- **WebLN Support**: Alternative wallet connection method
- **Custom Weight System**: Define exact revenue split percentages per contributor
- **Real-time Split Preview**: See how zaps will be distributed before sending
- **Smart Payment Routing**: Each contributor receives their share directly to their lightning address

### 📊 Analytics & Engagement
- **Engagement Metrics**: Track zaps, reactions, reposts, and comments
- **Quality Scoring**: Algorithmic quality score based on engagement
- **Contributor Dashboard**: View all contributors and their impact
- **Real-time Statistics**: Live updates of article performance

### 🎨 Premium Design & Rich Media
- **Beautiful Article Preview**: Professional rendering with custom styling
- **Rich Markdown Support**: GFM tables, task lists, strikethrough, and more
- **Image Support**: JPG, PNG, GIF, WebP with CDN optimization
- **Video Playback**: Native MP4 video player with controls
- **Audio Player**: Custom audio player with seek, volume, and time display
- **Obsidian Dark Theme**: Beautiful dark UI with `#0d1117` background
- **Orange Accents**: Eye-catching `#f0883e` orange for action items
- **Responsive Layout**: Perfect on desktop, tablet, and mobile

### 📚 Article Browser
- **Browse Latest Articles**: View latest long-form content from Nostr network
- **Major Relay Support**: Pulls from Damus, Primal, Nos.lol, and more
- **Live Updates**: Auto-refreshes every 30 seconds
- **Rich Preview Cards**: See title, author, summary, and images
- **One-Click Read**: Click any article to read in full
- **Copy naddr**: Easy sharing with naddr copy button

## Technology Stack

- **React 18.x** - Modern UI library
- **TypeScript** - Type-safe development
- **TailwindCSS 3.x** - Utility-first styling
- **Nostrify** - Nostr protocol integration
- **NIP-23** - Long-form content standard
- **NIP-47** - Nostr Wallet Connect
- **NIP-57** - Lightning Zaps

## Quick Start

### 1. Create a New Article

1. Click "New Article" to generate a unique identifier
2. Enter your article title and content in Markdown format
3. Add optional metadata (summary, image, topics)
4. Click "Save Draft" to save privately

### 2. Load an Existing Article

You can load articles in two ways:

**Using d-tag (simple identifier):**
```
article-unique-id
```

**Using naddr (full article address):**
```
naddr1qqnk7ur9demk2cnj0qkhqmr4wvkk7m3dwfshxurzv4e8y7fdwp5j6dpdvam826t60ypzp56wsvk59tvtj0q6rs7ggqyngszlxz7tlptl884z7qyvycur77xsqvzqqqr4guft8h2f
```

The naddr format includes the article identifier, author pubkey, and kind, making it perfect for sharing articles with others.

### 3. Collaborate with Others

1. Add collaborators with their public keys (npub or hex format)
2. Set custom revenue split weights for each contributor
3. Preview the percentage breakdown in real-time
4. Share the article's **naddr** with your team
5. Each edit creates a new version automatically

### 4. Publish Your Article

1. Review your draft in the Preview tab
2. Click "Publish" to make it public (kind 30023)
3. Your article is now discoverable on the Nostr network
4. Copy the **naddr** to share with others
5. Track engagement in the Analytics tab

### 5. Compare Versions

1. Go to the "Versions" tab
2. Click "Compare Versions"
3. Select two versions to compare
4. View the visual diff with highlighted changes

## Architecture

### Event Structure

Published articles use NIP-23 kind 30023:

```json
{
  "kind": 30023,
  "content": "# Article Title\n\nYour markdown content...",
  "tags": [
    ["d", "unique-article-id"],
    ["title", "Article Title"],
    ["summary", "Brief description"],
    ["image", "https://example.com/image.jpg"],
    ["published_at", "1675642635"],
    ["t", "topic1"],
    ["t", "topic2"],
    ["p", "contributor1-pubkey"],
    ["contribution_weight", "contributor1-pubkey", "0.6"],
    ["p", "contributor2-pubkey"],
    ["contribution_weight", "contributor2-pubkey", "0.4"],
    ["alt", "Article: Article Title"]
  ]
}
```

### Version History

All versions share the same `d` tag identifier:

```typescript
// Query all versions of an article
const versions = await nostr.query([{
  kinds: [30023, 30024], // Published and drafts
  '#d': ['article-unique-id'],
  limit: 100
}]);

// Sort by created_at (newest first)
versions.sort((a, b) => b.created_at - a.created_at);
```

### Loading Articles with naddr

Articles can be loaded using either a plain `d` tag identifier or an `naddr` (NIP-19 addressable event identifier):

```typescript
import { nip19 } from 'nostr-tools';

// Decode naddr to get article coordinates
const decoded = nip19.decode('naddr1qqnk7ur9...');

if (decoded.type === 'naddr') {
  const { kind, pubkey, identifier } = decoded.data;

  // Query for all versions by this author
  const versions = await nostr.query([{
    kinds: [30023, 30024],
    authors: [pubkey],
    '#d': [identifier],
  }]);
}
```

The `naddr` format is recommended for sharing as it includes:
- **kind**: Event kind (30023 for articles)
- **pubkey**: Author's public key
- **identifier**: The `d` tag value
- **relays** (optional): Relay hints for finding the event

### Contribution Calculation

```typescript
// Automatically calculated based on text diffs
const weight = calculateContributionWeight(
  contributorPubkey,
  allVersions.map(v => ({
    pubkey: v.pubkey,
    content: v.content,
    created_at: v.created_at
  }))
);
```

### Revenue Distribution

When a user zaps an article:

1. Parse `contribution_weight` tags from the published article
2. Calculate each contributor's share: `zapAmount * weight`
3. Fetch lightning addresses (lud16) for each contributor
4. Use NWC or WebLN to send payments to each contributor
5. Display success/failure status for each payment

```typescript
// Example: 10,000 sat zap with 60/40 split
// Contributor 1: 10,000 * 0.6 = 6,000 sats (sent to their lud16)
// Contributor 2: 10,000 * 0.4 = 4,000 sats (sent to their lud16)
```

### Setting Custom Revenue Splits

1. In the Article Editor, click "Add Collaborator"
2. Enter the collaborator's public key (npub or hex)
3. Set their weight (any positive number)
4. Weights are automatically normalized to percentages
5. Preview shows exact split: `weight / totalWeight * 100%`

**Example weights:**
- Contributor A: weight 3 → 60% (3/5)
- Contributor B: weight 2 → 40% (2/5)
- Total weight: 5

## Custom Extensions (NIP.md)

This project extends NIP-23 with custom tags documented in `NIP.md`:

- `contribution_weight` - Track contributor percentages for revenue splits
- Workflow for collaborative editing
- Guidelines for automatic payment distribution

## File Structure

```
src/
├── components/
│   ├── ArticleEditor.tsx      # Main editor with preview
│   ├── VersionHistory.tsx     # Version list and selection
│   ├── DiffViewer.tsx         # Visual diff comparison
│   └── ArticleAnalytics.tsx   # Engagement dashboard
├── hooks/
│   ├── useArticleVersions.ts  # Fetch version history
│   ├── useArticleStats.ts     # Fetch engagement stats
│   └── ...
├── lib/
│   └── diffUtils.ts           # Diff computation algorithms
└── pages/
    └── Index.tsx              # Main application page
```

## Key Features Explained

### Diff Algorithm

The diff viewer uses a line-based diff algorithm:

1. Split old and new content into lines
2. Compare lines to find matches
3. Identify additions, deletions, and unchanged sections
4. Render with color-coded highlighting

```typescript
const diff = computeDiff(oldVersion.content, newVersion.content);
// Returns: DiffSegment[] with type: 'added' | 'removed' | 'unchanged'
```

### Quality Score

Quality score is calculated from engagement:

```typescript
const qualityScore = Math.min(100,
  (reactions.length * 2) +
  (comments.length * 3) +
  (reposts.length * 5) +
  (zaps.length * 10)
);
```

### Version Comparison

Users can compare any two versions:

1. Click "Compare Versions" button
2. Select first version
3. Select second version
4. View side-by-side diff with stats

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nostr-article-versions

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

Built with [Shakespeare](https://shakespeare.diy) - AI-powered website builder

Powered by:
- [NIP-23](https://github.com/nostr-protocol/nips/blob/master/23.md) - Long-form Content
- [NIP-47](https://github.com/nostr-protocol/nips/blob/master/47.md) - Nostr Wallet Connect
- [NIP-57](https://github.com/nostr-protocol/nips/blob/master/57.md) - Lightning Zaps
- [Nostrify](https://github.com/soapbox-pub/nostrify) - Nostr protocol library

## Support

For issues or questions:
- Open an issue on GitHub
- Contact via Nostr: `npub1...` (add your npub)

## Roadmap

- [ ] Publication scheduling (delayed broadcast)
- [ ] Encrypted draft sharing
- [ ] Advanced markdown editor with plugins
- [ ] Export to PDF/HTML
- [ ] Integration with IPFS for content permanence
- [ ] Multi-language support
- [ ] Rich media embedding (videos, audio)
- [ ] Automated backups to multiple relays

---

**Vibed with Shakespeare** - [https://shakespeare.diy](https://shakespeare.diy)
