import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWallet } from '@/hooks/useWallet';
import { useZaps } from '@/hooks/useZaps';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

interface Contributor {
  pubkey: string;
  weight: number;
  lud16?: string;
}

interface ArticleZapButtonProps {
  article: NostrEvent;
  contributors: Contributor[];
  className?: string;
}

export function ArticleZapButton({ article, contributors, className = '' }: ArticleZapButtonProps) {
  const { user } = useCurrentUser();
  const { webln, activeNWC } = useWallet();
  const { toast } = useToast();
  const { totalSats, isLoading: statsLoading } = useZaps(article, webln, activeNWC);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('1000');
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<{ pubkey: string; success: boolean; error?: string }[]>([]);

  if (!user) {
    return null;
  }

  // Calculate total weight
  const totalWeight = contributors.reduce((sum, c) => sum + c.weight, 0);

  const handleZap = async () => {
    if (!activeNWC && !webln) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect a wallet via NWC or WebLN to send zaps',
        variant: 'destructive',
      });
      return;
    }

    const sats = parseInt(amount, 10);
    if (isNaN(sats) || sats <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount in sats',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    setResults([]);

    try {
      const splitResults: { pubkey: string; success: boolean; error?: string }[] = [];

      // Split payment to each contributor
      for (const contributor of contributors) {
        if (!contributor.lud16) {
          splitResults.push({
            pubkey: contributor.pubkey,
            success: false,
            error: 'No lightning address',
          });
          continue;
        }

        // Calculate this contributor's share
        const contributorSats = Math.floor(sats * (contributor.weight / totalWeight));
        if (contributorSats < 1) {
          splitResults.push({
            pubkey: contributor.pubkey,
            success: false,
            error: 'Share too small (< 1 sat)',
          });
          continue;
        }

        try {
          // Use NWC to send payment
          if (activeNWC) {
            // Create zap request for this contributor
            const zapRequest = {
              kind: 9734,
              content: comment,
              tags: [
                ['relays', 'wss://relay.damus.io', 'wss://nos.lol'],
                ['amount', (contributorSats * 1000).toString()], // Convert to msats
                ['p', contributor.pubkey],
                ['e', article.id],
              ],
              created_at: Math.floor(Date.now() / 1000),
            };

            // Sign with current user's signer
            const signedZapRequest = await user.signer.signEvent(zapRequest);

            // Get invoice from LNURL endpoint
            const lnurlResponse = await fetch(
              `https://${contributor.lud16.split('@')[1]}/.well-known/lnurlp/${contributor.lud16.split('@')[0]}`
            );
            const lnurlData = await lnurlResponse.json();

            if (!lnurlData.callback) {
              throw new Error('Invalid LNURL response');
            }

            // Request invoice with zap request
            const invoiceResponse = await fetch(
              `${lnurlData.callback}?amount=${contributorSats * 1000}&nostr=${encodeURIComponent(JSON.stringify(signedZapRequest))}`
            );
            const invoiceData = await invoiceResponse.json();

            if (!invoiceData.pr) {
              throw new Error('Failed to get invoice');
            }

            // Pay invoice via NWC
            await activeNWC.payInvoice(invoiceData.pr);

            splitResults.push({
              pubkey: contributor.pubkey,
              success: true,
            });
          } else if (webln) {
            // Use WebLN (similar flow but with webln.sendPayment)
            const lnurlResponse = await fetch(
              `https://${contributor.lud16.split('@')[1]}/.well-known/lnurlp/${contributor.lud16.split('@')[0]}`
            );
            const lnurlData = await lnurlResponse.json();
            const invoiceResponse = await fetch(
              `${lnurlData.callback}?amount=${contributorSats * 1000}`
            );
            const invoiceData = await invoiceResponse.json();

            if (invoiceData.pr) {
              await webln.sendPayment(invoiceData.pr);
              splitResults.push({
                pubkey: contributor.pubkey,
                success: true,
              });
            } else {
              throw new Error('Failed to get invoice');
            }
          }
        } catch (error) {
          splitResults.push({
            pubkey: contributor.pubkey,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      setResults(splitResults);

      const successCount = splitResults.filter((r) => r.success).length;
      if (successCount === splitResults.length) {
        toast({
          title: 'Zap Sent!',
          description: `Successfully sent ${sats} sats to ${successCount} contributor${successCount > 1 ? 's' : ''}`,
        });
      } else if (successCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Sent to ${successCount} of ${splitResults.length} contributors`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Zap Failed',
          description: 'Failed to send to any contributors',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send zap',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`bg-[#f0883e] hover:bg-[#d97735] text-white ${className}`}>
          <Zap className="h-4 w-4 mr-2" />
          Zap Article
          {totalSats > 0 && (
            <Badge variant="secondary" className="ml-2 bg-gray-800 text-gray-300">
              {statsLoading ? '...' : totalSats.toLocaleString()}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d1117] border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5 text-[#f0883e]" />
            Zap Article with Revenue Split
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Your zap will be automatically split among {contributors.length} contributor
            {contributors.length > 1 ? 's' : ''} based on their contribution weights
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">
              Amount (sats)
            </Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              disabled={isSending}
            />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-white">
              Comment (optional)
            </Label>
            <Input
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Great article!"
              className="bg-gray-800 border-gray-700 text-white"
              disabled={isSending}
            />
          </div>

          {/* Split Preview */}
          <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#f0883e]" />
              Split Preview
            </p>
            <div className="space-y-2">
              {contributors.map((contributor, i) => {
                const sats = parseInt(amount, 10);
                const contributorSats = !isNaN(sats) && totalWeight > 0
                  ? Math.floor(sats * (contributor.weight / totalWeight))
                  : 0;
                const percentage = totalWeight > 0 ? (contributor.weight / totalWeight) * 100 : 0;

                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-mono truncate flex-1 mr-2">
                      {contributor.pubkey.slice(0, 16)}...
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                        {percentage.toFixed(1)}%
                      </Badge>
                      <Badge className="bg-[#f0883e] text-white">
                        {contributorSats} sats
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <Alert className={results.every((r) => r.success) ? 'bg-green-900/20 border-green-500/30' : 'bg-yellow-900/20 border-yellow-500/30'}>
              {results.every((r) => r.success) ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <AlertDescription>
                <p className="font-medium mb-2">Payment Results:</p>
                <div className="space-y-1 text-xs">
                  {results.map((result, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span className="font-mono">{result.pubkey.slice(0, 16)}...</span>
                      {!result.success && result.error && (
                        <span className="text-red-400">- {result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Wallet Status */}
          {!activeNWC && !webln && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                No wallet connected. Please connect via NWC or WebLN.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Button */}
          <Button
            onClick={handleZap}
            disabled={isSending || !activeNWC && !webln}
            className="w-full bg-[#f0883e] hover:bg-[#d97735] text-white"
          >
            {isSending ? (
              <>Sending Zap Splits...</>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Send {amount} sats
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
