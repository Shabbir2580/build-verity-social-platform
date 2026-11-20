"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, BrainCircuit, Clock3, Headphones, LoaderCircle, RefreshCw, Search, Send, ShieldCheck, UserRoundCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Ticket = {
  id: string; ticket_number: number; user_id: string; category: string; subject: string;
  description: string; status: string; priority: string; assigned_team: string;
  assigned_to: string | null; response_due_at: string; created_at: string; updated_at: string;
};
type Message = { id: string; body: string; is_staff: boolean; is_internal: boolean; created_at: string; author_id: string | null };
type Profile = { username: string; display_name: string };

const statuses = ["received", "under_review", "awaiting_information", "resolved", "appealed"];
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const stamp = (value: string) => { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unknown"; };

export default function StaffSupportPage() {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const [filter, setFilter] = useState("open");
  const [team, setTeam] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [aiConsent, setAiConsent] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<null | { summary: string; customer_goal: string; unresolved_questions: string[]; suggested_next_steps: string[]; draft_customer_reply: string; disclaimer: string }>(null);
  const messagesRequest = useRef(0);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const visible = useMemo(() => tickets.filter((ticket) => {
    const isBusinessEnquiry = ticket.subject.startsWith("Business enquiry —") || ticket.description.includes("VERITY BUSINESS ENQUIRY");
    const statusMatch = filter === "all" || (filter === "business" ? isBusinessEnquiry : filter === "open" ? ticket.status !== "resolved" : ticket.status === filter);
    const teamMatch = team === "all" || ticket.assigned_team === team;
    const owner = profiles[ticket.user_id];
    const term = search.trim().toLowerCase();
    const searchMatch = !term || String(ticket.ticket_number).includes(term) || ticket.subject.toLowerCase().includes(term) || ticket.description.toLowerCase().includes(term) || (owner?.username ?? "").toLowerCase().includes(term) || (owner?.display_name ?? "").toLowerCase().includes(term);
    return statusMatch && teamMatch && searchMatch;
  }), [tickets, filter, team, search, profiles]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) { window.location.href = "/login?next=%2Fsupport%2Fstaff"; return; }
      setUserId(auth.user.id);
      const { data: myRole, error: roleError } = await supabase.rpc("my_role");
      if (roleError) throw roleError;
      if (!["support", "moderator", "admin"].includes(myRole)) throw new Error("Staff access required.");
      setRole(myRole);
      const { data, error: ticketError } = await supabase.from("support_tickets")
        .select("id, ticket_number, user_id, category, subject, description, status, priority, assigned_team, assigned_to, response_due_at, created_at, updated_at")
        .order("created_at", { ascending: false }).order("id", { ascending: false }).range(0, 99);
      if (ticketError) throw ticketError;
      const rows = (data ?? []) as Ticket[];
      setTickets(rows);
      setHasMore(rows.length === 100);
      const ids = [...new Set(rows.map((ticket) => ticket.user_id))];
      if (ids.length) {
        const { data: people, error: peopleError } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
        if (peopleError) throw peopleError;
        setProfiles(Object.fromEntries((people ?? []).map((person) => [person.id, { username: person.username, display_name: person.display_name }])));
      } else setProfiles({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the support queue.");
    } finally { setLoading(false); }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true); setError("");
    try {
      const supabase = createClient();
      const start = tickets.length;
      const { data, error: ticketError } = await supabase.from("support_tickets")
        .select("id, ticket_number, user_id, category, subject, description, status, priority, assigned_team, assigned_to, response_due_at, created_at, updated_at")
        .order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, start + 99);
      if (ticketError) throw ticketError;
      const rows = (data ?? []) as Ticket[];
      setTickets((current) => [...current, ...rows.filter((row) => !current.some((item) => item.id === row.id))]);
      setHasMore(rows.length === 100);
      const ids = [...new Set(rows.map((ticket) => ticket.user_id))];
      if (ids.length) {
        const { data: people, error: peopleError } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
        if (peopleError) throw peopleError;
        setProfiles((current) => ({ ...current, ...Object.fromEntries((people ?? []).map((person) => [person.id, { username: person.username, display_name: person.display_name }])) }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load older tickets.");
    } finally { setLoadingMore(false); }
  }, [tickets.length, loading, loadingMore, hasMore]);

  const loadMessages = useCallback(async (ticketId: string) => {
    const requestId = ++messagesRequest.current;
    if (!ticketId) { setMessages([]); return; }
    // Never leave the previous ticket's private conversation visible while
    // the next ticket is loading, and ignore responses from stale requests.
    setMessages([]);
    const supabase = createClient();
    const { data, error: messageError } = await supabase.from("support_ticket_messages")
      .select("id, body, is_staff, is_internal, created_at, author_id")
      .eq("ticket_id", ticketId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(200);
    if (requestId !== messagesRequest.current) return;
    if (messageError) { setError(messageError.message); return; }
    setMessages(((data ?? []) as Message[]).reverse());
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadMessages(selectedId); }, [selectedId, loadMessages]);
  useEffect(() => { setAiConsent(false); setAiResult(null); }, [selectedId]);

  async function updateTicket(values: Partial<Pick<Ticket, "status" | "assigned_to">>, action: string) {
    if (!selected || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.from("support_tickets").update(values).eq("id", selected.id);
      if (updateError) throw updateError;
      setNotice(action);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update ticket."); }
    finally { setSaving(false); }
  }

  async function generateAiAssist() {
    if (!selected || !aiConsent || aiBusy) return;
    setAiBusy(true); setError(""); setAiResult(null);
    try {
      const supabase = createClient();
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = session.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");
      const response = await fetch("/api/support/ai-assist", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ ticketId: selected.id, consent: true }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not assist with this ticket.");
      setAiResult({ ...payload.assistant, disclaimer: payload.disclaimer || "AI-generated draft only. Verify before sending." });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not assist with this ticket."); }
    finally { setAiBusy(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim() || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("support_ticket_messages").insert({
        ticket_id: selected.id, body: draft.trim(), is_internal: internal,
      });
      if (insertError) throw insertError;
      setDraft(""); setNotice(internal ? "Internal note saved." : "Reply sent to the customer.");
      await loadMessages(selected.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send message."); }
    finally { setSaving(false); }
  }

  if (loading && !tickets.length) return <main className="flex min-h-screen items-center justify-center gap-2 bg-[#f5f6fb] text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin"/> Loading staff queue…</main>;

  return <main className="verity-workspace min-h-screen bg-[#f5f6fb] px-4 pb-14 text-slate-900 sm:px-6">
    <header className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between border-b border-slate-200"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/> Back to Verity</Link><span className="text-lg font-black">Verity<span className="text-indigo-600">.</span></span></header>
    <section className="mx-auto max-w-7xl pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-indigo-600"><Headphones size={19}/><span className="text-xs font-extrabold uppercase tracking-wider">Staff workspace · {pretty(role || "staff")}</span></div><h1 className="mt-2 text-3xl font-black tracking-tight">Support queue</h1><p className="mt-2 text-sm text-slate-500">Handle customer requests, assign ownership, and keep replies and internal notes in one thread.</p></div><Link href="/staff/assistant" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-700 hover:bg-indigo-50"><BrainCircuit size={15}/> Staff AI</Link><button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh queue</button></div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><Search size={16} className="text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticket, subject or member" className="w-full bg-transparent text-sm outline-none"/></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">{[["open","All open"],["business","Business enquiries"],["all","All statuses"],...statuses.map((status) => [status,pretty(status)])].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={team} onChange={(event) => setTeam(event.target.value)} aria-label="Filter by accessible team" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="all">All accessible teams</option>{(role === "admin" ? ["support", "trust_safety"] : role === "support" ? ["support"] : ["trust_safety"]).map((teamName) => <option key={teamName} value={teamName}>{pretty(teamName)}</option>)}</select>
      </div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <section className="space-y-3">
          {visible.length ? visible.map((ticket) => { const person = profiles[ticket.user_id]; return <button key={ticket.id} onClick={() => { setSelectedId(ticket.id); setNotice(""); setError(""); }} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${selectedId === ticket.id ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 bg-white hover:border-indigo-200"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-extrabold uppercase tracking-wide text-indigo-700">VER-{String(ticket.ticket_number).padStart(6,"0")}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold">{pretty(ticket.status)}</span></div>
            <p className="mt-2 font-bold">{ticket.subject}</p><p className="mt-1 text-xs text-slate-500">{person?.display_name || "Member"} · @{person?.username || "unknown"} · {ticket.subject.startsWith("Business enquiry —") || ticket.description.includes("VERITY BUSINESS ENQUIRY") ? "Business lead" : pretty(ticket.category)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span className="font-bold">{pretty(ticket.priority)} priority</span><span>{pretty(ticket.assigned_team)}</span><span className="inline-flex items-center gap-1"><Clock3 size={12}/> Due {stamp(ticket.response_due_at)}</span></div>
          </button>; }) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{loading ? "Refreshing…" : "No tickets match these filters."}</div>}
          {hasMore && <button onClick={() => void loadMore()} disabled={loadingMore || loading} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-indigo-300 disabled:opacity-50">{loadingMore ? "Loading older tickets…" : "Load older tickets"}</button>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {!selected ? <div className="flex min-h-[380px] flex-col items-center justify-center text-center"><Headphones size={34} className="text-slate-300"/><h2 className="mt-3 font-extrabold">Select a ticket</h2><p className="mt-1 max-w-sm text-sm text-slate-500">The full customer conversation and staff controls will appear here.</p></div> : <>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-indigo-700">VER-{String(selected.ticket_number).padStart(6,"0")} · {pretty(selected.category)}</p><h2 className="mt-1 text-xl font-black">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">From @{profiles[selected.user_id]?.username || "member"} · Opened {stamp(selected.created_at)}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{pretty(selected.status)}</span></div>
            <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-extrabold uppercase text-slate-500">Customer request</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{selected.description}</p></div>
            <section className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-violet-950"><BrainCircuit size={16}/> AI support assistant</div>
              <p className="mt-1 text-xs leading-5 text-violet-900">Summarizes this ticket and prepares a reply draft. It never sends the reply or changes ticket status.</p>
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-5 text-violet-950"><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-violet-700"/><span>I authorize sending this ticket description and conversation, including internal staff notes, to Google Gemini for this request. Google's processing and data-use terms apply.</span></label>
              <button type="button" onClick={() => void generateAiAssist()} disabled={!aiConsent || aiBusy} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{aiBusy ? <LoaderCircle size={14} className="animate-spin"/> : <BrainCircuit size={14}/>} {aiBusy ? "Preparing assistance…" : "Summarize & draft reply"}</button>
              {aiResult && <div className="mt-4 space-y-3 rounded-xl bg-white p-4 text-xs leading-5 text-slate-700">
                <div><p className="font-extrabold text-slate-900">Summary</p><p className="mt-1">{aiResult.summary}</p></div>
                <div><p className="font-extrabold text-slate-900">Customer goal</p><p className="mt-1">{aiResult.customer_goal || "Not clear from the ticket."}</p></div>
                {([["Unresolved questions",aiResult.unresolved_questions],["Suggested next steps",aiResult.suggested_next_steps]] as [string,string[]][]).map(([heading,items]) => <div key={heading}><p className="font-extrabold text-slate-900">{heading}</p>{items.length ? <ul className="mt-1 list-disc pl-5">{items.map((item,index)=><li key={index}>{item}</li>)}</ul> : <p className="text-slate-500">None identified.</p>}</div>)}
                <div><div className="flex items-center justify-between gap-2"><p className="font-extrabold text-slate-900">Draft customer reply</p><button type="button" onClick={() => setDraft(aiResult.draft_customer_reply)} className="rounded-lg border border-violet-200 px-2 py-1 font-bold text-violet-800">Use in reply editor</button></div><p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{aiResult.draft_customer_reply}</p></div>
                <p className="border-t border-slate-100 pt-2 text-[11px] text-amber-800">{aiResult.disclaimer}</p>
              </div>}
            </section>
            <div className="mt-4 flex flex-wrap items-center gap-2"><button disabled={saving || selected.assigned_to === userId} onClick={() => void updateTicket({assigned_to:userId,status:selected.status === "received" ? "under_review" : selected.status},"Ticket assigned to you.")} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold disabled:opacity-40"><UserRoundCheck size={14}/> {selected.assigned_to === userId ? "Assigned to you" : "Assign to me"}</button><label className="ml-auto text-xs font-bold text-slate-500">Status <select value={selected.status} disabled={saving} onChange={(event) => void updateTicket({status:event.target.value},"Ticket status updated.")} className="ml-2 min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700">{statuses.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}</select></label></div>
            <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="font-extrabold">Conversation & staff notes</h3><div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">{messages.length ? messages.map((message) => <article key={message.id} className={`rounded-xl p-3 ${message.is_internal ? "border border-amber-200 bg-amber-50" : message.is_staff ? "border border-indigo-100 bg-indigo-50" : "bg-slate-50"}`}><div className="flex items-center gap-2 text-xs font-extrabold">{message.is_internal ? <><ShieldCheck size={13}/> Internal staff note</> : message.is_staff ? "Verity staff" : "Customer"}<span className="font-normal text-slate-400">· {stamp(message.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.body}</p></article>) : <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">No messages yet.</p>}</div>
              {selected.status !== "resolved" && <form onSubmit={(event) => void sendMessage(event)} className="mt-4"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={3} required placeholder={internal ? "Write an internal note for staff…" : "Write a reply visible to the customer…"} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400"/><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)}/> Internal note only</label><button disabled={saving || !draft.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white disabled:opacity-50">{saving ? <LoaderCircle size={14} className="animate-spin"/> : <Send size={14}/>} {internal ? "Save note" : "Send reply"}</button></div></form>}
            </div>
          </>}
        </section>
      </div>
    </section>
  </main>;
}
