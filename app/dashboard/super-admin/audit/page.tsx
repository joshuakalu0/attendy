'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollText, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  actor_email: string | null;
  resource_type: string | null;
  enterprise_id: string | null;
  created_at: string;
}

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('id, action, actor_email, resource_type, enterprise_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    const { data } = await query;
    if (data) setLogs(data);
    setLoading(false);
  }, [actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = logs.filter(
    (l) =>
      !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.actor_email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">All activity across the platform</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by action or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="employee.invited">Employee Invited</SelectItem>
                <SelectItem value="employee.removed">Employee Removed</SelectItem>
                <SelectItem value="role.changed">Role Changed</SelectItem>
                <SelectItem value="billing.updated">Billing Updated</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No audit entries found.</div>
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
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell className="text-sm text-slate-600">{log.actor_email || 'System'}</TableCell>
                    <TableCell className="text-sm text-slate-500">{log.resource_type || '—'}</TableCell>
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
