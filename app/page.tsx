"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Bell,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Compass,
  FileSearch,
  Flag,
  Flame,
  Headphones,
  Heart,
  Home,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Trash2,
  Upload,
  Video as VideoIcon,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Category = "Discussion" | "Question" | "News" | "Meme";
type BadgeTone = "neutral" | "blue" | "violet" | "orange";

type DbPost = {
  id: string;
  author_id: string;
  community_id: string | null;
  type: string;
  title: string | null;
  body: string;
  link_url: string | null;
  source_url: string | null;
  declared_category: string | null;
  ai_disclosure: boolean;
  tags: string[] | null;
  status: string;
  created_at: string;
};

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  topic: string;
};


type SupportCategory =
  | "incorrect_ai_label"
  | "incorrect_misinformation_label"
  | "removed_post_appeal"
  | "harmful_content"
  | "impersonation_privacy"
  | "account_recovery"
  | "login_problem"
  | "technical_issue"
  | "general";

type SupportTicket = {
  id: string;
  ticket_number: number | string;
  category: SupportCategory;
  subject: string;
  status: string;
  priority: string;
  response_due_at: string;
  created_at: string;
};

type ReportReason =
  | "spam"
  | "harassment"
  | "misinformation"
  | "hate"
  | "violence"
  | "impersonation"
  | "privacy"
  | "copyright"
  | "incorrect_label"
  | "other";

type DbComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  display_name: string;
  username: string;
};

type DbPostMedia = {
  id: string;
  post_id: string;
  kind: "image" | "video";
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  position: number;
};

type FeedMedia = {
  id: string;
  kind: "image" | "video";
  url: string;
  mime_type: string;
  alt_text: string | null;
  position: number;
};

type FeedPost = {
  id: string;
  author_id: string;
  author: string;
  username: string;
  community_id: string | null;
  community: string;
  time: string;
  title: string;
  body: string;
  category: string;
  label: string;
  tone: BadgeTone;
  likes: number;
  comments: number;
  link_url: string | null;
  source_url: string | null;
  media: FeedMedia[];
};

const NAV_ITEMS = [
  { name: "Home", icon: Home },
  { name: "Explore", icon: Compass },
  { name: "Communities", icon: Users },
  { name: "Questions", icon: CircleHelp },
  { name: "Saved", icon: Bookmark },
  { name: "Notifications", icon: Bell },
  { name: "Settings", icon: ShieldCheck },
  { name: "Verify", icon: FileSearch },
  { name: "Support", icon: Headphones },
] as const;

const TRENDING_TOPICS = [
  "Artificial Intelligence",
  "Digital Literacy",
  "Science Explained",
];

function formatTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function getPostLabel(post: DbPost): { label: string; tone: BadgeTone; category: string } {
  const declared = (post.declared_category || "").toLowerCase();
  const tags = (post.tags || []).map((tag) => tag.toLowerCase());

  if (tags.includes("question")) {
    return { label: "Community question", tone: "blue", category: "question" };
  }
  if (post.ai_disclosure || declared === "ai_generated" || declared === "ai_edited") {
    return {
      label: post.ai_disclosure ? "Creator-declared AI" : declared === "ai_generated" ? "Declared AI-generated" : "Declared AI-edited",
      tone: "violet",
      category: declared || "discussion",
    };
  }
  if (declared === "meme" || declared === "satire" || declared === "parody") {
    const label = declared === "meme" ? "Creator-declared meme" : declared === "satire" ? "Satire" : "Parody";
    return { label, tone: "orange", category: declared };
  }
  if (declared === "educational") {
    return { label: "Educational", tone: "blue", category: declared };
  }
  if (declared === "news") {
    return { label: "News · not independently checked", tone: "neutral", category: declared };
  }
  return { label: "Not checked", tone: "neutral", category: declared || post.type || "discussion" };
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      // Avatar images are supplied by profile records; keep the fallback available.
      <img
        src={avatarUrl}
        alt={`${name} avatar`}
        className="h-11 w-11 shrink-0 rounded-2xl border border-white object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="verity-avatar flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold">
      {initials || "V"}
    </div>
  );
}

function ContentBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  const styles: Record<BadgeTone, string> = {
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
    blue: "bg-sky-50 text-sky-700 ring-sky-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
  };

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 ring-inset ${styles[tone]}`}>
      {tone === "violet" ? <Sparkles size={12} /> : tone === "orange" ? <span aria-hidden="true">☺</span> : tone === "blue" ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
      <span className="break-words">{label}</span>
    </span>
  );
}

function Artwork({ tone }: { tone: "violet" | "cyan" | "rose" }) {
  const designs = {
    violet: { colors: "from-violet-800 via-indigo-600 to-blue-500", title: "THE AI ERA", subtitle: "Creativity meets technology" },
    cyan: { colors: "from-cyan-800 via-teal-600 to-emerald-400", title: "STAY CURIOUS", subtitle: "Questions create knowledge" },
    rose: { colors: "from-rose-700 via-fuchsia-600 to-orange-400", title: "INTERNET CULTURE", subtitle: "Laugh. Learn. Repeat." },
  };
  const design = designs[tone];

  return (
    <div className={`verity-artwork relative mt-4 min-h-[155px] overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white sm:p-6 ${design.colors}`}>
      <div className="verity-orb verity-orb-one absolute -right-10 -top-12 h-44 w-44 rounded-full border border-white/25" />
      <div className="verity-orb verity-orb-two absolute right-6 top-8 h-28 w-28 rounded-full border border-white/25" />
      <div className="verity-art-glow absolute -bottom-16 right-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex min-h-[112px] flex-col justify-between">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/75"><Sparkles size={13} /> A thought worth sharing</span>
        <div>
          <h3 className="text-2xl font-black tracking-tight sm:text-3xl">{design.title}</h3>
          <p className="mt-1 text-sm text-white/85">{design.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function pageTitleFor(page: string) {
  if (page === "Explore") return "Discover something new.";
  if (page === "Communities") return "Find your people.";
  if (page === "Questions") return "Questions worth answering.";
  if (page === "Saved") return "Your saved posts.";
  return "Ideas worth your time.";
}

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, DbComment[]>>({});

  const [activePage, setActivePage] = useState<string>("Home");
  const [filter, setFilter] = useState("For you");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("Discussion");
  const [newCommunityId, setNewCommunityId] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newAiDisclosure, setNewAiDisclosure] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newAltText, setNewAltText] = useState("");
  const [mediaPreviews, setMediaPreviews] = useState<Array<{ file: File; url: string | null }>>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");

  const [membershipRoles, setMembershipRoles] = useState<Record<string, string>>({});
  const visibleNavItems = useMemo(() => isModerator ? [...NAV_ITEMS, { name: "Moderation", icon: ShieldCheck }] : [...NAV_ITEMS], [isModerator]);

  const [supportCategory, setSupportCategory] = useState<SupportCategory>("general");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDescription, setSupportDescription] = useState("");
  const [supportRelatedPostId, setSupportRelatedPostId] = useState("");
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportNotice, setSupportNotice] = useState("");
  const [requestedPostId, setRequestedPostId] = useState<string | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);

  const [reportingPost, setReportingPost] = useState<FeedPost | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("misinformation");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    const previews = newFiles.map((file) => ({
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setMediaPreviews(previews);
    return () => {
      previews.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [newFiles]);

  async function loadFeed() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const currentUser = authData.user ? { id: authData.user.id, email: authData.user.email } : null;
      setUser(currentUser);

      if (currentUser) {
        const { data: roleData } = await supabase.from("profiles").select("role").eq("id", currentUser.id).maybeSingle();
        setIsModerator(roleData?.role === "moderator" || roleData?.role === "admin");
        const { data: membershipData, error: membershipError } = await supabase
          .from("community_memberships")
          .select("community_id, role")
          .eq("user_id", currentUser.id);
        if (membershipError) throw membershipError;
        const roles: Record<string, string> = {};
        for (const row of membershipData ?? []) roles[row.community_id] = row.role;
        setMembershipRoles(roles);
      } else {
        setIsModerator(false);
        setMembershipRoles({});
      }

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("id, author_id, community_id, type, title, body, link_url, source_url, declared_category, ai_disclosure, tags, status, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);
      if (postError) throw postError;

      const rows = (postData ?? []) as unknown as DbPost[];
      const postIds = rows.map((row) => row.id);
      const authorIds = [...new Set(rows.map((row) => row.author_id))];
      const communityIds = [...new Set(rows.map((row) => row.community_id).filter((id): id is string => Boolean(id)))];

      let mediaRows: DbPostMedia[] = [];
      if (postIds.length) {
        const { data: postMediaData, error: postMediaError } = await supabase
          .from("post_media")
          .select("id, post_id, kind, storage_path, mime_type, size_bytes, alt_text, position")
          .in("post_id", postIds)
          .order("position", { ascending: true });
        if (postMediaError) throw postMediaError;
        mediaRows = (postMediaData ?? []) as DbPostMedia[];
      }

      const mediaMap = new Map<string, FeedMedia[]>();
      for (const media of mediaRows) {
        const { data: publicUrlData } = supabase.storage.from("post-media").getPublicUrl(media.storage_path);
        const feedMedia: FeedMedia = {
          id: media.id,
          kind: media.kind,
          url: publicUrlData.publicUrl,
          mime_type: media.mime_type,
          alt_text: media.alt_text,
          position: media.position,
        };
        mediaMap.set(media.post_id, [...(mediaMap.get(media.post_id) ?? []), feedMedia]);
      }

      let profiles: Profile[] = [];
      let communityRows: Community[] = [];
      let reactionRows: { post_id: string; user_id: string }[] = [];
      let commentRows: { post_id: string }[] = [];
      let myReactionRows: { post_id: string }[] = [];
      let myBookmarkRows: { post_id: string }[] = [];

      if (authorIds.length) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", authorIds);
        if (profileError) throw profileError;
        profiles = (data ?? []) as Profile[];
      }

      const { data: allCommunities, error: communitiesError } = await supabase
        .from("communities")
        .select("id, slug, name, description, topic")
        .order("name", { ascending: true })
        .limit(30);
      if (communitiesError) throw communitiesError;
      setCommunities((allCommunities ?? []) as Community[]);

      if (communityIds.length) {
        communityRows = (allCommunities ?? []).filter((community: Community) => communityIds.includes(community.id)) as Community[];
      }

      if (postIds.length) {
        const { data, error: reactionError } = await supabase
          .from("reactions")
          .select("post_id, user_id")
          .in("post_id", postIds)
          .limit(5000);
        if (reactionError) throw reactionError;
        reactionRows = (data ?? []) as { post_id: string; user_id: string }[];

        const { data: commentData, error: commentError } = await supabase
          .from("comments")
          .select("post_id")
          .eq("is_deleted", false)
          .in("post_id", postIds)
          .limit(5000);
        if (commentError) throw commentError;
        commentRows = (commentData ?? []) as { post_id: string }[];

        if (currentUser) {
          const { data: myReactionData, error: myReactionError } = await supabase
            .from("reactions")
            .select("post_id")
            .eq("user_id", currentUser.id)
            .in("post_id", postIds);
          if (myReactionError) throw myReactionError;
          myReactionRows = (myReactionData ?? []) as { post_id: string }[];

          const { data: bookmarkData, error: bookmarkError } = await supabase
            .from("bookmarks")
            .select("post_id")
            .eq("user_id", currentUser.id)
            .in("post_id", postIds);
          if (bookmarkError) throw bookmarkError;
          myBookmarkRows = (bookmarkData ?? []) as { post_id: string }[];
        }
      }

      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
      const communityMap = new Map(communityRows.map((community) => [community.id, community.name]));
      const reactionCounts = new Map<string, number>();
      const commentCounts = new Map<string, number>();

      for (const row of reactionRows) reactionCounts.set(row.post_id, (reactionCounts.get(row.post_id) ?? 0) + 1);
      for (const row of commentRows) commentCounts.set(row.post_id, (commentCounts.get(row.post_id) ?? 0) + 1);

      setPosts(rows.map((row) => {
        const profile = profileMap.get(row.author_id);
        const status = getPostLabel(row);
        return {
          id: row.id,
          author_id: row.author_id,
          author: profile?.display_name || profile?.username || "Community member",
          username: profile?.username || "member",
          community_id: row.community_id,
          community: row.community_id ? communityMap.get(row.community_id) || "Community" : "General",
          time: formatTime(row.created_at),
          title: row.title || "Untitled post",
          body: row.body,
          category: status.category,
          label: status.label,
          tone: status.tone,
          likes: reactionCounts.get(row.id) ?? 0,
          comments: commentCounts.get(row.id) ?? 0,
          link_url: row.link_url,
          source_url: row.source_url,
          media: mediaMap.get(row.id) ?? [],
        };
      }));

      setLiked(myReactionRows.map((row) => row.post_id));
      setSaved(myBookmarkRows.map((row) => row.post_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Verity. Check the Supabase configuration and policies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
    // Initial load only; explicit refreshes call loadFeed directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = posts.filter((post) => {
      const text = [post.author, post.username, post.community, post.title, post.body, post.label].join(" ").toLowerCase();
      if (query && !text.includes(query)) return false;
      if ((activePage === "Questions" || filter === "Questions") && post.category !== "question") return false;
      if (filter === "Discussions" && post.category === "question") return false;
      if (activePage === "Saved" && !saved.includes(post.id)) return false;
      if (filter === "Joined communities" && (!post.community_id || !membershipRoles[post.community_id])) return false;
      return true;
    });

    // Posts are initially loaded newest-first. For You uses current engagement as a simple, explainable ranking.
    if (filter === "For you") {
      return [...filtered].sort((a, b) => (b.likes * 2 + b.comments) - (a.likes * 2 + a.comments));
    }
    return filtered;
  }, [posts, search, activePage, filter, saved, membershipRoles]);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!newTitle.trim() && !newBody.trim() && newFiles.length === 0 && !newSourceUrl.trim()) {
      setError("Add a title, description, source link or media before publishing.");
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    if (newFiles.length > 4) {
      setError("You can upload up to 4 images, or one video, per post.");
      return;
    }

    const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const allowedVideoTypes = new Set(["video/mp4", "video/webm"]);
    const videos = newFiles.filter((file) => allowedVideoTypes.has(file.type));
    const images = newFiles.filter((file) => allowedImageTypes.has(file.type));

    if (newFiles.some((file) => !allowedImageTypes.has(file.type) && !allowedVideoTypes.has(file.type))) {
      setError("Use JPG, PNG, WebP or GIF images, or an MP4/WebM video.");
      return;
    }
    if (videos.length > 1 || (videos.length > 0 && images.length > 0)) {
      setError("Choose up to 4 images, or one video. Images and video cannot be mixed in the same post yet.");
      return;
    }
    if (images.some((file) => file.size > 8 * 1024 * 1024)) {
      setError("Each image must be 8 MB or smaller.");
      return;
    }
    if (videos.some((file) => file.size > 50 * 1024 * 1024)) {
      setError("The video must be 50 MB or smaller.");
      return;
    }

    let sourceUrl: string | null = null;
    if (newSourceUrl.trim()) {
      try {
        const parsed = new URL(newSourceUrl.trim());
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
        sourceUrl = parsed.toString();
      } catch {
        setError("Enter a valid source URL beginning with http:// or https://.");
        return;
      }
    }

    const categoryValue = newCategory === "News" ? "news" : newCategory === "Meme" ? "meme" : "original";
    const tags = newCategory === "Question" ? ["question"] : [];
    const postType = videos.length ? "video" : images.length ? "image" : newCategory === "News" && sourceUrl ? "link" : "text";

    setActionLoading(true);
    let supabaseClient: ReturnType<typeof createClient> | null = null;
    let createdPostId: string | null = null;
    const uploadedPaths: string[] = [];

    try {
      const supabase = createClient();
      supabaseClient = supabase;

      const { data: createdPost, error: insertError } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          community_id: newCommunityId || null,
          type: postType,
          title: newTitle.trim() || null,
          body: newBody.trim(),
          link_url: postType === "link" ? sourceUrl : null,
          source_url: sourceUrl,
          declared_category: categoryValue,
          ai_disclosure: newAiDisclosure,
          tags,
          status: "published",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      if (!createdPost?.id) throw new Error("The post was created, but its ID was not returned.");
      createdPostId = createdPost.id as string;

      const mediaRowsToInsert: Array<{
        post_id: string;
        kind: "image" | "video";
        storage_path: string;
        mime_type: string;
        size_bytes: number;
        alt_text: string | null;
        position: number;
      }> = [];

      for (const [index, file] of newFiles.entries()) {
        const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "upload";
        const path = `${user.id}/${createdPostId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw new Error(`Could not upload ${file.name}: ${uploadError.message}`);
        }

        uploadedPaths.push(path);
        mediaRowsToInsert.push({
          post_id: createdPostId,
          kind: file.type.startsWith("video/") ? "video" : "image",
          storage_path: path,
          mime_type: file.type,
          size_bytes: file.size,
          alt_text: file.type.startsWith("image/") ? newAltText.trim() || null : null,
          position: index,
        });
      }

      if (mediaRowsToInsert.length) {
        const { error: mediaInsertError } = await supabase
          .from("post_media")
          .insert(mediaRowsToInsert);
        if (mediaInsertError) throw mediaInsertError;
      }

      setCreateOpen(false);
      setNewTitle("");
      setNewBody("");
      setNewSourceUrl("");
      setNewCategory("Discussion");
      setNewCommunityId("");
      setNewAiDisclosure(false);
      setNewFiles([]);
      setNewAltText("");
      setActivePage("Home");
      setFilter("For you");
      setNotice("Your post was published.");
      await loadFeed();
    } catch (err) {
      if (supabaseClient) {
        if (uploadedPaths.length) {
          try {
            await supabaseClient.storage.from("post-media").remove(uploadedPaths);
          } catch {
            // Cleanup is best-effort; the original upload error is more useful.
          }
        }
        if (createdPostId) {
          try {
            await supabaseClient.from("posts").delete().eq("id", createdPostId);
          } catch {
            // Do not hide the original error if rollback is denied.
          }
        }
      }
      setError(err instanceof Error ? err.message : "Could not publish your post.");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleLike(postId: string) {
    setError("");
    if (!user) {
      router.push("/login");
      return;
    }

    const supabase = createClient();
    const alreadyLiked = liked.includes(postId);
    const result = alreadyLiked
      ? await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("reactions").insert({ post_id: postId, user_id: user.id });

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setLiked((current) => alreadyLiked ? current.filter((id) => id !== postId) : [...current, postId]);
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, likes: Math.max(0, post.likes + (alreadyLiked ? -1 : 1)) } : post));
  }

  async function toggleBookmark(postId: string) {
    setError("");
    if (!user) {
      router.push("/login");
      return;
    }

    const supabase = createClient();
    const alreadySaved = saved.includes(postId);
    const result = alreadySaved
      ? await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("bookmarks").insert({ user_id: user.id, post_id: postId });

    if (result.error) {
      setError(result.error.message);
      return;
    }
    setSaved((current) => alreadySaved ? current.filter((id) => id !== postId) : [...current, postId]);
  }

  async function loadComments(postId: string) {
    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from("comments")
      .select("id, post_id, author_id, body, created_at")
      .eq("post_id", postId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(100);

    if (queryError) {
      setError(`Could not load comments: ${queryError.message}`);
      return;
    }

    const rows = (data ?? []) as unknown as Omit<DbComment, "display_name" | "username">[];
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    let profileRows: Profile[] = [];

    if (authorIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", authorIds);
      if (profileError) {
        setError(`Could not load commenter profiles: ${profileError.message}`);
        return;
      }
      profileRows = (profiles ?? []) as Profile[];
    }

    const profileMap = new Map(profileRows.map((profile) => [profile.id, profile]));
    setCommentsByPost((current) => ({
      ...current,
      [postId]: rows.map((row) => {
        const profile = profileMap.get(row.author_id);
        return { ...row, display_name: profile?.display_name || "Community member", username: profile?.username || "member" };
      }),
    }));
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    setError("");
    if (!commentDraft.trim()) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: user.id,
      body: commentDraft.trim(),
      is_deleted: false,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCommentDraft("");
    await Promise.all([loadComments(postId), loadFeed()]);
  }

  async function toggleCommunityMembership(communityId: string) {
    setError("");
    setNotice("");
    if (!user) {
      router.push("/login");
      return;
    }

    const currentRole = membershipRoles[communityId];
    if (currentRole === "owner") {
      setNotice("Community owners cannot leave their own community.");
      return;
    }

    const supabase = createClient();
    const result = currentRole
      ? await supabase.from("community_memberships").delete().eq("community_id", communityId).eq("user_id", user.id)
      : await supabase.from("community_memberships").insert({ community_id: communityId, user_id: user.id, role: "member" });

    if (result.error) {
      setError(result.error.message.includes("duplicate")
        ? "You have already joined this community. Refresh and try again."
        : result.error.message);
      return;
    }

    setMembershipRoles((current) => {
      const next = { ...current };
      if (currentRole) delete next[communityId];
      else next[communityId] = "member";
      return next;
    });
    setNotice(currentRole ? "You left the community." : "You joined the community.");
  }

  async function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportError("");
    if (!reportingPost) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (reportDetails.trim().length > 2000) {
      setReportError("Details must be 2,000 characters or fewer.");
      return;
    }

    setReportSubmitting(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: "post",
        target_id: reportingPost.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error("You already reported this post. Our team can review the existing report.");
        }
        throw insertError;
      }

      setNotice("Report submitted to the Verity review queue. Thank you for helping keep the community safe.");
      setReportingPost(null);
      setReportReason("misinformation");
      setReportDetails("");
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Could not submit this report.");
    } finally {
      setReportSubmitting(false);
    }
  }

  async function loadSupportTickets() {
    if (!user) {
      setSupportTickets([]);
      return;
    }

    setSupportLoading(true);
    setSupportError("");
    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, category, subject, status, priority, response_due_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (queryError) throw queryError;
      setSupportTickets((data ?? []) as SupportTicket[]);
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : "Could not load your support tickets.");
    } finally {
      setSupportLoading(false);
    }
  }

  async function handleSupportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSupportError("");
    setSupportNotice("");

    if (!user) {
      router.push("/login");
      return;
    }
    const subject = supportSubject.trim();
    const description = supportDescription.trim();
    if (subject.length < 5 || subject.length > 150) {
      setSupportError("Subject must be between 5 and 150 characters.");
      return;
    }
    if (description.length < 20 || description.length > 5000) {
      setSupportError("Description must be between 20 and 5,000 characters.");
      return;
    }

    setSupportSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          category: supportCategory,
          subject,
          description,
          related_post_id: supportRelatedPostId || null,
        })
        .select("ticket_number")
        .single();
      if (insertError) throw insertError;

      setSupportSubject("");
      setSupportDescription("");
      setSupportRelatedPostId("");
      setSupportNotice(`Support request ${data?.ticket_number ? `#${data.ticket_number}` : ""} was submitted. Track its status below.`);
      await loadSupportTickets();
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : "Could not submit your support request.");
    } finally {
      setSupportSubmitting(false);
    }
  }

  useEffect(() => {
    if (activePage === "Support" && user?.id) void loadSupportTickets();
    // Support cases are private to the signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, user?.id]);

  async function handleSignOut() {
    setError("");
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    setNotice("You have signed out.");
    setUser(null);
    setLiked([]);
    setSaved([]);
    await loadFeed();
    router.refresh();
  }

  const filteredCommunities = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return communities;
    return communities.filter((community) => `${community.name} ${community.description} ${community.topic}`.toLowerCase().includes(query));
  }, [communities, search]);

  return (
    <main className="verity-app min-h-[100dvh] pb-20 text-slate-900 lg:pb-0">
      <header className="verity-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[70px] max-w-[1680px] items-center gap-3 px-4 sm:gap-4 sm:px-6 xl:px-8">
          <button
            type="button"
            onClick={() => { setActivePage("Home"); setMobileMenuOpen(false); }}
            className="flex shrink-0 items-center gap-2.5 rounded-xl text-left"
            aria-label="Verity home"
          >
            <span className="verity-logo flex h-10 w-10 items-center justify-center rounded-[14px] text-white shadow-lg shadow-indigo-200"><ShieldCheck size={22} /></span>
            <span className="text-[23px] font-black tracking-tight">verity<span className="text-indigo-600">.</span></span>
          </button>

          <label className="verity-search ml-3 hidden max-w-[620px] flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 md:flex">
            <Search size={17} className="shrink-0 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ideas, communities and people..." className="w-full min-w-0 bg-transparent text-sm outline-none" aria-label="Search Verity" />
            <span className="hidden rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-400 lg:block">SEARCH</span>
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => router.push("/verify")} className="hidden min-h-10 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 sm:flex"><Sparkles size={16} /> Verify</button>
            {user ? (
              <>
                <span className="hidden max-w-48 truncate text-xs text-slate-500 lg:block">{user.email}</span>
                <button type="button" onClick={() => void handleSignOut()} className="min-h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="flex min-h-10 items-center rounded-xl px-2.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:px-3">Log in</Link>
                <Link href="/signup" className="flex min-h-10 items-center rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 sm:px-4">Join Verity <span className="ml-1">↗</span></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="verity-main-grid mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-5 px-4 sm:px-6 lg:grid-cols-[225px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[245px_minmax(0,1fr)_300px] xl:gap-7 xl:px-8">
        <aside className={`${mobileMenuOpen ? "verity-mobile-menu-open" : "verity-mobile-menu-closed"} verity-left-sidebar lg:sticky lg:top-[70px] lg:block lg:h-[calc(100dvh-70px)] lg:overflow-y-auto`}>
          <div className="py-5 lg:py-7">
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <Avatar name={user?.email || "Verity Community"} />
              <div className="min-w-0"><p className="truncate text-sm font-bold">{user ? "Welcome back" : "Welcome to Verity"}</p><p className="mt-0.5 text-xs text-slate-500">Ideas with context</p></div>
            </div>

            <button type="button" onClick={() => { setError(""); setCreateOpen(true); setMobileMenuOpen(false); }} className="verity-create-button flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white"><Plus size={18} /> Create a post</button>

            <p className="mb-3 mt-8 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Your space</p>
            <nav className="space-y-1">
              {visibleNavItems.map(({ name, icon: Icon }) => (
                <button key={name} type="button" onClick={() => { if (name === "Moderation") router.push("/moderation"); else if (name === "Verify") router.push("/verify"); else if (name === "Questions") router.push("/questions"); else if (name === "Notifications") router.push("/notifications"); else if (name === "Settings") router.push("/settings"); else setActivePage(name); setMobileMenuOpen(false); }} className={`verity-nav-link group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === name ? "verity-nav-active bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white hover:text-slate-900"}`}>
                  <Icon size={19} className={activePage === name ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-600"} />
                  <span className="flex-1">{name}</span>
                  {activePage === name && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                </button>
              ))}
            </nav>

            <div className="my-7 border-t border-slate-200" />
            <div className="verity-sidebar-card rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ShieldCheck size={20} /></div>
              <h3 className="mt-3 text-sm font-extrabold">Think before you share.</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">Explore evidence and context instead of relying on viral claims alone.</p>
              <button type="button" onClick={() => { router.push("/verify"); setMobileMenuOpen(false); }} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900">Explore trust tools <ArrowRight size={14} /></button>
            </div>
          </div>
        </aside>

        <section className="verity-feed-column min-w-0 py-5 sm:py-6">
          <label className="mb-4 flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 md:hidden"><Search size={17} className="shrink-0 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Verity..." className="w-full min-w-0 bg-transparent text-base outline-none" aria-label="Search posts" /></label>

          {activePage === "Verify" ? (
            <section className="verity-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><FileSearch size={25} /></div>
              <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Content context</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Check before you share.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">A reliable assessment distinguishes media origin from factual accuracy. This verification service is not live yet, so this form does not produce a verdict.</p>
              <form className="mt-7 space-y-3" onSubmit={(event) => { event.preventDefault(); setVerifyMessage(verifyUrl.trim() ? "Live verification is not connected yet. No claim has been verified." : "Enter a public URL first."); }}>
                <label className="block text-sm font-bold">Article or public post URL</label>
                <input type="url" value={verifyUrl} onChange={(event) => setVerifyUrl(event.target.value)} placeholder="https://example.com/article" className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm" />
                <button type="submit" className="min-h-12 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Prepare check</button>
              </form>
              {verifyMessage && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{verifyMessage}</p>}
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {["Identify the specific claim", "Find relevant evidence", "Separate origin from accuracy", "Allow human review"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-600"><CheckCircle2 size={17} className="shrink-0 text-indigo-600" />{item}</div>)}
              </div>
            </section>
          ) : activePage === "Support" ? (
            <section className="verity-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><Headphones size={25} /></div>
              <h1 className="mt-5 text-3xl font-black sm:text-4xl">How can we help?</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Submit a ticket to the Verity support team and follow its status. Standard review target is shown on each ticket; complex cases may take longer.</p>

              {!user ? (
                <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                  <p className="text-sm leading-6 text-indigo-950">Log in to create and track support tickets tied to your account.</p>
                  <div className="mt-4 flex flex-wrap gap-3"><Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700">Log in</Link><Link href="/signup" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700">Create account</Link></div>
                </div>
              ) : (
                <>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {[
                      ["incorrect_ai_label", "Incorrect AI label", "Challenge an AI-origin label."],
                      ["incorrect_misinformation_label", "Incorrect misinformation label", "Challenge a factual/context decision."],
                      ["removed_post_appeal", "Removed post appeal", "Ask for a moderation decision to be reviewed."],
                      ["harmful_content", "Report harmful content", "Report abuse or unsafe content."],
                      ["impersonation_privacy", "Privacy or impersonation", "Report an account or privacy concern."],
                      ["technical_issue", "Technical issue", "Tell us what is broken."],
                    ].map(([value, title, description]) => (
                      <button key={value} type="button" onClick={() => { setSupportCategory(value as SupportCategory); setSupportSubject(title); document.getElementById("verity-support-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={`rounded-2xl border p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 ${supportCategory === value ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200 bg-white"}`}>
                        <span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                      </button>
                    ))}
                  </div>

                  <form id="verity-support-form" onSubmit={(event) => void handleSupportSubmit(event)} className="mt-6 scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
                    <h2 className="text-lg font-extrabold">Create a support ticket</h2>
                    <label className="block text-sm font-bold">Category
                      <select value={supportCategory} onChange={(event) => setSupportCategory(event.target.value as SupportCategory)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-indigo-400 sm:text-sm">
                        <option value="incorrect_ai_label">Incorrect AI label</option>
                        <option value="incorrect_misinformation_label">Incorrect misinformation label</option>
                        <option value="removed_post_appeal">Removed post appeal</option>
                        <option value="harmful_content">Harmful content</option>
                        <option value="impersonation_privacy">Impersonation or privacy</option>
                        <option value="account_recovery">Account recovery</option>
                        <option value="login_problem">Login problem</option>
                        <option value="technical_issue">Technical issue</option>
                        <option value="general">General question</option>
                      </select>
                    </label>
                    <label className="block text-sm font-bold">Subject
                      <input required minLength={5} maxLength={150} value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} placeholder="Briefly describe the problem" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 py-3 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm" />
                    </label>
                    <label className="block text-sm font-bold">Details
                      <textarea required minLength={20} maxLength={5000} rows={5} value={supportDescription} onChange={(event) => setSupportDescription(event.target.value)} placeholder="Explain what happened and what you need help with (at least 20 characters)." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-base font-normal leading-6 outline-none focus:border-indigo-400 sm:text-sm" />
                    </label>
                    <label className="block text-sm font-bold">Related post (optional)
                      <select value={supportRelatedPostId} onChange={(event) => setSupportRelatedPostId(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm">
                        <option value="">No specific post</option>
                        {posts.map((post) => <option key={post.id} value={post.id}>{post.title.slice(0, 90)}</option>)}
                      </select>
                    </label>
                    {supportError && <p role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{supportError}</p>}
                    {supportNotice && <p role="status" className="break-words rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{supportNotice}</p>}
                    <button type="submit" disabled={supportSubmitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"><Send size={16} />{supportSubmitting ? "Submitting ticket..." : "Submit support ticket"}</button>
                  </form>

                  <div className="mt-8">
                    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Your tickets</h2><button type="button" onClick={() => void loadSupportTickets()} disabled={supportLoading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><Clock3 size={14} />Refresh</button></div>
                    {supportLoading ? <LoadingBox label="Loading your support tickets..." /> : supportError ? <p role="alert" className="mt-3 break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{supportError}</p> : supportTickets.length ? <div className="mt-3 space-y-3">{supportTickets.map((ticket) => <article key={ticket.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Ticket #{ticket.ticket_number}</p><h3 className="mt-1 break-words font-bold">{ticket.subject}</h3></div><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold capitalize text-slate-600">{ticket.status.replaceAll("_", " ")}</span></div><p className="mt-2 text-xs text-slate-500">Priority: {ticket.priority} · Submitted {formatTime(ticket.created_at)}</p><p className="mt-1 text-xs text-slate-500">Response target: {new Date(ticket.response_due_at).toLocaleString()}</p></article>)}</div> : <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center"><p className="font-bold">No support tickets yet</p><p className="mt-1 text-sm text-slate-500">When you submit a request, it will appear here.</p></div>}
                  </div>
                </>
              )}
            </section>
          ) : activePage === "Communities" ? (
            <>
              <div className="mb-6"><p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-600">Meet your people</p><h1 className="mt-2 text-3xl font-black tracking-tight">Communities worth joining.</h1><p className="mt-2 text-sm text-slate-500">Explore the communities currently in your database.</p></div>
              {loading ? <LoadingBox label="Loading communities..." /> : filteredCommunities.length ? <div className="grid gap-4 sm:grid-cols-2">{filteredCommunities.map((community, index) => <article key={community.id} className="verity-community-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${index % 3 === 0 ? "bg-gradient-to-br from-indigo-600 to-violet-500" : index % 3 === 1 ? "bg-gradient-to-br from-cyan-600 to-teal-400" : "bg-gradient-to-br from-rose-600 to-orange-400"}`}><Users size={22} /></div><p className="mt-4 text-xs font-bold uppercase tracking-wide text-indigo-600">{community.topic}</p><h2 className="mt-1 text-lg font-extrabold"><Link href={"/communities/" + encodeURIComponent(community.slug)} className="hover:text-indigo-700">{community.name}</Link></h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{community.description || "Join the discussion and share ideas with this community."}</p><Link href={"/communities/" + encodeURIComponent(community.slug)} className="mt-4 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800">/{community.slug} · View community →</Link><button type="button" onClick={() => void toggleCommunityMembership(community.id)} disabled={membershipRoles[community.id] === "owner"} className={`mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${membershipRoles[community.id] ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "bg-indigo-600 text-white hover:bg-indigo-700"} disabled:cursor-not-allowed disabled:opacity-60`}>{membershipRoles[community.id] === "owner" ? "Community owner" : membershipRoles[community.id] ? "Leave community" : "Join community"}</button></article>)}</div> : <EmptyState title="No communities found" body="Communities will appear here when they are created in Supabase." />}
            </>
          ) : (
            <>
              <section className="verity-hero relative isolate overflow-hidden rounded-[28px] p-6 text-white sm:p-8 lg:p-9">
                <div className="verity-hero-orb verity-hero-orb-a absolute -right-16 -top-24 h-72 w-72 rounded-full" />
                <div className="verity-hero-orb verity-hero-orb-b absolute -bottom-36 right-24 h-72 w-72 rounded-full" />
                <div className="verity-hero-ring absolute right-8 top-8 hidden h-40 w-40 rounded-full sm:block" />
                <div className="relative max-w-3xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.19em] text-indigo-100"><Sparkles size={13} /> A more thoughtful internet</span>
                  <h1 className="mt-6 text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">The internet is loud.<br /><span className="verity-gradient-text">Make sense of it.</span></h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Discover communities, exchange ideas, ask better questions, and explore the evidence behind what you see.</p>
                  <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
                    <button type="button" onClick={() => { setError(""); setCreateOpen(true); }} className="verity-hero-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold"><Plus size={17} /> Start a conversation</button>
                    <button type="button" onClick={() => router.push("/verify")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">Explore verification <ArrowUpRight size={16} /></button>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-xs text-slate-300"><span className="flex items-center gap-2"><Users size={15} className="text-cyan-300" /> Community first</span><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-violet-300" /> Evidence with context</span><span className="flex items-center gap-2"><LockKeyhole size={15} className="text-emerald-300" /> Trust by design</span></div>
                </div>
              </section>

              <div className="mb-5 mt-8 flex items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-600">Your daily dose of curiosity</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{pageTitleFor(activePage)}</h2><p className="mt-1.5 text-sm text-slate-500">Good conversations start with better questions.</p></div><button type="button" onClick={() => setCreateOpen(true)} className="hidden min-h-11 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 sm:flex"><Plus size={17} /> Post</button></div>

              <div className="mb-5 flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">{[{ name: "For you", icon: Sparkles }, { name: "Latest", icon: Clock3 }, { name: "Questions", icon: CircleHelp }, { name: "Discussions", icon: MessageCircle }, { name: "Joined communities", icon: Users }].map(({ name, icon: Icon }) => <button key={name} type="button" onClick={() => setFilter(name)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:text-sm ${filter === name ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={15} />{name}</button>)}</div>

              {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
              {error && <div role="alert" className="mb-4 break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</div>}

              <button type="button" onClick={() => { setError(""); setCreateOpen(true); }} className="verity-composer mb-5 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"><div className="verity-composer-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-indigo-700"><Sparkles size={20} /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-700">What is on your mind?</p><p className="mt-1 text-xs text-slate-400">Share an idea, ask a question or start a discussion...</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><ImagePlus size={18} /></span></button>

              <div className="mb-4 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3 text-xs leading-5 text-indigo-950"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-indigo-700" /><p><strong>Content with context.</strong> Labels reflect creator declarations or unverified status. Automated AI detection is not connected yet.</p></div>

              {loading ? <LoadingBox label="Loading posts from Supabase..." /> : visiblePosts.length === 0 ? <EmptyState title={search ? "No matching posts" : activePage === "Saved" ? "No saved posts yet" : filter === "Questions" || activePage === "Questions" ? "No questions yet" : "Your feed starts here"} body={search ? "Try another search or clear the search field." : activePage === "Saved" ? "Tap Save on any post to keep it here for later." : "No published posts were returned. Sign in and publish the first real post to your Verity community."} action={!search && activePage !== "Saved" ? () => { setError(""); setCreateOpen(true); } : undefined} /> : <div className="space-y-4">{visiblePosts.map((post) => {
                const isLiked = liked.includes(post.id);
                const isSaved = saved.includes(post.id);
                const postComments = commentsByPost[post.id] || [];
                const artTone = post.category.includes("meme") || post.category.includes("satire") || post.category.includes("parody") ? "rose" : post.category.includes("question") ? "cyan" : post.category.includes("ai") || post.category.includes("educational") ? "violet" : null;
                return <article key={post.id} className="verity-post-card overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm"><div className="p-5 sm:p-6"><div className="flex items-start gap-3"><Avatar name={post.author} /><div className="min-w-0 flex-1"><Link href={`/u/${encodeURIComponent(post.username)}`} className="block truncate text-sm font-extrabold hover:text-indigo-700">{post.author}</Link><div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400"><Link href={`/u/${encodeURIComponent(post.username)}`} className="hover:text-indigo-700">@{post.username}</Link><span>·</span><span>{post.time}</span></div><p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-indigo-600"><Users size={12} />{post.community}</p></div><button type="button" onClick={() => { setReportError(""); setReportDetails(""); setReportReason("misinformation"); setReportingPost(post); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-indigo-700" aria-label={`Report post by ${post.author}`} title="Report post"><Flag size={17} /></button></div>
                  <h3 className="mt-4 break-words text-[17px] font-extrabold leading-7 tracking-tight text-slate-900 sm:text-lg">{post.title}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{post.body}</p>
                  {artTone && <Artwork tone={artTone} />}
                  {post.media.length > 0 && <div className={`verity-post-media mt-4 grid gap-2 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{post.media.map((media) => media.kind === "video" ? <video key={media.id} controls playsInline preload="metadata" className="max-h-[560px] w-full rounded-2xl bg-slate-950 object-contain" aria-label="Post video"><source src={media.url} type={media.mime_type} />Your browser does not support HTML video.</video> : <img key={media.id} src={media.url} alt={media.alt_text || `Image shared by ${post.author}`} loading="lazy" className={`w-full rounded-2xl border border-slate-100 object-cover ${post.media.length === 1 ? "max-h-[560px]" : "aspect-square"}`} />)}</div>}
                  {post.link_url && <a href={post.link_url} target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><span className="break-all">Open linked content</span><ArrowUpRight size={15} className="shrink-0" /></a>}
                  {post.source_url && <a href={post.source_url} target="_blank" rel="noreferrer noopener" className="mt-3 block break-all text-xs text-slate-500 underline underline-offset-2 hover:text-indigo-700">Original source</a>}
                  <div className="mt-4 flex flex-wrap items-center gap-2"><ContentBadge label={post.label} tone={post.tone} /><button type="button" onClick={() => router.push(`/verify?post=${encodeURIComponent(post.id)}`)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><ShieldCheck size={13} /> Content context</button></div>
                  <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-3 sm:gap-5"><button type="button" onClick={() => void toggleLike(post.id)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-bold ${isLiked ? "text-rose-600" : "text-slate-500 hover:text-rose-600"}`} aria-label={isLiked ? "Unlike post" : "Like post"}><Heart size={18} fill={isLiked ? "currentColor" : "none"} />{post.likes}</button><button type="button" onClick={() => { const isOpening = openComments !== post.id; setOpenComments(isOpening ? post.id : null); if (isOpening) void loadComments(post.id); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-slate-500 hover:text-indigo-600"><MessageCircle size={18} />{post.comments}</button><button type="button" onClick={() => void toggleBookmark(post.id)} className={`ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-bold ${isSaved ? "text-indigo-700" : "text-slate-400 hover:text-indigo-700"}`} aria-label={isSaved ? "Remove bookmark" : "Bookmark post"}><Bookmark size={18} fill={isSaved ? "currentColor" : "none"} /><span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span></button><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/?post=${post.id}`); setNotice("Post link copied."); } catch { setNotice("Copy the current page URL from your browser."); } }} aria-label="Share post" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-indigo-700"><Share2 size={17} /></button></div>
                  {openComments === post.id && <div className="mt-4 border-t border-slate-100 pt-4"><form onSubmit={(event) => void handleAddComment(event, post.id)} className="flex gap-2"><input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Add a thoughtful comment..." aria-label="Write a comment" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-base outline-none focus:border-indigo-400 sm:text-sm" /><button type="submit" aria-label="Send comment" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><Send size={16} /></button></form>{postComments.map((comment) => <div key={comment.id} className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-700">{comment.display_name} <span className="font-normal text-slate-400">@{comment.username}</span></p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{comment.body}</p></div>)}{postComments.length === 0 && <p className="mt-4 text-sm text-slate-400">No comments yet. Start the conversation.</p>}</div>}
                </div></article>;
              })}</div>}

              <button type="button" onClick={() => void loadFeed()} disabled={loading} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-60"><Clock3 size={16} /> Refresh feed</button>
            </>
          )}
        </section>

        <aside className="verity-right-sidebar hidden space-y-5 py-6 xl:block">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="verity-trust-card p-5 text-white"><div className="flex items-center gap-2 text-xs font-bold text-indigo-100"><Activity size={15} /> THE VERITY DIFFERENCE</div><h2 className="mt-4 text-2xl font-black leading-tight">Curiosity is good.<br />Context is better.</h2><p className="mt-3 text-xs leading-6 text-indigo-100">Explore what is known, what is disputed and what still needs evidence.</p><button type="button" onClick={() => router.push("/verify")} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-extrabold text-indigo-900 hover:bg-indigo-50">Explore trust tools <ArrowUpRight size={15} /></button></div><div className="space-y-4 p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-violet-50 p-2 text-violet-700"><Sparkles size={18} /></div><div><h3 className="text-xs font-extrabold">Media origin</h3><p className="mt-1 text-xs leading-5 text-slate-500">Explore available signals about how content was created.</p></div></div><div className="flex items-start gap-3"><div className="rounded-xl bg-sky-50 p-2 text-sky-700"><FileSearch size={18} /></div><div><h3 className="text-xs font-extrabold">Evidence and sources</h3><p className="mt-1 text-xs leading-5 text-slate-500">Examine evidence behind specific factual claims.</p></div></div><div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Headphones size={18} /></div><div><h3 className="text-xs font-extrabold">Human review</h3><p className="mt-1 text-xs leading-5 text-slate-500">Request help when a label or moderation decision is wrong.</p></div></div></div></section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">Topics to explore</h2><Flame size={17} className="text-orange-500" /></div><div className="mt-4 space-y-2">{TRENDING_TOPICS.map((topic, index) => <button key={topic} type="button" onClick={() => { setSearch(topic); setActivePage("Explore"); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[10px] font-extrabold text-slate-500">0{index + 1}</span><span className="min-w-0 flex-1 text-sm font-bold">{topic}</span><ArrowUpRight size={15} className="text-slate-300" /></button>)}</div></section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Users size={20} /></div><h2 className="mt-3 text-sm font-extrabold">Better discussions start together.</h2><p className="mt-2 text-xs leading-6 text-slate-500">Find people who enjoy discussing, questioning and learning about ideas.</p><button type="button" onClick={() => setActivePage("Communities")} className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-extrabold text-indigo-700 hover:text-indigo-900">Browse communities <ArrowRight size={14} /></button></section>
          <div className="px-2 text-[11px] leading-6 text-slate-400"><div className="flex flex-wrap gap-x-3 gap-y-1"><Link href="/guidelines" className="hover:text-indigo-700">Guidelines</Link><Link href="/privacy" className="hover:text-indigo-700">Privacy</Link><Link href="/terms" className="hover:text-indigo-700">Terms</Link></div><p className="mt-2">Verity separates media origin from factual accuracy.</p></div>
        </aside>
      </div>

      <nav className="verity-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pt-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">{[{ name: "Home", icon: Home }, { name: "Explore", icon: Compass }, { name: "Create", icon: Plus }, { name: "Questions", icon: CircleHelp }, { name: "Support", icon: Headphones }].map(({ name, icon: Icon }) => <button key={name} type="button" onClick={() => { if (name === "Create") { setError(""); setCreateOpen(true); } else setActivePage(name); }} className={`flex min-h-12 flex-col items-center justify-center gap-1 py-1 text-[10px] font-bold ${activePage === name ? "text-indigo-700" : "text-slate-400"}`}><Icon size={20} />{name}</button>)}</nav>

      {createOpen && (
        <div
          className="verity-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionLoading) setCreateOpen(false);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="create-post-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Your community</p>
                <h2 id="create-post-title" className="mt-1 text-2xl font-black tracking-tight">Start a conversation.</h2>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} disabled={actionLoading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Close dialog"><X size={20} /></button>
            </div>

            {!user && <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-900">You need to log in to publish. <Link href="/login" className="font-bold underline">Log in</Link> or <Link href="/signup" className="font-bold underline">create an account</Link>.</div>}

            <form onSubmit={handleCreatePost} className="mt-6 space-y-4">
              <label className="block text-sm font-bold">Post type
                <select value={newCategory} onChange={(event) => setNewCategory(event.target.value as Category)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-indigo-400 sm:text-sm">
                  <option>Discussion</option><option>Question</option><option>News</option><option>Meme</option>
                </select>
              </label>

              <label className="block text-sm font-bold">Post to community
                <select value={newCommunityId} onChange={(event) => setNewCommunityId(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-indigo-400 sm:text-sm">
                  <option value="">General feed</option>
                  {communities.filter((community) => Boolean(membershipRoles[community.id])).map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
                </select>
                <span className="mt-1 block text-xs font-normal text-slate-500">Only communities you have joined are available here.</span>
              </label>

              <label className="block text-sm font-bold">Title <span className="font-normal text-slate-400">(optional for photo/video posts)</span>
                <input maxLength={300} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="What would you like to share?" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm" />
              </label>

              <label className="block text-sm font-bold">Caption or description
                <textarea rows={4} maxLength={20000} value={newBody} onChange={(event) => setNewBody(event.target.value)} placeholder="Add a caption, a question or useful context..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-base font-normal leading-6 outline-none focus:border-indigo-400 sm:text-sm" />
              </label>

              <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm"><ImagePlus size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">Add photos or a video</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Up to 4 images (8 MB each), or 1 MP4/WebM video (50 MB). JPG, PNG, WebP and GIF are supported.</p>
                  </div>
                </div>
                <input id="verity-post-media" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple onChange={(event) => {
                  const incoming = Array.from(event.currentTarget.files ?? []);
                  event.currentTarget.value = "";
                  setError("");
                  const allowedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
                  const allowedVideos = new Set(["video/mp4", "video/webm"]);
                  if (incoming.length > 4) { setError("Choose no more than 4 files."); return; }
                  if (incoming.some((file) => !allowedImages.has(file.type) && !allowedVideos.has(file.type))) { setError("Unsupported file. Use JPG, PNG, WebP, GIF, MP4 or WebM."); return; }
                  const selectedVideos = incoming.filter((file) => allowedVideos.has(file.type));
                  const selectedImages = incoming.filter((file) => allowedImages.has(file.type));
                  if (selectedVideos.length > 1 || (selectedVideos.length > 0 && selectedImages.length > 0)) { setError("Choose up to 4 images, or one video. Do not mix images and video in the same post yet."); return; }
                  if (selectedImages.some((file) => file.size > 8 * 1024 * 1024)) { setError("Each image must be 8 MB or smaller."); return; }
                  if (selectedVideos.some((file) => file.size > 50 * 1024 * 1024)) { setError("The video must be 50 MB or smaller."); return; }
                  setNewFiles(incoming);
                }} />
                <label htmlFor="verity-post-media" className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50">
                  <Upload size={16} /> Choose media from device
                </label>

                {mediaPreviews.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {mediaPreviews.map(({ file, url }, index) => <div key={`${file.name}-${file.size}-${index}`} className="relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {url ? <img src={url} alt={`Selected preview ${index + 1}`} className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center bg-slate-900 text-white"><VideoIcon size={30} /></div>}
                    <div className="p-2"><p className="truncate text-xs font-semibold">{file.name}</p><p className="text-[10px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(1)} MB</p></div>
                    <button type="button" onClick={() => setNewFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/80 text-white hover:bg-red-600" aria-label={`Remove ${file.name}`}><Trash2 size={14} /></button>
                  </div>)}
                </div>}

                {newFiles.some((file) => file.type.startsWith("image/")) && <label className="mt-4 block text-sm font-bold">Image description for accessibility (optional)
                  <input maxLength={500} value={newAltText} onChange={(event) => setNewAltText(event.target.value)} placeholder="Describe what the image shows" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm" />
                </label>}
              </div>

              <label className="block text-sm font-bold">Source URL (optional)
                <input type="url" value={newSourceUrl} onChange={(event) => setNewSourceUrl(event.target.value)} placeholder="https://example.com/article" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm" />
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-6"><input type="checkbox" checked={newAiDisclosure} onChange={(event) => setNewAiDisclosure(event.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600" /><span><strong>AI disclosure</strong><span className="block text-xs leading-5 text-slate-500">I used AI to generate or materially alter this content. This is a creator declaration, not a detector result.</span></span></label>

              {error && <p role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Uploads require the existing public `post-media` storage bucket and its own-folder upload policy. Live AI detection and fact-checking are not connected yet.</div>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setCreateOpen(false)} disabled={actionLoading} className="min-h-12 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                <button type="submit" disabled={actionLoading || !user} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{actionLoading ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={15} />}{actionLoading ? "Publishing..." : "Publish post"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {reportingPost && (
        <div className="verity-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !reportSubmitting) setReportingPost(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="report-post-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-600">Trust & safety</p><h2 id="report-post-title" className="mt-1 text-2xl font-black">Report this post</h2><p className="mt-2 break-words text-sm text-slate-500">{reportingPost.title}</p></div><button type="button" disabled={reportSubmitting} onClick={() => setReportingPost(null)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Close report dialog"><X size={20} /></button></div>
            {!user && <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">You must <Link href="/login" className="font-bold underline">log in</Link> to submit a report.</div>}
            <form onSubmit={(event) => void handleReportSubmit(event)} className="mt-5 space-y-4">
              <label className="block text-sm font-bold">Why are you reporting this post?
                <select value={reportReason} onChange={(event) => setReportReason(event.target.value as ReportReason)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-indigo-400 sm:text-sm">
                  <option value="spam">Spam</option><option value="harassment">Harassment</option><option value="misinformation">Potential misinformation</option><option value="hate">Hateful content</option><option value="violence">Violence</option><option value="impersonation">Impersonation</option><option value="privacy">Privacy concern</option><option value="copyright">Copyright concern</option><option value="incorrect_label">Incorrect content label</option><option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm font-bold">Additional details (optional)
                <textarea rows={4} maxLength={2000} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Add context that could help the review team." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-base font-normal leading-6 outline-none focus:border-indigo-400 sm:text-sm" />
              </label>
              {reportError && <p role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{reportError}</p>}
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Reports are reviewed under Verity's policies. Reporting does not automatically establish that a claim is false.</div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={reportSubmitting} onClick={() => setReportingPost(null)} className="min-h-12 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={reportSubmitting || !user} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"><Flag size={15} />{reportSubmitting ? "Submitting report..." : "Submit report"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function LoadingBox({ label }: { label: string }) {
  return <div className="flex min-h-48 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500"><LoaderCircle className="animate-spin text-indigo-600" size={22} />{label}</div>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: () => void }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><MessageCircle size={25} /></div><h3 className="mt-4 text-lg font-extrabold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{body}</p>{action && <button type="button" onClick={action} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"><Plus size={16} /> Create a post</button>}</div>;
}
