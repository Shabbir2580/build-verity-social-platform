"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Clock3, Headphones, LoaderCircle, Send, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Ticket = {
  id: string;
  ticket_number: number;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  resolution: string | null;
  response_due_at: string;
  created_at: string;
};

type TicketMessage = {
  id: string;
  author_id: string | null;
  body: string;
  is_staff: boolean;
  created_at: string;
};

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Time unavailable";
}

function pretty(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const [ticketId, setTicketId] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void params.then(({ id }) => { if (active) setTicketId(id); });
    return () => { active = false; };
  }, [params]);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        window.location.href = `/login?next=${encodeURIComponent(`/support/tickets/${ticketId}`)}`;
        return;
      }
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, category, subject, description, status, priority, resolution, response_due_at, created_at")
        .eq("id", ticketId)
        .maybeSingle();
      if (ticketError) throw ticketError;
      if (!ticketData) throw new Error("This ticket is unavailable or you do not have permission to view it.");
      const { data: messageData, error: messageError } = await supabase
        .from("support_ticket_messages")
        .select("id, author_id, body, is_staff, created_at")
        .eq("ticket_id", ticketId)
        .eq("is_internal", false)
        .order("created_at", { ascending: true })
        .limit(200);
      if (messageError) throw messageError;
      setTicket(ticketData as Ticket);
      setMessages((messageData ?? []) as TicketMessage[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this support ticket.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { void load(); }, [load]);

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (body.length < 1 || body.length > 5000 || !ticket) return;
    setSending(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        body,
        is_internal: false,
      });
      if (insertError) throw insertError;
      setDraft("");
      setNotice("Your reply has been added to this ticket.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your reply.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 pb-12 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-4xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="text-xl font-black tracking-tight">verity<span className="text-indigo-600">.</span></Link>
        <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><ArrowLeft size={15}/> Back to feed</Link>
      </header>
      <div className="mx-auto max-w-4xl py-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><Headphones size={23}/></span>
          <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">Verity support</p><h1 className="text-2xl font-black">Ticket conversation</h1></div>
        </div>
        {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/> Loading ticket…</div> : error && !ticket ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}<button onClick={() => void load()} className="ml-3 font-bold underline">Retry</button></div> : ticket && <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-extrabold uppercase tracking-wide text-indigo-600">VER-{String(ticket.ticket_number).padStart(6,"0")}</p><h2 className="mt-1 text-xl font-black">{ticket.subject}</h2><p className="mt-2 text-xs text-slate-500">{pretty(ticket.category)} · Submitted {formatTime(ticket.created_at)}</p></div>
              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{pretty(ticket.status)}</span>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Your original message</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{ticket.description}</p></div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span>Priority: {pretty(ticket.priority)}</span><span className="inline-flex items-center gap-1"><Clock3 size={13}/> Response target: {formatTime(ticket.response_due_at)}</span></div>
            {ticket.resolution && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">Resolution</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-emerald-950">{ticket.resolution}</p></div>}
          </section>

          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Messages</h2><button onClick={() => void load()} className="text-xs font-bold text-indigo-700 hover:underline">Refresh</button></div>
            {messages.length ? <div className="mt-4 space-y-3">{messages.map((message) => <article key={message.id} className={`max-w-[92%] rounded-2xl p-4 ${message.is_staff ? "border border-indigo-100 bg-indigo-50" : "ml-auto border border-slate-200 bg-slate-50"}`}><div className="flex items-center gap-2 text-xs font-extrabold">{message.is_staff ? <><ShieldCheck size={14} className="text-indigo-700"/> Verity support</> : "You"}<span className="font-normal text-slate-400">· {formatTime(message.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.body}</p></article>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No replies yet. Your support conversation will appear here.</p>}
            {ticket.status !== "resolved" ? <form onSubmit={(event) => void sendReply(event)} className="mt-5 border-t border-slate-100 pt-5"><label className="block text-sm font-bold">Add a reply<textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={4} required placeholder="Write a message for the support team…" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-base font-normal leading-6 outline-none focus:border-indigo-400 sm:text-sm"/></label><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-400">{draft.length}/5000 characters</span><button type="submit" disabled={sending || !draft.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-50">{sending ? <LoaderCircle className="animate-spin" size={16}/> : <Send size={16}/>} Send reply</button></div></form> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">This ticket is resolved. Replies are closed; create a new ticket if you need more help.</p>}
            {notice && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
            {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          </section>
        </>}
      </div>
    </main>
  );
}
