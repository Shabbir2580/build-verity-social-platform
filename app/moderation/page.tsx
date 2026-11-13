"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardList, LoaderCircle, RefreshCw, ShieldCheck, AlertTriangle, Clock3, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CaseRow = {
  id: string; post_id: string | null; label_id: string | null;
  case_type: "label_review" | "appeal" | "report";
  status: "submitted" | "awaiting_review" | "under_review" | "awaiting_information" | "resolved" | "appealed";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to: string | null; opened_by: string | null; summary: string | null;
  resolution: string | null; needs_second_review: boolean; second_review_requested_by: string | null; due_at: string;
  created_at: string; updated_at: string; resolved_at: string | null;
};
type ReportRow = { id: string; case_id: string | null; target_type: string; target_id: string; reason: string; details: string | null; status: string; reporter_id: string; created_at: string };
type AppealRow = { id: string; case_id: string | null; post_id: string; appellant_id: string; reason: string; evidence: string | null; status: string; created_at: string };
type PostRow = { id: string; title: string | null; body: string; author_id: string; status: string; removal_reason: string | null };
type LabelRow = { id: string; dimension: string; value: string; basis: string; explanation: string | null; status: string };
type ActionRow = { id: string; action: string; reason: string; actor_id: string | null; created_at: string };
type CheckRow = { id: string; post_id: string; provider: string; check_type: string; status: string; explanation: string | null; uncertainty: string | null; created_at: string };

const statusLabels: Record<string, string> = {
  submitted: "Submitted", awaiting_review: "Awaiting review", under_review: "Under review",
  awaiting_information: "Awaiting information", resolved: "Resolved", appealed: "Escalated appeal",
};
const priorityStyles: Record<string, string> = {
  low: "bg-slate-100 text-slate-600", normal: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-800", urgent: "bg-rose-50 text-rose-700",
};

