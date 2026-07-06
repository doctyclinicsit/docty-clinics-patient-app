import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Database,
  Info,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StaffInfo {
  name?: string;
  mobile?: string;
  isAdmin?: boolean;
}

interface SystemLog {
  id: string;
  createdAt: string;
  level: 'info' | 'success' | 'warning' | 'error';
  source: string;
  event: string;
  message: string;
  actorName?: string;
  actorMobile?: string;
  metadata?: Record<string, unknown>;
}

const levelStyles = {
  info: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    bubble: 'border-sky-100 bg-sky-50/80',
    icon: Info,
  },
  success: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bubble: 'border-emerald-100 bg-emerald-50/80',
    icon: CheckCircle2,
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    bubble: 'border-amber-100 bg-amber-50/80',
    icon: AlertCircle,
  },
  error: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    bubble: 'border-red-100 bg-red-50/80',
    icon: AlertCircle,
  },
} as const;

function formatDateTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function metadataPreview(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) return '';
  return Object.entries(metadata)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' | ');
}

export default function StaffSystemLogsPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staff, setStaff] = useState<StaffInfo>({});
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [level, setLevel] = useState('all');
  const [note, setNote] = useState('');
  const [noteLevel, setNoteLevel] = useState<SystemLog['level']>('info');
  const [isPosting, setIsPosting] = useState(false);

  const sources = useMemo(
    () => Array.from(new Set(logs.map((log) => log.source).filter(Boolean))).sort(),
    [logs]
  );

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '120' });
      if (query.trim()) params.set('q', query.trim());
      if (source !== 'all') params.set('source', source);
      if (level !== 'all') params.set('level', level);
      const response = await fetch(`/api/staff/system-logs?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to load system logs.');
      setLogs(body?.logs || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load system logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/staff/session', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        setIsAuthenticated(response.ok);
        if (response.ok) {
          const body = await response.json().catch(() => null);
          setStaff(body?.staff || {});
        }
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !staff.isAdmin) return undefined;
    void loadLogs();
    const timer = window.setInterval(() => void loadLogs(), 30000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, staff.isAdmin, source, level]);

  const submitNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!note.trim()) return;
    setIsPosting(true);
    try {
      const response = await fetch('/api/staff/system-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: noteLevel,
          source: 'staff-note',
          event: 'manual_note',
          message: note.trim(),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to add note.');
      setNote('');
      setLogs((current) => [body.log, ...current]);
      toast.success('System log note added.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add note.');
    } finally {
      setIsPosting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center">
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="text-2xl font-bold">Staff sign-in required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please sign in through the staff application to view system logs.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/staff">Open Staff Application</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!staff.isAdmin) {
    return (
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="text-2xl font-bold">Admin access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              System logs are visible only to admin staff.
            </p>
            <Button asChild variant="outline" className="mt-5 rounded-full">
              <Link to="/staff">Back to Staff Application</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/80">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline" className="rounded-full bg-white">
              <Link to="/staff">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Staff
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white"
              disabled={isLoading}
              onClick={() => void loadLogs()}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                <Database className="h-4 w-4" />
                Neon system logs
              </div>
              <h1 className="text-3xl font-bold">System Logs Chat</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Live operational activity from scheduled jobs, pharmacy billing, WhatsApp invoice delivery, and staff notes.
                {staff.name || staff.mobile ? ` Signed in as ${staff.name || `+91 ${staff.mobile}`}.` : ''}
              </p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full bg-slate-50 px-3 py-1">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Auto-refresh 30s
            </Badge>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void loadLogs();
                  }}
                  placeholder="Search logs, events, staff"
                  className="pl-9"
                />
              </div>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {sources.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" className="rounded-full" onClick={() => void loadLogs()} disabled={isLoading}>
                Search
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="max-h-[680px] overflow-y-auto p-4">
              {isLoading && logs.length === 0 ? (
                <div className="flex min-h-64 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading system logs
                </div>
              ) : logs.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center text-muted-foreground">
                  <MessageSquareText className="mb-3 h-10 w-10" />
                  <p className="font-semibold text-foreground">No logs found</p>
                  <p className="mt-1 text-sm">Try a different filter or add a staff note.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const style = levelStyles[log.level] || levelStyles.info;
                    const Icon = style.icon;
                    const preview = metadataPreview(log.metadata);
                    return (
                      <article key={log.id} className={`rounded-lg border p-4 ${style.bubble}`}>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={style.badge}>
                            <Icon className="mr-1 h-3.5 w-3.5" />
                            {log.level}
                          </Badge>
                          <Badge variant="outline" className="bg-white/70">
                            {log.source}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{log.event.replace(/_/g, ' ')}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{log.message}</p>
                        {(log.actorName || log.actorMobile) && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            By {log.actorName || `+91 ${log.actorMobile}`}
                          </p>
                        )}
                        {preview && (
                          <p className="mt-2 break-words rounded-md bg-white/70 px-3 py-2 text-xs text-muted-foreground">
                            {preview}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit shadow-sm">
          <CardContent className="p-4">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <MessageSquareText className="h-5 w-5 text-primary" />
                Add staff note
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Notes are stored in Neon along with automated system activity.
              </p>
            </div>
            <form className="space-y-3" onSubmit={submitNote}>
              <Select value={noteLevel} onValueChange={(value) => setNoteLevel(value as SystemLog['level'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Note level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Type an operational note..."
                rows={6}
              />
              <Button type="submit" className="w-full rounded-full" disabled={isPosting || !note.trim()}>
                {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Add to Logs
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
