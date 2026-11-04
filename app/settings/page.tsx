"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Bell, LoaderCircle, Save, ShieldCheck, UserRound, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  interests: string[] | null;
  show_memberships: boolean;
};

type Preferences = {
  follows: boolean;
  comments: boolean;
  mentions: boolean;
  communities: boolean;
  answers: boolean;
  support: boolean;
  moderation: boolean;
};

const preferenceItems: Array<{ key: keyof Preferences; title: string; description: string }> = [
  { key: "follows", title: "New followers", description: "When someone follows your profile." },
  { key: "comments", title: "Comments and replies", description: "When someone responds to your posts or comments." },
  { key: "mentions", title: "Mentions", description: "When someone mentions you in a conversation." },
  { key: "communities", title: "Community activity", description: "Updates related to communities you participate in." },
  { key: "answers", title: "Question answers", description: "When someone answers a question you asked." },
  { key: "support", title: "Support updates", description: "Replies and status updates on your support tickets." },
  { key: "moderation", title: "Trust and safety", description: "Updates about reports, appeals and moderation decisions." },
];

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    follows: true, comments: true, mentions: true, communities: true,
    answers: true, support: true, moderation: true,
  });
  const [interestText, setInterestText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        window.location.href = "/login?next=%2Fsettings";
        return;
      }
      setUserId(auth.user.id);
      const [{ data: profileData, error: profileError }, { data: settingsData, error: settingsError }] = await Promise.all([
        supabase.from("profiles").select("username, display_name, bio, avatar_url, interests, show_memberships").eq("id", auth.user.id).single(),
        supabase.from("user_settings").select("notification_prefs").eq("user_id", auth.user.id).single(),
      ]);
      if (profileError) throw profileError;
      if (settingsError) throw settingsError;
      setProfile(profileData as Profile);
      setInterestText((profileData.interests ?? []).join(", "));
      setPreferences({ ...preferences, ...(settingsData.notification_prefs ?? {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load account settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !profile || saving) return;
    const username = profile.username.trim().toLowerCase();
    const interests = [...new Set(interestText.split(",").map((item) => item.trim()).filter(Boolean))];
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setError("Username must be 3–24 characters and use only lowercase letters, numbers or underscores.");
      return;
    }
    if (interests.length > 12 || interests.some((item) => item.length > 40)) {
      setError("Add up to 12 interests, each no longer than 40 characters.");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: profileError } = await supabase.from("profiles").update({
        username,
        display_name: profile.display_name.trim(),
        bio: profile.bio?.trim() || null,
        interests,
        show_memberships: profile.show_memberships,
      }).eq("id", userId);
      if (profileError) throw profileError;
      const { error: prefsError } = await supabase.from("user_settings")
        .update({ notification_prefs: preferences }).eq("user_id", userId);
      if (prefsError) throw prefsError;
      setProfile({ ...profile, username, display_name: profile.display_name.trim(), bio: profile.bio?.trim() || null, interests });
      setInterestText(interests.join(", "));
      setNotice("Your profile and notification preferences have been saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your settings.";
      setError(message.includes("profiles_username_key") || message.includes("duplicate key") ? "That username is already taken. Choose another one." : message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file || !userId || !profile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPG, PNG or WebP image for your profile photo."); return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Profile photos must be 3 MB or smaller."); return;
    }
    setUploading(true); setError(""); setNotice("");
    const supabase = createClient();
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = userId + "/avatars/" + crypto.randomUUID() + "." + extension;
    try {
      const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      const avatarUrl = data.publicUrl;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
      if (updateError) {
        await supabase.storage.from("post-media").remove([path]);
        throw updateError;
      }
      setProfile({ ...profile, avatar_url: avatarUrl });
      setNotice("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload your profile photo.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center gap-2 bg-[#f5f6fb] text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Loading settings...</main>;

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-3xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to feed</Link>
        <Link href="/" className="text-lg font-black tracking-tight">Verity<span className="text-indigo-600">.</span></Link>
      </header>
      <section className="mx-auto max-w-3xl pt-8">
        <div className="flex items-center gap-2 text-indigo-600"><ShieldCheck size={19} /><span className="text-xs font-extrabold uppercase tracking-wider">Account</span></div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your public profile and the activity you hear about.</p>
        {error && <div role="alert" className="mt-5 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
        {!profile ? <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Your profile settings could not be loaded. Try refreshing the page.</div> : (
          <form onSubmit={(event) => void saveProfile(event)} className="mt-6 space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2"><UserRound size={18} className="text-indigo-600" /><h2 className="font-extrabold">Public profile</h2></div>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile" className="h-20 w-20 rounded-2xl border border-slate-200 object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-black text-indigo-700">{profile.display_name.slice(0,1).toUpperCase()}</div>}
                <div><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:border-indigo-300"><ImagePlus size={16} />{uploading ? "Uploading..." : "Change photo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void uploadAvatar(file); }} /></label><p className="mt-2 text-xs text-slate-400">JPG, PNG or WebP · maximum 3 MB</p></div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold">Display name<input required minLength={1} maxLength={60} value={profile.display_name} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm" /></label>
                <label className="block text-sm font-bold">Username<input required minLength={3} maxLength={24} value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm" /><span className="mt-1 block text-xs font-normal text-slate-400">Your public profile: /u/{profile.username || "username"}</span></label>
              </div>
              <label className="mt-4 block text-sm font-bold">Bio<textarea rows={3} maxLength={300} value={profile.bio ?? ""} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="A little about you..." className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base font-normal leading-6 outline-none focus:border-indigo-400 sm:text-sm" /></label>
              <label className="mt-4 block text-sm font-bold">Interests<input value={interestText} onChange={(event) => setInterestText(event.target.value)} placeholder="Science, technology, media literacy" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm" /><span className="mt-1 block text-xs font-normal text-slate-400">Separate interests with commas. Up to 12.</span></label>
              <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={profile.show_memberships} onChange={(event) => setProfile({ ...profile, show_memberships: event.target.checked })} className="mt-0.5 h-4 w-4 accent-indigo-600" /><span><strong>Show my communities publicly</strong><span className="mt-1 block text-xs font-normal text-slate-500">Allow other members to see the communities you have joined.</span></span></label>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2"><Bell size={18} className="text-indigo-600" /><h2 className="font-extrabold">Notification preferences</h2></div>
              <p className="mt-1 text-xs text-slate-500">Turn off categories you do not want in your notification center.</p>
              <div className="mt-4 divide-y divide-slate-100">{preferenceItems.map((item) => <label key={item.key} className="flex cursor-pointer items-start justify-between gap-4 py-4"><span><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span></span><input type="checkbox" checked={preferences[item.key]} onChange={(event) => setPreferences((current) => ({ ...current, [item.key]: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" /></label>)}</div>
            </section>
            <div className="flex justify-end"><button type="submit" disabled={saving || uploading} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Saving..." : "Save settings"}</button></div>
          </form>
        )}
      </section>
    </main>
  );
}