export default function ModerationPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"moderator" | "admin" | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [posts, setPosts] = useState<Record<string, PostRow>>({});
  const [labels, setLabels] = useState<Record<string, LabelRow>>({});
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { username: string; display_name: string }>>({});
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const casesRef = useRef<CaseRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [labelValue, setLabelValue] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [assignee, setAssignee] = useState("");

  const selected = cases.find((item) => item.id === selectedId) ?? null;
  const selectedReports = reports.filter((item) => item.case_id === selectedId);
  const selectedAppeals = appeals.filter((item) => item.case_id === selectedId);
  const selectedChecks = selected?.post_id ? checks.filter((item) => item.post_id === selected.post_id) : [];
  const filteredCases = useMemo(() => cases.filter((item) => filter === "mine" ? item.assigned_to === userId : filter === "unassigned" ? item.assigned_to === null && item.status !== "resolved" : filter === "active" ? item.status !== "resolved" : filter === "all" ? true : item.status === filter), [cases, filter, userId]);

  const load = useCallback(async (append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) { setAuthorized(false); setChecking(false); return; }
      setUserId(auth.user.id);
      const { data: me, error: meError } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      if (meError) throw meError;
      if (!["moderator", "admin"].includes(me.role)) { setAuthorized(false); setChecking(false); return; }
      setUserRole(me.role as "moderator" | "admin");
      setAuthorized(true);
      const offset = append ? casesRef.current.length : 0;
      const { data: caseRows, error: casesError } = await supabase.from("moderation_cases")
        .select("id, post_id, label_id, case_type, status, priority, assigned_to, opened_by, summary, resolution, needs_second_review, second_review_requested_by, due_at, created_at, updated_at, resolved_at")
        .order("created_at", { ascending: false }).range(offset, offset + 99);
      if (casesError) throw casesError;
      const fetchedRows = (caseRows ?? []) as CaseRow[];
      setHasMore(fetchedRows.length === 100);
      const rows = append
        ? [...casesRef.current, ...fetchedRows.filter((item) => !casesRef.current.some((existing) => existing.id === item.id))]
        : fetchedRows;
      casesRef.current = rows;
      setCases(rows);
      const caseIds = rows.map((item) => item.id);
      const postIds = [...new Set(rows.map((item) => item.post_id).filter((id): id is string => Boolean(id)))];
      const labelIds = [...new Set(rows.map((item) => item.label_id).filter((id): id is string => Boolean(id)))];
      if (!caseIds.length) {
        setReports([]); setAppeals([]); setPosts({}); setLabels({}); setChecks([]); setProfiles({});
        setActions([]); setSelectedId(null);
        return;
      }
      const [reportResult, appealResult, postResult, labelResult, checkResult] = await Promise.all([
        supabase.from("reports").select("id, case_id, target_type, target_id, reason, details, status, reporter_id, created_at").in("case_id", caseIds).order("created_at", { ascending: false }),
        supabase.from("appeals").select("id, case_id, post_id, appellant_id, reason, evidence, status, created_at").in("case_id", caseIds).order("created_at", { ascending: false }),
        postIds.length ? supabase.from("posts").select("id, title, body, author_id, status, removal_reason").in("id", postIds) : Promise.resolve({ data: [], error: null }),
        labelIds.length ? supabase.from("post_labels").select("id, dimension, value, basis, explanation, status").in("id", labelIds) : Promise.resolve({ data: [], error: null }),
        postIds.length ? supabase.from("content_checks").select("id, post_id, provider, check_type, status, explanation, uncertainty, created_at").in("post_id", postIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      ]);
      if (reportResult.error) throw reportResult.error;
      if (appealResult.error) throw appealResult.error;
      if (postResult.error) throw postResult.error;
      if (labelResult.error) throw labelResult.error;
      if (checkResult.error) throw checkResult.error;
      setReports((reportResult.data ?? []) as ReportRow[]);
      setAppeals((appealResult.data ?? []) as AppealRow[]);
      setPosts(Object.fromEntries(((postResult.data ?? []) as PostRow[]).map((item) => [item.id, item])));
      setLabels(Object.fromEntries(((labelResult.data ?? []) as LabelRow[]).map((item) => [item.id, item])));
      setChecks((checkResult.data ?? []) as CheckRow[]);
      const actorIds = [...new Set([...rows.flatMap((item) => [item.opened_by, item.assigned_to, item.second_review_requested_by]), ...((reportResult.data ?? []) as ReportRow[]).map((item) => item.reporter_id), ...((appealResult.data ?? []) as AppealRow[]).map((item) => item.appellant_id)].filter((id): id is string => Boolean(id)))];
      const peopleResult = actorIds.length
        ? await supabase.from("profiles").select("id, username, display_name").in("id", actorIds)
        : { data: [], error: null };
      if (peopleResult.error) throw peopleResult.error;
      let people = peopleResult.data ?? [];
      if (me.role === "admin") {
        const { data: staffPeople, error: staffError } = await supabase.from("profiles")
          .select("id, username, display_name").in("role", ["moderator", "admin"]).eq("is_suspended", false);
        if (staffError) throw staffError;
        people = [...people, ...(staffPeople ?? [])];
      }
      setProfiles(Object.fromEntries(people.map((item) => [item.id, { username: item.username, display_name: item.display_name }])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load moderation queue.");
    } finally {
      if (append) setLoadingMore(false);
      else { setLoading(false); setChecking(false); }
    }
  }, []);

  const loadMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    await load(true);
  };

  useEffect(() => { void load(); }, [load]);

  const openCase = async (item: CaseRow) => {
    setSelectedId(item.id); setReason(""); setLabelValue(""); setError(""); setNotice(""); setAssignee(item.assigned_to ?? "");
    const supabase = createClient();
    const { data, error: actionError } = await supabase.from("moderation_actions")
      .select("id, action, reason, actor_id, created_at").eq("case_id", item.id).order("created_at", { ascending: false });
    if (actionError) setError(actionError.message);
    else setActions((data ?? []) as ActionRow[]);
  };

  async function assignCase() {
    if (!selected || userRole !== "admin" || !assignee || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("staff_decide_case", { p_case_id: selected.id, p_action: "assign", p_reason: reason.trim().length >= 5 ? reason.trim() : "Case assignment by administrator.", p_label_value: null, p_assign_to: assignee });
      if (rpcError) throw rpcError;
      setNotice("Case assigned. Assignment was recorded in the audit trail.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not assign this case."); }
    finally { setSaving(false); }
  }

  async function decide(action: string) {
    if (!selected || saving) return;
    if (reason.trim().length < 5) { setError("Add a decision reason of at least 5 characters."); return; }
    if (action === "correct" && !labelValue.trim()) { setError("Enter the corrected label value."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: decisionError } = await supabase.rpc("staff_decide_case", {
        p_case_id: selected.id, p_action: action, p_reason: reason.trim(),
        p_label_value: action === "correct" ? labelValue.trim() : null, p_assign_to: null,
      });
      if (decisionError) throw decisionError;
      setNotice("Decision saved and audit trail updated.");
      setReason(""); setLabelValue("");
      await load();
      const { data } = await supabase.from("moderation_actions").select("id, action, reason, actor_id, created_at")
        .eq("case_id", selected.id).order("created_at", { ascending: false });
      setActions((data ?? []) as ActionRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this decision.");
    } finally { setSaving(false); }
  }

  if (checking) return <main className="flex min-h-screen items-center justify-center gap-2 bg-[#f5f6fb] text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Checking staff access...</main>;
  if (!authorized) return <main className="min-h-screen bg-[#f5f6fb] px-4 py-16 text-slate-900"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><ShieldCheck size={30} className="mx-auto text-indigo-600" /><h1 className="mt-3 text-2xl font-black">Staff access required</h1><p className="mt-2 text-sm text-slate-500">The moderation workspace is available only to moderators and administrators.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"><ArrowLeft size={16} /> Back to Verity</Link></section></main>;

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to feed</Link>
        <Link href="/" className="text-lg font-black tracking-tight">Verity<span className="text-indigo-600">.</span></Link>
      </header>
      <section className="mx-auto max-w-7xl pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="flex items-center gap-2 text-indigo-600"><ShieldCheck size={19} /><span className="text-xs font-extrabold uppercase tracking-wider">Trust & safety</span></div><h1 className="mt-2 text-3xl font-black tracking-tight">Moderation queue</h1><p className="mt-2 text-sm text-slate-500">Review reports and appeals, record decisions, and preserve an audit trail.</p></div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh queue</button>
        </div>
        {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
        <div className="mt-6 flex flex-wrap gap-2">{[["active","Active"],["mine","Assigned to me"],["unassigned","Unassigned"],["awaiting_review","Awaiting review"],["under_review","Under review"],["awaiting_information","Awaiting information"],["resolved","Resolved"],["all","All cases"]].map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-xs font-bold ${filter === value ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200"}`}>{label}</button>)}</div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="space-y-3">
            {filteredCases.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{loading ? "Loading cases..." : "No cases in this view."}</div> : filteredCases.map((item) => {
              const reportCount = reports.filter((report) => report.case_id === item.id).length;
              const appealCount = appeals.filter((appeal) => appeal.case_id === item.id).length;
              return <button key={item.id} type="button" onClick={() => void openCase(item)} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${selectedId === item.id ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 bg-white hover:border-indigo-200"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-extrabold uppercase tracking-wide text-indigo-700">{item.case_type.replace("_"," ")}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase ${priorityStyles[item.priority] ?? priorityStyles.normal}`}>{item.priority}</span></div>
                <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">{item.summary || "Review case"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span>{statusLabels[item.status] ?? item.status}</span><span>{item.assigned_to ? `Assigned: @${profiles[item.assigned_to]?.username || "staff"}` : "Unassigned"}</span>{item.needs_second_review && <span className="font-bold text-rose-700">Second review</span>}<span>{reportCount} reports</span><span>{appealCount} appeals</span><span className="inline-flex items-center gap-1"><Clock3 size={12} />Due {new Date(item.due_at).toLocaleDateString()}</span></div>
              </button>;
            })}
            {hasMore && <div className="flex justify-center pt-2"><button type="button" onClick={() => void loadMore()} disabled={loadingMore || loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50">{loadingMore && <LoaderCircle size={14} className="animate-spin" />}{loadingMore ? "Loading more cases..." : "Load older cases"}</button></div>}
          </section>
          <section className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {!selected ? <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center"><ClipboardList size={34} className="text-slate-300" /><h2 className="mt-3 font-extrabold">Select a case</h2><p className="mt-1 max-w-sm text-sm text-slate-500">Case evidence, linked reports, appeals, and previous decisions will appear here.</p></div> : <>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">{selected.case_type.replace("_"," ")} · {selected.id.slice(0,8)}</p><h2 className="mt-1 text-xl font-black">{selected.summary || "Moderation case"}</h2><p className="mt-1 text-xs text-slate-500">Opened {new Date(selected.created_at).toLocaleString()} · {statusLabels[selected.status] ?? selected.status}</p></div><span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${priorityStyles[selected.priority] ?? priorityStyles.normal}`}>{selected.priority}</span></div>
              {selected.post_id && posts[selected.post_id] && <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs font-extrabold uppercase text-slate-500">Related post · {posts[selected.post_id].status}</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold">{posts[selected.post_id].title || posts[selected.post_id].body.slice(0,1000)}</p>{posts[selected.post_id].removal_reason && <p className="mt-2 text-xs text-rose-700">Moderation note: {posts[selected.post_id].removal_reason}</p>}</div>}
              {selected.label_id && labels[selected.label_id] && <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><p className="text-xs font-extrabold uppercase text-indigo-700">Label under review · {labels[selected.label_id].dimension}</p><p className="mt-1 text-sm font-bold">{labels[selected.label_id].value}</p><p className="mt-1 text-xs text-slate-600">{labels[selected.label_id].basis} · {labels[selected.label_id].status}</p>{labels[selected.label_id].explanation && <p className="mt-2 text-sm text-slate-600">{labels[selected.label_id].explanation}</p>}</div>}
               {selectedChecks.map((check) => <div key={check.id} className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold uppercase text-violet-800">Automated {check.check_type.replace("_", " ")} · {check.provider}</p><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase text-violet-800">{check.status.replaceAll("_", " ")}</span></div>{check.explanation && <p className="mt-2 text-sm text-slate-800">{check.explanation}</p>}{check.uncertainty && <p className="mt-2 text-xs leading-5 text-slate-600">{check.uncertainty}</p>}<p className="mt-2 text-[10px] text-slate-500">{new Date(check.created_at).toLocaleString()}</p></div>)}
              {selectedReports.map((item) => <div key={item.id} className="mt-3 rounded-xl border border-slate-200 p-4"><p className="text-xs font-extrabold uppercase text-slate-500">Report · {item.target_type} · {item.reason}</p><p className="mt-1 text-sm">{item.details || "No additional details supplied."}</p><p className="mt-2 text-xs text-slate-500">Reported by @{profiles[item.reporter_id]?.username || "member"} · {item.status}</p></div>)}
              {selectedAppeals.map((item) => <div key={item.id} className="mt-3 rounded-xl border border-slate-200 p-4"><p className="text-xs font-extrabold uppercase text-slate-500">Appeal · {item.status}</p><p className="mt-1 text-sm">{item.reason}</p>{item.evidence && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{item.evidence}</p>}<p className="mt-2 text-xs text-slate-500">Submitted by @{profiles[item.appellant_id]?.username || "member"}</p></div>)}
              <div className="mt-5 border-t border-slate-100 pt-5"><h3 className="text-sm font-extrabold">Decision & case controls</h3>
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><p><strong>Assigned reviewer:</strong> {selected.assigned_to ? `@${profiles[selected.assigned_to]?.username || "staff"}` : "Not assigned"}</p>{selected.needs_second_review && <p className="mt-1 font-bold text-rose-700">Independent second review required. Original reviewer: {selected.second_review_requested_by ? `@${profiles[selected.second_review_requested_by]?.username || "staff"}` : "Not recorded"}.</p>}</div>
                {userRole === "admin" && selected.status !== "resolved" && <div className="mt-3 flex flex-wrap gap-2"><select aria-label="Assign reviewer" value={assignee} onChange={(event) => setAssignee(event.target.value)} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="">Select reviewer</option>{Object.entries(profiles).filter(([id]) => id !== selected.second_review_requested_by || !selected.needs_second_review).map(([id, person]) => <option key={id} value={id}>@{person.username} · {person.display_name}</option>)}</select><button type="button" onClick={() => void assignCase()} disabled={saving || !assignee} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Assign case</button></div>}
                <p className="mt-3 text-xs text-slate-500">Only the assigned reviewer can act on this case. Admins can assign or reassign reviewers.</p><label className="mt-3 block text-xs font-bold text-slate-600">Reason for decision<textarea rows={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Document the evidence and rationale (minimum 5 characters)." className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" /></label>
                {selected.label_id && <label className="mt-3 block text-xs font-bold text-slate-600">Corrected label value<input value={labelValue} onChange={(event) => setLabelValue(event.target.value)} maxLength={100} placeholder="Enter the exact value from the label taxonomy" className="mt-2 min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void decide("start_review")} disabled={saving} className="rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">Start review</button>
                  <button type="button" onClick={() => void decide("request_info")} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-700 disabled:opacity-50">Request information</button>
                  <button type="button" onClick={() => void decide("escalate")} disabled={saving} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-extrabold text-amber-800 disabled:opacity-50">Escalate</button>
                  {selected.label_id && <><button type="button" onClick={() => void decide("confirm")} disabled={saving} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-extrabold text-emerald-800 disabled:opacity-50">Confirm label</button><button type="button" onClick={() => void decide("correct")} disabled={saving} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-extrabold text-indigo-800 disabled:opacity-50">Correct label</button><button type="button" onClick={() => void decide("mark_unresolved")} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-700 disabled:opacity-50">Mark unresolved</button><button type="button" onClick={() => void decide("remove_label")} disabled={saving} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-extrabold text-rose-800 disabled:opacity-50">Remove label</button></>}
                  {selected.post_id && <><button type="button" onClick={() => void decide("restore_post")} disabled={saving} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-extrabold text-emerald-800 disabled:opacity-50">Restore post</button><button type="button" onClick={() => void decide("restrict_post")} disabled={saving} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-extrabold text-amber-800 disabled:opacity-50">Restrict post</button><button type="button" onClick={() => void decide("remove_post")} disabled={saving} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-extrabold text-rose-800 disabled:opacity-50">Remove post</button></>}
                  <button type="button" onClick={() => void decide("dismiss")} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-600 disabled:opacity-50">Dismiss</button>
                </div>
                {saving && <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500"><LoaderCircle size={14} className="animate-spin" />Saving decision...</p>}
              </div>
              <div className="mt-5 border-t border-slate-100 pt-5"><h3 className="text-sm font-extrabold">Decision history</h3>{actions.length === 0 ? <p className="mt-2 text-xs text-slate-500">No decisions recorded yet.</p> : <div className="mt-3 space-y-3">{actions.map((item) => <div key={item.id} className="flex gap-3"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /><div><p className="text-xs font-bold">{item.action.replaceAll("_"," ")}</p><p className="mt-1 text-xs text-slate-600">{item.reason}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString()}</p></div></div>)}</div>}</div>
            </>}
          </section>
        </div>
      </section>
    </main>
  );
}
