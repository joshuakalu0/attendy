'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Plug } from 'lucide-react';

export function CoreModuleSlot() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Plug className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-700">
          Core Module
        </h3>
        <p className="mt-1 max-w-sm text-center text-sm text-slate-500">
          Your core product feature will appear here. Register it in the module
          registry to activate this slot.
        </p>
      </CardContent>
    </Card>
  );
}
