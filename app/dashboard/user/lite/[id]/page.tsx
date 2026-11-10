'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, FileSpreadsheet, Users, MapPin, Clock, Calendar,
  Copy, ExternalLink, Trash2, Printer,
} from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  start_time: string;
  end_time: string;
  join_code: string;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
}

interface MeetingField {
  id: string;
  label: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
}

interface Attendee {
  id: string;
  participant_name: string;
  participant_email: string | null;
  field_responses: Record<string, string>;
  latitude: number | null;
  longitude: number | null;
  submitted_at: string;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [fields, setFields] = useState<MeetingField[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);

    const [meetingRes, fieldsRes, attendeesRes] = await Promise.all([
      supabase.from('meetings').select('*').eq('id', meetingId).maybeSingle(),
      supabase.from('meeting_fields').select('*').eq('meeting_id', meetingId).order('sort_order'),
      supabase.from('meeting_attendees').select('*').eq('meeting_id', meetingId).order('submitted_at', { ascending: false }),
    ]);

    if (meetingRes.data) setMeeting(meetingRes.data as Meeting);
    if (fieldsRes.data) setFields(fieldsRes.data as MeetingField[]);
    if (attendeesRes.data) setAttendees(attendeesRes.data as Attendee[]);
    setLoading(false);
  }, [meetingId]);

  useEffect(() => {
    load();
  }, [load]);

  const copyJoinLink = () => {
    if (!meeting) return;
    const link = `${window.location.origin}/join/${meeting.join_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Join link copied!');
  };

  const exportCSV = () => {
    if (attendees.length === 0) return;

    const headers = ['#', 'Name', 'Email', ...fields.map((f) => f.label), 'Submitted At'];
    const rows = attendees.map((a, i) => {
      const time = new Date(a.submitted_at).toLocaleString();
      return [
        (i + 1).toString(),
        a.participant_name,
        a.participant_email || '',
        ...fields.map((f) => a.field_responses[f.id] || ''),
        time,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${meeting?.title.replace(/\s+/g, '-')}-${meeting?.meeting_date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteAttendee = async (id: string) => {
    const { error } = await supabase.from('meeting_attendees').delete().eq('id', id);
    if (error) toast.error('Failed to remove attendee.');
    else { toast.success('Attendee removed.'); load(); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-slate-500">Meeting not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/user/lite')}>
          Back to Meetings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 text-slate-500"
            onClick={() => router.push('/dashboard/user/lite')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Meetings
          </Button>
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          {meeting.description && (
            <p className="mt-1 text-sm text-slate-500">{meeting.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Badge variant={meeting.is_active ? 'default' : 'secondary'}>
              {meeting.is_active ? 'Active' : 'Closed'}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(meeting.meeting_date).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {meeting.start_time} — {meeting.end_time}
            </span>
            {meeting.location_label && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {meeting.location_label}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyJoinLink}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/join/${meeting.join_code}`)}>
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Open Join Page
          </Button>
        </div>
      </div>

      {/* Join code card */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
              <Users className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Share this code or link for participants to join</p>
              <code className="text-lg font-mono font-bold tracking-widest text-slate-800">
                {meeting.join_code}
              </code>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={attendees.length === 0}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={attendees.length === 0}>
              <Printer className="mr-1 h-3.5 w-3.5" />
              Print / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendees spreadsheet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-slate-400" />
            Attendance Sheet ({attendees.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attendees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No one has joined this meeting yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                Share the join code <span className="font-mono font-bold">{meeting.join_code}</span> or the link with participants.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    {fields.map((f) => (
                      <TableHead key={f.id}>{f.label}</TableHead>
                    ))}
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendees.map((a, i) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm text-slate-400">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{a.participant_name}</TableCell>
                      {fields.map((f) => (
                        <TableCell key={f.id} className="text-sm">
                          {a.field_responses[f.id] || <span className="text-slate-300">—</span>}
                        </TableCell>
                      ))}
                      <TableCell className="text-sm text-slate-500">
                        {new Date(a.submitted_at).toLocaleString([], {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteAttendee(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
