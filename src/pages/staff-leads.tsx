import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  IdCard,
  LineChart,
  ListChecks,
  Loader2,
  LogOut,
  MapPin,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ZohoLead {
  id: string;
  name: string;
  contactNumber: string;
  service: string;
  location: string;
  remarks: string;
  status: string;
  owner?: { id?: string; name?: string; email?: string };
  createdTime?: string;
  modifiedTime?: string;
}

interface ZohoUser {
  id: string;
  name: string;
  email?: string;
  profileName?: string;
  isAdmin?: boolean;
}

interface LeadHistoryItem {
  id: string;
  title: string;
  content: string;
  createdTime?: string;
  modifiedTime?: string;
  owner?: string;
  createdBy?: string;
  modifiedBy?: string;
}

const statusOptions = [
  'Open',
  'Attempted to Contact',
  'Contacted',
  'Follow-up Required',
  'Appointment Booked',
  'Not Interested',
  'Closed',
];

function formatDateTime(value?: string) {
  if (!value) return 'Not available';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export default function StaffLeadsPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStaffAdmin, setIsStaffAdmin] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [leads, setLeads] = useState<ZohoLead[]>([]);
  const [users, setUsers] = useState<ZohoUser[]>([]);
  const [adminUser, setAdminUser] = useState<ZohoUser | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { ownerId: string; status: string; remarks: string }>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [loadingHistoryLeadId, setLoadingHistoryLeadId] = useState('');
  const [updatingLeadId, setUpdatingLeadId] = useState('');
  const [leadHistory, setLeadHistory] = useState<Record<string, LeadHistoryItem[]>>({});
  const [expandedHistoryLeadId, setExpandedHistoryLeadId] = useState('');

  const logout = async () => {
    await fetch('/api/staff/logout', { method: 'POST' }).catch(() => null);
    setIsAuthenticated(false);
    setLeads([]);
  };

  const loadSession = async () => {
    try {
      const response = await fetch('/api/staff/session', { headers: { Accept: 'application/json' } });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.authenticated) {
        setIsAuthenticated(false);
        return;
      }
      setIsAuthenticated(true);
      setIsStaffAdmin(Boolean(body.staff?.isAdmin));
      setStaffName(body.staff?.name || '');
      setStaffMobile(body.staff?.mobile || '');
    } finally {
      setIsCheckingSession(false);
    }
  };

  const loadLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const response = await fetch('/api/staff/zoho-leads?perPage=100', { headers: { Accept: 'application/json' } });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to fetch Zoho leads.');
      const nextLeads = Array.isArray(body?.leads) ? body.leads : [];
      setLeads(nextLeads);
      setDrafts((current) => {
        const next = { ...current };
        nextLeads.forEach((lead: ZohoLead) => {
          if (!next[lead.id]) {
            next[lead.id] = {
              ownerId: lead.owner?.id || '',
              status: lead.status || 'Open',
              remarks: lead.remarks || '',
            };
          }
        });
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to fetch Zoho leads.');
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/staff/zoho-users', { headers: { Accept: 'application/json' } });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to fetch Zoho users.');
      setUsers(Array.isArray(body?.users) ? body.users : []);
      setAdminUser(body?.adminUser || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to fetch Zoho users.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadLeads();
    void loadUsers();
    const interval = window.setInterval(() => void loadLeads(), 30000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated]);

  const services = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.service).filter(Boolean))).sort(),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const haystack = [lead.name, lead.contactNumber, lead.service, lead.location, lead.remarks, lead.owner?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        (!needle || haystack.includes(needle)) &&
        (statusFilter === 'all' || lead.status === statusFilter) &&
        (serviceFilter === 'all' || lead.service === serviceFilter) &&
        (ownerFilter === 'all' ||
          (ownerFilter === 'unassigned' ? !lead.owner?.id : lead.owner?.id === ownerFilter))
      );
    });
  }, [leads, ownerFilter, search, serviceFilter, statusFilter]);

  const updateDraft = (leadId: string, patch: Partial<{ ownerId: string; status: string; remarks: string }>) => {
    setDrafts((current) => ({
      ...current,
      [leadId]: {
        ownerId: current[leadId]?.ownerId || '',
        status: current[leadId]?.status || 'Open',
        remarks: current[leadId]?.remarks || '',
        ...patch,
      },
    }));
  };

  const updateLead = async (lead: ZohoLead) => {
    const draft = drafts[lead.id];
    if (!draft) return;
    setUpdatingLeadId(lead.id);
    try {
      const response = await fetch('/api/staff/zoho-leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          ownerId: draft.ownerId,
          status: draft.status,
          remarks: draft.remarks,
          assignToAdmin: !draft.ownerId,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to update lead.');
      if (body?.historyWarning) {
        toast.warning(`Lead updated, but history note was not saved: ${body.historyWarning}`);
      } else {
        toast.success('Lead updated in Zoho.');
      }
      await loadLeads();
      await loadLeadHistory(lead.id, true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update lead.');
    } finally {
      setUpdatingLeadId('');
    }
  };

  const loadLeadHistory = async (leadId: string, force = false) => {
    if (!force && leadHistory[leadId]) {
      setExpandedHistoryLeadId((current) => (current === leadId ? '' : leadId));
      return;
    }
    setLoadingHistoryLeadId(leadId);
    try {
      const response = await fetch(`/api/staff/zoho-lead-history?leadId=${encodeURIComponent(leadId)}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to fetch lead history.');
      setLeadHistory((current) => ({ ...current, [leadId]: Array.isArray(body?.history) ? body.history : [] }));
      setExpandedHistoryLeadId(leadId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to fetch lead history.');
    } finally {
      setLoadingHistoryLeadId('');
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
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Staff access required</h1>
            <p className="mt-2 text-muted-foreground">
              Please sign in through the staff application to view and work on Clinic Leads.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/staff">Go to staff login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/70">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="h-12 w-auto" />
            <Button variant="outline" className="rounded-full bg-white" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full bg-white">
              <Link to="/staff">
                <IdCard className="mr-2 h-4 w-4" />
                Cards
              </Link>
            </Button>
            <Button className="rounded-full">
              <ListChecks className="mr-2 h-4 w-4" />
              Leads
            </Button>
            {isStaffAdmin && (
              <>
                <Button asChild variant="outline" className="rounded-full bg-white">
                  <Link to="/staff/doctor-payout">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Doctor Payout
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-white">
                  <Link to="/franchise">
                    <LineChart className="mr-2 h-4 w-4" />
                    Franchise Dashboard
                  </Link>
                </Button>
              </>
            )}
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <ListChecks className="h-4 w-4" />
              Live Zoho Clinic Leads
            </div>
            <h1 className="text-3xl font-bold">Manage clinic leads</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              View incoming Zoho Clinic Leads, assign them to staff, and update follow-up status.
              {staffName || staffMobile ? ` Signed in as ${staffName || `+91 ${staffMobile}`}.` : ''}
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        <Card className="mb-6 shadow-sm">
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, mobile, service, location, follow-up notes"
                className="h-11 rounded-full pl-12"
              />
            </div>
            <select className="h-11 rounded-full border border-input bg-background px-4 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select className="h-11 rounded-full border border-input bg-background px-4 text-sm" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
              <option value="all">All services</option>
              {services.map((service) => <option key={service} value={service}>{service}</option>)}
            </select>
            <select className="h-11 rounded-full border border-input bg-background px-4 text-sm" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value="all">All owners</option>
              <option value="unassigned">Unassigned</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <Button type="button" className="h-11 rounded-full" onClick={() => { void loadLeads(); void loadUsers(); }} disabled={isLoadingLeads || isLoadingUsers}>
              {isLoadingLeads || isLoadingUsers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <p className="text-xs text-muted-foreground md:col-span-5">
              Auto-refreshes every 30 seconds. Assignment updates Zoho Owner and progress updates the configured status field.
            </p>
          </CardContent>
        </Card>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge className="rounded-full">{filteredLeads.length} visible</Badge>
          <span>{leads.length} leads fetched from Zoho</span>
        </div>

        {filteredLeads.length > 0 ? (
          <div className="space-y-4">
            {filteredLeads.map((lead) => {
              const draft = drafts[lead.id] || { ownerId: lead.owner?.id || '', status: lead.status || 'Open', remarks: lead.remarks || '' };
              return (
                <Card key={lead.id} className="overflow-hidden shadow-sm">
                  <CardContent className="grid gap-5 p-4 lg:grid-cols-[1.2fr_1fr] lg:p-5">
                    <div>
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold">{lead.name}</h2>
                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {lead.contactNumber && (
                              <a className="inline-flex items-center gap-1 font-semibold text-foreground" href={`tel:${lead.contactNumber}`}>
                                <Phone className="h-4 w-4 text-primary" />
                                {lead.contactNumber}
                              </a>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-primary" />
                              {lead.location}
                            </span>
                          </div>
                        </div>
                        <Badge className="rounded-full">{lead.status}</Badge>
                      </div>
                      <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service</p>
                          <p className="mt-1 font-bold">{lead.service}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</p>
                          <p className="mt-1 font-bold">{lead.owner?.name || 'Unassigned'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</p>
                          <p className="mt-1 font-bold">{formatDateTime(lead.createdTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modified</p>
                          <p className="mt-1 font-bold">{formatDateTime(lead.modifiedTime)}</p>
                        </div>
                      </div>
                      {lead.remarks && <p className="mt-4 rounded-3xl border bg-white p-4 text-sm leading-6 text-muted-foreground">{lead.remarks}</p>}
                    </div>

                    <div className="rounded-3xl border bg-white p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                        <UserRoundCheck className="h-4 w-4" />
                        Work this lead
                      </div>
                      {adminUser && (
                        <div className="mb-4 rounded-2xl bg-sky-50 p-3 text-xs text-slate-700">
                          If no assignee is selected, saving will assign this lead to Zoho Admin:{' '}
                          <span className="font-bold">{adminUser.name}</span>.
                        </div>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`owner-${lead.id}`}>Assign to</Label>
                          <select id={`owner-${lead.id}`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.ownerId} onChange={(event) => updateDraft(lead.id, { ownerId: event.target.value })}>
                            <option value="">{adminUser ? `Zoho Admin (${adminUser.name})` : 'Unassigned'}</option>
                            {users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.isAdmin ? ' · Admin' : ''}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`status-${lead.id}`}>Status</Label>
                          <select id={`status-${lead.id}`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.status} onChange={(event) => updateDraft(lead.id, { status: event.target.value })}>
                            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor={`remarks-${lead.id}`}>Follow-up Notes</Label>
                        <Textarea id={`remarks-${lead.id}`} value={draft.remarks} onChange={(event) => updateDraft(lead.id, { remarks: event.target.value })} rows={4} placeholder="Add staff follow-up notes for Zoho" />
                      </div>
                      <Button className="mt-4 w-full rounded-full" onClick={() => void updateLead(lead)} disabled={updatingLeadId === lead.id}>
                        {updatingLeadId === lead.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save to Zoho
                      </Button>
                      <Button
                        variant="outline"
                        className="mt-3 w-full rounded-full bg-white"
                        onClick={() => void loadLeadHistory(lead.id)}
                        disabled={loadingHistoryLeadId === lead.id}
                      >
                        {loadingHistoryLeadId === lead.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquareText className="mr-2 h-4 w-4" />
                        )}
                        {expandedHistoryLeadId === lead.id ? 'Hide history' : 'Show history'}
                      </Button>
                      {expandedHistoryLeadId === lead.id && (
                        <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                          <h3 className="mb-3 text-sm font-bold">Lead history</h3>
                          {(leadHistory[lead.id] || []).length > 0 ? (
                            <div className="space-y-3">
                              {(leadHistory[lead.id] || []).map((item) => (
                                <div key={item.id} className="rounded-2xl border bg-white p-3 text-sm">
                                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-bold">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">{formatDateTime(item.createdTime)}</p>
                                  </div>
                                  {item.content && (
                                    <p className="whitespace-pre-wrap text-muted-foreground">{item.content}</p>
                                  )}
                                  {(item.createdBy || item.owner) && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {item.createdBy ? `By ${item.createdBy}` : `Owner ${item.owner}`}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-2xl bg-white p-4 text-sm text-muted-foreground">
                              No history notes found for this lead yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed bg-white/80">
            <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
              <ListChecks className="mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-xl font-bold">No leads found</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Try changing filters, or confirm Zoho CRM OAuth credentials and the custom module API name.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
