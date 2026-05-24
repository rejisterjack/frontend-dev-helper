import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { isFeatureEnabled, getRequiredTier } from '@/lib/feature-flags';
import { useSubscriptionStore } from '@/stores/use-subscription-store';
import type { FeatureFlag } from '@/lib/types';

interface PremiumGateProps {
  featureId: FeatureFlag;
  children: React.ReactNode;
}

export function PremiumGate({ featureId, children }: PremiumGateProps) {
  const tier = useSubscriptionStore((s) => s.tier);
  const setTier = useSubscriptionStore((s) => s.setTier);

  if (isFeatureEnabled(featureId, tier)) {
    return <>{children}</>;
  }

  const required = getRequiredTier(featureId);

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none opacity-60">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Card className="w-64">
          <CardHeader className="p-3 pb-1 text-center">
            <Lock className="size-6 mx-auto mb-2 text-muted-foreground" />
            <CardTitle className="text-sm">Pro Feature</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              {required === 'pro' ? 'Upgrade to Pro' : 'Upgrade to Team'} to unlock this feature
            </p>
            <Badge variant="secondary" className="text-[0.6rem] mb-2">
              {required.charAt(0).toUpperCase() + required.slice(1)} required
            </Badge>
            <Button size="sm" className="w-full text-xs" onClick={() => setTier('pro')}>
              Upgrade
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
