'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollText } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  actor_email: string | null;
  resource_type: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export default function EnterpriseAuditPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('id, action, actor_email, resource_type, details, created_at')
      .eq('enterprise_id', enterpriseId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setLogs(data);
    setLoading(false);
  }, [enterpriseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!can('audit.view')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">Recent activity in your enterprise</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScrollText className="h-5 w-5 text-slate-400" />
            Activity History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No audit entries yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {log.actor_email || 'System'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {log.resource_type || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
