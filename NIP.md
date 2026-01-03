# NIP-XX: Article Version Manager Extensions

`draft` `optional`

This document describes extensions to NIP-23 (Long-form Content) used by the Nostr Article Version Manager for collaborative editing and revenue distribution.

## Abstract

This NIP extends NIP-23 to support collaborative article editing with automatic contribution tracking and revenue distribution through Lightning payments. It introduces a custom tag for tracking contributor weights and describes the workflow for multi-author publishing.

## Specification

### Contribution Weight Tag

The `contribution_weight` tag is used to track the contribution percentage of each collaborator on an article:

```
["contribution_weight", "<contributor-pubkey>", "<weight>"]
```

- `<contributor-pubkey>`: The hex-encoded public key of the contributor
- `<weight>`: A decimal number representing the contributor's weight (0.0 to 1.0)

### Tag Usage

When creating or updating a kind 30023 (published article) or kind 30024 (draft) event with multiple collaborators:

1. Include a `p` tag for each collaborator's public key
2. Include a corresponding `contribution_weight` tag for each collaborator
3. Ensure all contribution weights sum to approximately 1.0 (representing 100% of contributions)

### Example Event

```json
{
  "kind": 30023,
  "created_at": 1675642635,
  "content": "# Collaborative Article\n\nThis article was written by multiple contributors...",
  "tags": [
    ["d", "collaborative-article-001"],
    ["title", "A Guide to Decentralized Publishing"],
    ["published_at", "1675642635"],
    ["p", "abc123...contributor1pubkey", "wss://relay.example.com"],
    ["contribution_weight", "abc123...contributor1pubkey", "0.6"],
    ["p", "def456...contributor2pubkey", "wss://relay.example.com"],
    ["contribution_weight", "def456...contributor2pubkey", "0.3"],
    ["p", "ghi789...contributor3pubkey", "wss://relay.example.com"],
    ["contribution_weight", "ghi789...contributor3pubkey", "0.1"],
    ["alt", "Article: A Guide to Decentralized Publishing"]
  ],
  "pubkey": "...",
  "id": "...",
  "sig": "..."
}
```

## Workflow

### 1. Version History

All versions of an article share the same `d` tag identifier. Clients query relays for all events (kinds 30023 and 30024) with the same `d` tag to reconstruct the version history.

```
Filter: { kinds: [30023, 30024], "#d": ["article-identifier"] }
```

Versions are sorted by `created_at` timestamp (descending) to show the most recent version first.

### 2. Contribution Calculation

Contribution weights are calculated by:

1. Computing text diffs between consecutive versions
2. Attributing changes to the author of each version
3. Calculating each contributor's percentage based on total changes

This automatic calculation can be overridden by manually setting the `contribution_weight` tags.

### 3. Revenue Distribution

When an article receives a Lightning payment (zap):

1. Parse the `contribution_weight` tags from the latest published version
2. Calculate each contributor's share based on their weight
3. Use NWC (NIP-47) to automatically split and send payments to contributors

For example, if an article receives a 10,000 sat zap and has contribution weights of 0.6, 0.3, and 0.1:
- Contributor 1 receives 6,000 sats
- Contributor 2 receives 3,000 sats
- Contributor 3 receives 1,000 sats

## Client Implementation

### Publishing

Clients should:
1. Allow authors to add collaborators via their public keys
2. Track content changes across versions
3. Calculate contribution weights based on edit history
4. Include all required tags when publishing

### Reading

Clients should:
1. Query all versions of an article by `d` tag
2. Display the version history with timestamps and authors
3. Provide diff views between versions
4. Show contributor statistics and weights

### Monetization

Clients implementing zap distribution should:
1. Parse `contribution_weight` tags from published articles
2. Validate that weights are positive and sum to approximately 1.0
3. Use NWC or WebLN to send multiple payments in proportion to weights
4. Handle cases where a contributor's payment fails gracefully

## Privacy Considerations

- Draft articles (kind 30024) may contain sensitive information and should only be shared with intended collaborators
- Consider publishing drafts only to trusted relays or using private relays
- Contribution weights reveal the relative involvement of each collaborator

## Security Considerations

- Contribution weights are not cryptographically verified and depend on trust in the article author
- Clients should validate that contributor public keys are legitimate before sending payments
- Malicious authors could set arbitrary weights to redirect payments

## Rationale

This extension enables truly collaborative publishing on Nostr while maintaining the simplicity and interoperability of NIP-23. By using custom tags rather than creating new event kinds, these articles remain compatible with existing long-form content clients.

## References

- [NIP-23: Long-form Content](https://github.com/nostr-protocol/nips/blob/master/23.md)
- [NIP-33: Parameterized Replaceable Events](https://github.com/nostr-protocol/nips/blob/master/01.md#parameterized-replaceable-events)
- [NIP-47: Nostr Wallet Connect](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [NIP-57: Lightning Zaps](https://github.com/nostr-protocol/nips/blob/master/57.md)
