"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Send,
  Image as ImageIcon,
  X,
  Trash2,
  Search,
  Users,
  SquarePen,
} from "lucide-react";
import { createClient } from "../../supabase/client";
import UserProfileDialog from "./user-profile-dialog";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface ChatViewProps {
  userId: string;
  initialMatch?: any;
}

export default function ChatView({ userId, initialMatch }: ChatViewProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(
    initialMatch ? { kind: "dm", ...initialMatch } : null
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // New group dialog state.
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldScrollRef = useRef(false);
  const selectedConvRef = useRef(selectedConv);
  selectedConvRef.current = selectedConv;
  const matchesRef = useRef(matches);
  matchesRef.current = matches;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const formatMessageTime = (createdAt: string) => {
    const msgDate = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const time = msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (msgDate.toDateString() === today.toDateString()) return time;
    if (msgDate.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
    return `${msgDate.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
  };

  const resolveMatchIds = (match: { id: string; allMatchIds?: string[] }) => {
    if (match.allMatchIds?.length) return match.allMatchIds;
    const hit = matches.find(
      (m) => m.allMatchIds?.includes(match.id) || m.id === match.id
    );
    return hit?.allMatchIds?.length ? hit.allMatchIds : [match.id];
  };

  useEffect(() => {
    loadMatches();
    loadGroups();

    const onMatchRemoved = () => {
      loadMatches();
    };
    const onMatchRestored = () => {
      loadMatches();
    };
    window.addEventListener("match-removed", onMatchRemoved);
    window.addEventListener("match-restored", onMatchRestored);
    return () => {
      window.removeEventListener("match-removed", onMatchRemoved);
      window.removeEventListener("match-restored", onMatchRestored);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Bump sidebar unread dots when a message arrives in a conversation
  // that isn't currently open.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`unread-inbox:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as {
            sender_id?: string;
            match_id?: string | null;
            group_id?: string | null;
          };
          if (!row.sender_id || isOwnMessage(row.sender_id)) return;

          const open = selectedConvRef.current;
          if (open?.kind === "dm" && row.match_id) {
            const openMatch =
              matchesRef.current.find(
                (m) =>
                  m.id === open.id ||
                  m.allMatchIds?.includes(open.id) ||
                  m.otherId === open.otherId
              ) ?? open;
            const ids: string[] = openMatch.allMatchIds?.length
              ? openMatch.allMatchIds
              : [openMatch.id];
            if (ids.includes(row.match_id)) return;
          }
          if (open?.kind === "group" && row.group_id === open.id) return;

          if (row.group_id) {
            const known = groupsRef.current.some((g) => g.id === row.group_id);
            if (!known) return;
            setUnreadCounts((prev) => ({
              ...prev,
              [row.group_id!]: (prev[row.group_id!] || 0) + 1,
            }));
            return;
          }

          if (row.match_id) {
            const match = matchesRef.current.find(
              (m) =>
                m.id === row.match_id ||
                m.allMatchIds?.includes(row.match_id)
            );
            if (!match) return;
            setUnreadCounts((prev) => ({
              ...prev,
              [match.id]: (prev[match.id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (selectedConv?.kind !== "dm") return;
    const stillVisible = matches.some(
      (m) =>
        m.id === selectedConv.id ||
        m.allMatchIds?.includes(selectedConv.id) ||
        m.otherId === selectedConv.otherId
    );
    if (!stillVisible) {
      setSelectedConv(null);
      setMessages([]);
    }
  }, [matches, selectedConv]);

  useEffect(() => {
    if (initialMatch) {
      setSelectedConv({ kind: "dm", ...initialMatch });
    }
  }, [initialMatch]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv);
      if (selectedConv.kind === "dm") {
        markMessagesAsRead(resolveMatchIds(selectedConv));
      } else if (selectedConv.kind === "group") {
        markGroupMessagesAsRead(selectedConv.id);
      }
      const cleanup = subscribeToMessages(selectedConv);
      return cleanup;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConv?.kind, selectedConv?.id, matches]);

  useEffect(() => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      shouldScrollRef.current = false;
    }
  }, [messages]);

  const loadGroups = async () => {
    try {
      const res = await fetch("/api/groups", { credentials: "include" });
      const body = (await res.json().catch(() => ({}))) as { groups?: any[] };
      if (res.ok) {
        const next = body.groups ?? [];
        setGroups(next);
        setUnreadCounts((prev) => {
          const merged = { ...prev };
          next.forEach((g: any) => {
            merged[g.id] = g.unreadCount || 0;
          });
          return merged;
        });
      }
    } catch {
      /* non-blocking */
    }
  };

  const displayName = (otherUser: any) =>
    otherUser?.full_name ||
    otherUser?.email?.split("@")[0] ||
    "User";

  const loadMatches = async () => {
    const supabase = createClient();

    // Use the admin-backed matches API so other users' names resolve
    // (client RLS on public.users often returns null → "User").
    try {
      let apiMatches: any[] = [];
      try {
        const res = await fetch("/api/matches/me", {
          credentials: "include",
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          matches?: any[];
          error?: string;
        };
        if (res.ok) {
          apiMatches = body.matches ?? [];
        } else {
          console.error("Load matches error:", body.error);
        }
      } catch (e) {
        console.error("Load matches error:", e);
      }

      const matchDetails = await Promise.all(
        apiMatches.map(async (match) => {
          const matchIds: string[] = match.allMatchIds?.length
            ? match.allMatchIds
            : [match.id];

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .in("match_id", matchIds)
            .eq("read", false)
            .neq("sender_id", userId);

          const { data: lastRows } = await supabase
            .from("messages")
            .select("created_at")
            .in("match_id", matchIds)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMessageTime = lastRows?.[0]?.created_at ?? match.created_at;

          return {
            ...match,
            allMatchIds: matchIds,
            unreadCount: count || 0,
            lastMessageTime,
          };
        })
      );

      setMatches(matchDetails);

      // Keep the open DM header in sync once names arrive from the API.
      setSelectedConv((prev: any) => {
        if (!prev || prev.kind !== "dm") return prev;
        const updated = matchDetails.find(
          (m) =>
            m.id === prev.id ||
            m.otherId === prev.otherId ||
            m.allMatchIds?.includes(prev.id)
        );
        if (!updated) return prev;
        return {
          ...prev,
          ...updated,
          kind: "dm",
          name: displayName(updated.otherUser),
          avatarUrl: updated.otherUser?.profile_picture_url || null,
        };
      });

      setUnreadCounts((prev) => {
        const next = { ...prev };
        matchDetails.forEach((match) => {
          next[match.id] = match.unreadCount;
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const isOwnMessage = (senderId: string) =>
    (senderId || "").toLowerCase() === (userId || "").toLowerCase();

  const loadMessages = async (conv: any) => {
    const supabase = createClient();

    let query = supabase.from("messages").select("*");
    if (conv.kind === "group") {
      query = query.eq("group_id", conv.id);
    } else {
      const uniqueIds = Array.from(new Set(resolveMatchIds(conv)));
      query = query.in("match_id", uniqueIds);
    }

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      console.error("Load messages error:", error);
    } else {
      const sorted = [...(data || [])].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sorted);
      shouldScrollRef.current = true;
    }
  };

  const markMessagesAsRead = async (matchIds: string[]) => {
    const supabase = createClient();
    const uniqueIds = Array.from(new Set(matchIds));
    const primaryId = uniqueIds[0];

    await supabase
      .from("messages")
      .update({ read: true })
      .in("match_id", uniqueIds)
      .neq("sender_id", userId)
      .eq("read", false);

    setUnreadCounts((prev) => ({ ...prev, [primaryId]: 0 }));
  };

  const markGroupMessagesAsRead = async (groupId: string) => {
    const supabase = createClient();
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("group_id", groupId)
      .neq("sender_id", userId)
      .eq("read", false);

    setUnreadCounts((prev) => ({ ...prev, [groupId]: 0 }));
  };

  const subscribeToMessages = (conv: any) => {
    const supabase = createClient();

    const filters: string[] =
      conv.kind === "group"
        ? [`group_id=eq.${conv.id}`]
        : Array.from(new Set(resolveMatchIds(conv))).map(
            (id) => `match_id=eq.${id}`
          );

    const channelName = `messages:${conv.kind}:${conv.id}`;
    const channel = supabase.channel(channelName);

    const onInsert = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as {
        id: string;
        sender_id: string;
        created_at: string;
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev;
        shouldScrollRef.current = true;
        return [...prev, row].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      if (!isOwnMessage(row.sender_id)) {
        if (conv.kind === "dm") {
          markMessagesAsRead(resolveMatchIds(conv));
        } else if (conv.kind === "group") {
          markGroupMessagesAsRead(conv.id);
        }
      }
    };

    const onUpdate = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as { id: string };
      setMessages((prev) =>
        prev.map((m) => (m.id === row.id ? { ...m, ...row } : m))
      );
    };

    const onDelete = (payload: { old: Record<string, unknown> }) => {
      const row = payload.old as { id: string };
      setMessages((prev) => prev.filter((m) => m.id !== row.id));
    };

    for (const filter of filters) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter },
        onInsert
      );
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter },
        onUpdate
      );
      channel.on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter },
        onDelete
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          setSelectedImage(file);
          const reader = new FileReader();
          reader.onloadend = () => setImagePreview(reader.result as string);
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const supabase = createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-images").getPublicUrl(fileName);

    return publicUrl;
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedConv) return;

    shouldScrollRef.current = true;
    setUploading(true);
    const supabase = createClient();

    let imageUrl = null;
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) {
        setUploading(false);
        shouldScrollRef.current = false;
        alert("Failed to upload image. Please try again.");
        return;
      }
    }

    const messageData: Record<string, any> = {
      sender_id: userId,
      content: newMessage.trim(),
      image_url: imageUrl,
    };
    if (selectedConv.kind === "group") {
      messageData.group_id = selectedConv.id;
    } else {
      messageData.match_id = resolveMatchIds(selectedConv)[0];
    }

    const { error } = await supabase.from("messages").insert(messageData);

    if (error) {
      console.error("Send message error:", error);
      shouldScrollRef.current = false;
      alert("Failed to send message: " + error.message);
    } else {
      setNewMessage("");
      clearImage();
      const conv = selectedConv;
      const bumpTime = new Date().toISOString();
      if (conv.kind === "group") {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === conv.id ? { ...g, lastMessageTime: bumpTime } : g
          )
        );
      } else {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === conv.id || m.allMatchIds?.includes(conv.id)
              ? { ...m, lastMessageTime: bumpTime }
              : m
          )
        );
      }
      setTimeout(() => loadMessages(conv), 400);
    }
    setUploading(false);
  };

  const toggleReaction = async (message: any, emoji: string) => {
    const supabase = createClient();
    const current: Record<string, string[]> = message.reactions || {};
    const users = Array.isArray(current[emoji]) ? current[emoji] : [];
    const has = users.includes(userId);
    const nextUsers = has ? users.filter((u) => u !== userId) : [...users, userId];

    const next: Record<string, string[]> = { ...current };
    if (nextUsers.length) next[emoji] = nextUsers;
    else delete next[emoji];

    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, reactions: next } : m))
    );

    const { error } = await supabase
      .from("messages")
      .update({ reactions: next })
      .eq("id", message.id);

    if (error) {
      console.error("Reaction error:", error);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, reactions: current } : m))
      );
      alert("Failed to react: " + error.message);
    }
  };

  const deleteMessage = async (message: any) => {
    if (!window.confirm("Delete this message?")) return;
    const supabase = createClient();
    const prevMessages = messages;
    setMessages((prev) => prev.filter((m) => m.id !== message.id));

    const { error } = await supabase.from("messages").delete().eq("id", message.id);

    if (error) {
      console.error("Delete message error:", error);
      setMessages(prevMessages);
      alert("Failed to delete message: " + error.message);
    }
  };

  const createGroup = async () => {
    setGroupError(null);
    if (selectedMembers.length === 0) {
      setGroupError("Pick at least one person.");
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          memberIds: selectedMembers,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        group?: any;
        error?: string;
      };
      if (!res.ok) {
        setGroupError(body.error || "Failed to create group");
        return;
      }
      setGroupDialogOpen(false);
      setGroupName("");
      setSelectedMembers([]);
      setMemberSearch("");
      await loadGroups();
      const g = body.group;
      if (g) {
        setSelectedConv({
          kind: "group",
          id: g.id,
          name: g.name,
          members: (g.memberIds || []).map((uid: string) => {
            const m = matches.find((x) => x.otherId === uid);
            return {
              userId: uid,
              fullName:
                uid === userId ? "You" : m?.otherUser?.full_name || "User",
              avatarUrl: m?.otherUser?.profile_picture_url || null,
            };
          }),
        });
      }
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const conversations = useMemo(() => {
    const dm = matches.map((m) => ({
      kind: "dm" as const,
      id: m.id,
      otherId: m.otherId,
      otherUser: m.otherUser,
      allMatchIds: m.allMatchIds,
      name: displayName(m.otherUser),
      avatarUrl: m.otherUser?.profile_picture_url || null,
      lastMessageTime: m.lastMessageTime,
      unread: unreadCounts[m.id] || 0,
    }));

    const grp = groups.map((g) => {
      const others = (g.members || []).filter((x: any) => x.userId !== userId);
      const derivedName =
        g.name || others.map((x: any) => x.fullName).join(", ") || "Group";
      return {
        kind: "group" as const,
        id: g.id,
        name: derivedName,
        members: g.members || [],
        lastMessageTime: g.lastMessageTime,
        unread: unreadCounts[g.id] || 0,
      };
    });

    let all: any[] = [...dm, ...grp];
    const q = search.trim().toLowerCase();
    if (q) {
      all = all.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.kind === "group" &&
            c.members.some((m: any) =>
              (m.fullName || "").toLowerCase().includes(q)
            ))
      );
    }
    return all.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
    );
  }, [matches, groups, unreadCounts, search, userId]);

  const groupMemberMap: Record<string, any> = useMemo(() => {
    if (selectedConv?.kind !== "group") return {};
    return Object.fromEntries(
      (selectedConv.members || []).map((m: any) => [m.userId, m])
    );
  }, [selectedConv]);

  const isSelected = (conv: any) =>
    selectedConv &&
    selectedConv.kind === conv.kind &&
    (selectedConv.id === conv.id ||
      (conv.kind === "dm" && conv.allMatchIds?.includes(selectedConv.id)));

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !uploading) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading conversations...</div>;
  }

  return (
    <>
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-200 transition-colors"
          >
            <X className="h-6 w-6 text-gray-800" />
          </button>
          <img
            src={viewingImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 h-[600px]">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversations</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="New group chat"
                onClick={() => {
                  setGroupDialogOpen(true);
                  setGroupError(null);
                }}
              >
                <SquarePen className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name..."
                className="pl-8 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[460px]">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 px-4">
                  {search ? "No matches found." : "No conversations yet."}
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={`${conv.kind}:${conv.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedConv(conv)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedConv(conv);
                      }
                    }}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-accent transition-colors border-b relative cursor-pointer ${
                      isSelected(conv) ? "bg-blue-50 dark:bg-blue-950/40" : ""
                    }`}
                  >
                    {conv.kind === "group" ? (
                      <div className="relative shrink-0 h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center">
                        <Users className="h-5 w-5" />
                        {conv.unread > 0 && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <div className="h-2 w-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewProfileId(conv.otherId);
                        }}
                        className="relative shrink-0"
                        title="View profile"
                      >
                        <Avatar className="h-10 w-10">
                          {conv.avatarUrl && (
                            <AvatarImage src={conv.avatarUrl} alt={conv.name} />
                          )}
                          <AvatarFallback className="bg-blue-600 text-white">
                            {conv.name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        {conv.unread > 0 && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <div className="h-2 w-2 bg-white rounded-full" />
                          </div>
                        )}
                      </button>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      {conv.kind === "group" ? (
                        <p className="font-medium text-sm truncate flex items-center gap-1">
                          {conv.name}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewProfileId(conv.otherId);
                          }}
                          className="font-medium text-sm hover:text-blue-600 transition-colors truncate block max-w-full text-left"
                          title="View profile"
                        >
                          {conv.name}
                        </button>
                      )}
                      {conv.kind === "group" && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.members.length} members
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          {selectedConv ? (
            <>
              <CardHeader className="border-b">
                {selectedConv.kind === "group" ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">
                        {selectedConv.name ||
                          (selectedConv.members || [])
                            .filter((m: any) => m.userId !== userId)
                            .map((m: any) => m.fullName)
                            .join(", ")}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground truncate">
                        {(selectedConv.members || [])
                          .map((m: any) =>
                            m.userId === userId ? "You" : m.fullName
                          )
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewProfileId(selectedConv.otherId)}
                    className="flex items-center gap-3 text-left group"
                    title="View profile"
                  >
                    <Avatar className="h-10 w-10">
                      {(selectedConv.avatarUrl ||
                        selectedConv.otherUser?.profile_picture_url) && (
                        <AvatarImage
                          src={
                            selectedConv.avatarUrl ||
                            selectedConv.otherUser?.profile_picture_url
                          }
                          alt={
                            selectedConv.name ||
                            selectedConv.otherUser?.full_name
                          }
                        />
                      )}
                      <AvatarFallback className="bg-blue-600 text-white">
                        {(
                          selectedConv.name ||
                          selectedConv.otherUser?.full_name ||
                          "U"
                        )[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                        {selectedConv.name ||
                          displayName(selectedConv.otherUser)}
                      </CardTitle>
                    </div>
                  </button>
                )}
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[500px]">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const own = isOwnMessage(message.sender_id);
                      const reactionEntries = Object.entries(
                        (message.reactions || {}) as Record<string, string[]>
                      ).filter(([, users]) => Array.isArray(users) && users.length > 0);
                      const sender =
                        selectedConv.kind === "group"
                          ? groupMemberMap[message.sender_id]
                          : null;

                      return (
                        <div
                          key={message.id}
                          className={`group flex ${own ? "justify-end" : "justify-start"}`}
                        >
                          {selectedConv.kind === "group" && !own && (
                            <Avatar className="h-7 w-7 mr-2 mt-1 shrink-0">
                              {sender?.avatarUrl && (
                                <AvatarImage src={sender.avatarUrl} alt={sender?.fullName} />
                              )}
                              <AvatarFallback className="bg-blue-600 text-white text-xs">
                                {(sender?.fullName || "U")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`flex flex-col max-w-[70%] ${own ? "items-end" : "items-start"}`}>
                            {selectedConv.kind === "group" && !own && (
                              <span className="text-xs text-muted-foreground mb-0.5 ml-1">
                                {sender?.fullName || "User"}
                              </span>
                            )}
                            <div className="relative">
                              <div
                                className={`absolute top-1/2 -translate-y-1/2 z-20 hidden group-hover:flex items-center gap-1 rounded-full border bg-white dark:bg-gray-800 shadow-lg px-2 py-1.5 ${
                                  own ? "right-full mr-2" : "left-full ml-2"
                                }`}
                              >
                                {QUICK_REACTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => toggleReaction(message, emoji)}
                                    className="text-2xl leading-none px-1 hover:scale-125 transition-transform"
                                    title={`React ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                {own && (
                                  <button
                                    type="button"
                                    onClick={() => deleteMessage(message)}
                                    className="ml-1 pl-2 border-l text-muted-foreground hover:text-red-600"
                                    title="Delete message"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                )}
                              </div>

                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  own ? "bg-blue-600 text-white" : "bg-muted text-foreground"
                                } ${reactionEntries.length > 0 ? "mb-3" : ""}`}
                              >
                                {message.image_url && (
                                  <img
                                    src={message.image_url}
                                    alt="Shared image"
                                    className="rounded-lg mb-2 max-w-full h-auto cursor-pointer hover:opacity-90"
                                    onClick={() => setViewingImage(message.image_url)}
                                  />
                                )}
                                {message.content && <p className="text-sm">{message.content}</p>}
                                <p className={`text-xs mt-1 ${own ? "text-blue-100" : "text-muted-foreground/70"}`}>
                                  {formatMessageTime(message.created_at)}
                                </p>
                              </div>

                              {reactionEntries.length > 0 && (
                                <div
                                  className={`absolute -bottom-2 z-10 flex items-center gap-0.5 rounded-full border bg-white dark:bg-gray-800 shadow-sm px-1.5 py-0.5 ${
                                    own ? "left-2" : "right-2"
                                  }`}
                                >
                                  {reactionEntries.map(([emoji, users]) => {
                                    const reacted = users.includes(userId);
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => toggleReaction(message, emoji)}
                                        className={`flex items-center gap-0.5 rounded-full px-0.5 text-sm leading-none transition-transform hover:scale-110 ${
                                          reacted ? "font-semibold" : ""
                                        }`}
                                        title={reacted ? "Remove reaction" : "React"}
                                      >
                                        <span>{emoji}</span>
                                        {users.length > 1 && (
                                          <span className="text-xs text-muted-foreground">
                                            {users.length}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t">
                  {imagePreview && (
                    <div className="mb-2 relative inline-block">
                      <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
                      <button
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onPaste={handlePaste}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={uploading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={(!newMessage.trim() && !selectedImage) || uploading}
                    >
                      {uploading ? "..." : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>Select a conversation to start chatting</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* New group dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New group chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
            />
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search people..."
                className="pl-8"
              />
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedMembers.length} selected
              </p>
            )}
            <ScrollArea className="h-56 border rounded-md">
              {matches.filter((m) =>
                (m.otherUser?.full_name || "")
                  .toLowerCase()
                  .includes(memberSearch.trim().toLowerCase())
              ).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No matched buddies found.
                </p>
              ) : (
                matches
                  .filter((m) =>
                    (m.otherUser?.full_name || "")
                      .toLowerCase()
                      .includes(memberSearch.trim().toLowerCase())
                  )
                  .map((m) => (
                    <label
                      key={m.otherId}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedMembers.includes(m.otherId)}
                        onCheckedChange={() => toggleMember(m.otherId)}
                      />
                      <Avatar className="h-8 w-8">
                        {m.otherUser?.profile_picture_url && (
                          <AvatarImage
                            src={m.otherUser.profile_picture_url}
                            alt={m.otherUser?.full_name}
                          />
                        )}
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {(m.otherUser?.full_name || "U")[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {m.otherUser?.full_name || "User"}
                      </span>
                    </label>
                  ))
              )}
            </ScrollArea>
            {groupError && (
              <p className="text-sm text-red-600">{groupError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGroupDialogOpen(false)}
              disabled={creatingGroup}
            >
              Cancel
            </Button>
            <Button
              onClick={createGroup}
              disabled={creatingGroup || selectedMembers.length === 0}
            >
              {creatingGroup ? "Creating..." : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserProfileDialog
        userId={viewProfileId}
        open={!!viewProfileId}
        onOpenChange={(open) => {
          if (!open) setViewProfileId(null);
        }}
      />
    </>
  );
}
