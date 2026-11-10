'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  CalendarCheck, Plus, Trash2, Users, MapPin, Copy, ExternalLink,
  GripVertical, X, Clock, Calendar, Crown,
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
  is_pro: boolean;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  attendee_count?: number;
}

interface MeetingField {
  id: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: string[];
  sort_order: number;
}

const FREE_MEETING_LIMIT = 5;

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [captureLocation, setCaptureLocation] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [fields, setFields] = useState<MeetingField[]>([
    { id: '', label: 'Name', field_type: 'text', is_required: true, options: [], sort_order: 0 },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.id) { setLoading(false); return; }

    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (data) {
      // Get attendee counts
      const meetingIds = data.map((m) => m.id);
      let countsMap: Record<string, number> = {};
      if (meetingIds.length > 0) {
        const { data: counts } = await supabase
          .from('meeting_attendees')
          .select('meeting_id')
          .in('meeting_id', meetingIds);
        if (counts) {
          countsMap = counts.reduce((acc, row) => {
            acc[row.meeting_id] = (acc[row.meeting_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }
      setMeetings(data.map((m) => ({
        ...m,
        attendee_count: countsMap[m.id] || 0,
      })) as Meeting[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setMeetingDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('17:00');
    setCaptureLocation(false);
    setLocationLabel('');
    setFields([{ id: '', label: 'Name', field_type: 'text', is_required: true, options: [], sort_order: 0 }]);
  };

  const activeMeetingCount = meetings.filter((m) => m.is_active).length;
  const hasReachedFreeLimit = activeMeetingCount >= FREE_MEETING_LIMIT;

  const handleAddField = () => {
    setFields([...fields, {
      id: '',
      label: '',
      field_type: 'text',
      is_required: true,
      options: [],
      sort_order: fields.length,
    }]);
  };

  const handleRemoveField = (index: number) => {
    if (fields.length === 1) return;
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof MeetingField, value: string | boolean | string[]) => {
    setFields(fields.map((f, i) => i === index ? { ...f, [key]: value } : f));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a meeting title.');
      return;
    }
    if (hasReachedFreeLimit) {
      toast.error(`Free limit reached (${FREE_MEETING_LIMIT} meetings). Upgrade to Pro for unlimited meetings.`);
      return;
    }

    const validFields = fields.filter((f) => f.label.trim());
    if (validFields.length === 0) {
      toast.error('At least one field is required for participants to fill.');
      return;
    }

    setSubmitting(true);

    try {
      let lat: number | null = null;
      let lng: number | null = null;

      if (captureLocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) { setSubmitting(false); return; }

      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          user_id: user.user.id,
          title: title.trim(),
          description: description.trim() || null,
          meeting_date: meetingDate,
          start_time: startTime,
          end_time: endTime,
          latitude: lat,
          longitude: lng,
          location_label: locationLabel.trim() || null,
        })
        .select()
        .single();

      if (meetingError || !meeting) {
        toast.error('Failed to create meeting.');
        setSubmitting(false);
        return;
      }

      // Insert custom fields
      const fieldInserts = validFields.map((f, i) => ({
        meeting_id: meeting.id,
        label: f.label.trim(),
        field_type: f.field_type,
        is_required: f.is_required,
        options: f.field_type === 'select' ? f.options : [],
        sort_order: i,
      }));

      const { error: fieldsError } = await supabase
        .from('meeting_fields')
        .insert(fieldInserts);

      if (fieldsError) {
        toast.error('Meeting created but fields failed to save.');
      } else {
        toast.success('Meeting created successfully!');
      }

      resetForm();
      setCreateOpen(false);
      load();
    } catch {
      toast.error('Could not get your location. Please enable location permissions or disable location capture.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) toast.error('Failed to delete meeting.');
    else { toast.success('Meeting deleted.'); load(); }
  };

  const handleToggleActive = async (meeting: Meeting) => {
    const { error } = await supabase
      .from('meetings')
      .update({ is_active: !meeting.is_active })
      .eq('id', meeting.id);
    if (error) toast.error('Failed to update meeting.');
    else load();
  };

  const copyJoinLink = (code: string) => {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Join link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Meetings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create single attendance sheets — share a link or code for participants to check in
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={hasReachedFreeLimit}>
          <Plus className="mr-2 h-4 w-4" />
          New Meeting
        </Button>
      </div>

      {/* Free tier banner */}
      <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{activeMeetingCount}/{FREE_MEETING_LIMIT}</span> active meetings used on free plan
          </p>
        </div>
        {hasReachedFreeLimit && (
          <Button size="sm" variant="default" onClick={() => router.push('/dashboard/user/billing')}>
            <Crown className="mr-1 h-3 w-3" />
            Upgrade to Pro
          </Button>
        )}
      </div>

      {/* Meetings grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarCheck className="h-12 w-12 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No meetings yet. Create one to start taking attendance.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meetings.map((m) => (
            <Card key={m.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{m.title}</CardTitle>
                    {m.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{m.description}</p>
                    )}
                  </div>
                  <Badge variant={m.is_active ? 'default' : 'secondary'}>
                    {m.is_active ? 'Active' : 'Closed'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(m.meeting_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    {m.start_time} — {m.end_time}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    {m.attendee_count || 0} attendees
                  </div>
                  {m.location_label && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {m.location_label}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <code className="flex-1 text-sm font-mono font-bold tracking-wider text-slate-700">
                    {m.join_code}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyJoinLink(m.join_code)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => router.push(`/join/${m.join_code}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={() => handleToggleActive(m)}
                    />
                    <span className="text-xs text-slate-500">
                      {m.is_active ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/user/lite/${m.id}`)}
                    >
                      View Sheet
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Meeting Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Attendance Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Meeting Title</Label>
              <Input
                id="meeting-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CSC 101 — Week 7 Lecture"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-desc">Description (optional)</Label>
              <Textarea
                id="meeting-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this meeting for?"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="meeting-date">Date</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Location capture */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  Capture my location
                </Label>
                <Switch checked={captureLocation} onCheckedChange={setCaptureLocation} />
              </div>
              {captureLocation && (
                <Input
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="Location label (e.g. Room 204, Main Hall)"
                />
              )}
            </div>

            {/* Custom fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Participant Fields</Label>
                <Button variant="outline" size="sm" onClick={handleAddField}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Field
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                These are the details participants must fill when they join. "Name" is required.
              </p>
              {fields.map((field, index) => (
                <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
                  <GripVertical className="mt-2.5 h-4 w-4 text-slate-300" />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      value={field.label}
                      onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                      placeholder="Field label (e.g. Matric Number)"
                    />
                    <Select
                      value={field.field_type}
                      onValueChange={(v) => handleFieldChange(index, 'field_type', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={field.is_required}
                      onCheckedChange={(v) => handleFieldChange(index, 'is_required', v)}
                    />
                    <span className="text-xs text-slate-500">Required</span>
                  </div>
                  {fields.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !title.trim()}>
              {submitting ? 'Creating...' : 'Create Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
