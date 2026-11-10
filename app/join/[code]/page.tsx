'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { AuthShell } from '@/components/marketing/auth-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CalendarCheck, Clock, Calendar, MapPin, CheckCircle2, AlertCircle, Loader2,
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
  location_label: string | null;
}

interface MeetingField {
  id: string;
  label: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
}

export default function JoinMeetingPage() {
  const params = useParams();
  const code = params.code as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [fields, setFields] = useState<MeetingField[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);

    const { data: m } = await supabase
      .from('meetings')
      .select('*')
      .eq('join_code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (m) {
      setMeeting(m as Meeting);
      const { data: f } = await supabase
        .from('meeting_fields')
        .select('*')
        .eq('meeting_id', m.id)
        .order('sort_order');
      if (f) setFields(f as MeetingField[]);
    }
    setLoading(false);
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResponseChange = (fieldId: string, value: string) => {
    setResponses({ ...responses, [fieldId]: value });
  };

  const handleSubmit = async () => {
    if (!meeting) return;

    // Validate required fields
    for (const f of fields) {
      if (f.is_required && !responses[f.id]?.trim()) {
        toast.error(`Please fill in: ${f.label}`);
        return;
      }
    }

    setSubmitting(true);

    // Try to get location (optional, non-blocking)
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 60000,
        });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // Location is optional — continue without it
    }

    // Find name field
    const nameField = fields.find((f) => f.label.toLowerCase() === 'name');
    const participantName = nameField ? responses[nameField.id] : responses[fields[0]?.id] || 'Participant';

    const { error } = await supabase.from('meeting_attendees').insert({
      meeting_id: meeting.id,
      participant_name: participantName,
      participant_email: fields.find((f) => f.field_type === 'email') ? responses[fields.find((f) => f.field_type === 'email')!.id] : null,
      field_responses: responses,
      latitude: lat,
      longitude: lng,
    });

    if (error) {
      toast.error('Failed to submit attendance. Please try again.');
      setSubmitting(false);
    } else {
      setSubmitted(true);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <AuthShell title="Meeting check-in">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-lg font-semibold">Meeting Not Found</p>
            <p className="mt-1 text-sm text-slate-600 text-center">
              This meeting code is invalid or the meeting has been closed.
            </p>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  if (submitted) {
    return (
      <AuthShell title="Attendance recorded">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-8 w-8 text-green-700" aria-hidden="true" />
            </div>
            <p className="mt-3 text-lg font-semibold">Attendance Recorded</p>
            <p className="mt-1 text-sm text-slate-600 text-center">
              Your attendance for <span className="font-medium">{meeting.title}</span> has been submitted successfully.
            </p>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={meeting.title} subtitle="Attendance check-in" width="lg">
      <div>
        {/* Meeting info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{meeting.title}</CardTitle>
                <p className="text-xs text-slate-500">Attendance Check-in</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {meeting.description && (
              <p className="text-sm text-slate-600">{meeting.description}</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(meeting.meeting_date).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {meeting.start_time} — {meeting.end_time}
              </span>
              {meeting.location_label && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {meeting.location_label}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Check In</CardTitle>
            <p className="text-xs text-slate-500">
              Fill in the details below to record your attendance.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="text-sm">
                  {field.label}
                  {field.is_required && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id={field.id}
                  type={field.field_type === 'email' ? 'email' : field.field_type === 'number' ? 'tel' : 'text'}
                  value={responses[field.id] || ''}
                  onChange={(e) => handleResponseChange(field.id, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              </div>
            ))}

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Attendance
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-600">
          No account needed to check in. Your location may be recorded for verification.
        </p>
      </div>
    </AuthShell>
  );
}
