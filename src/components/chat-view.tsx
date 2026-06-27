"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Image as ImageIcon, X } from "lucide-react";
import { createClient } from "../../supabase/client";

interface ChatViewProps {
  userId: string;
  initialMatch?: any;
}

export default function ChatView({ userId, initialMatch }: ChatViewProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(initialMatch || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldScrollRef = useRef(false);

  const formatMessageTime = (createdAt: string) => {
    const msgDate = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const time = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (msgDate.toDateString() === today.toDateString()) return time;
    if (msgDate.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
    return `${msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  };

  const pairKey = (a: string, b: string) => [a, b].sort().join("|");

  const resolveMatchIds = (match: { id: string; allMatchIds?: string[] }) => {
    if (match.allMatchIds?.length) return match.allMatchIds;
    const hit = matches.find(
      (m) => m.allMatchIds?.includes(match.id) || m.id === match.id
    );
    return hit?.allMatchIds?.length ? hit.allMatchIds : [match.id];
  };

  useEffect(() => {
    loadMatches();
  }, [userId]);

  useEffect(() => {
    if (initialMatch) {
      setSelectedMatch(initialMatch);
    }
  }, [initialMatch]);

  useEffect(() => {
    if (selectedMatch) {
      const ids = resolveMatchIds(selectedMatch);
      loadMessages(ids);
      markMessagesAsRead(ids);
      const cleanup = subscribeToMessages(ids);
      return cleanup;
    }
  }, [selectedMatch, matches]);

  useEffect(() => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      shouldScrollRef.current = false;
    }
  }, [messages]);

  const loadMatches = async () => {
    const supabase = createClient();

    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    const rows = matchesData || [];
    const byPair = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = pairKey(row.user1_id, row.user2_id);
      const list = byPair.get(key) ?? [];
      list.push(row);
      byPair.set(key, list);
    }

    const mergedRows = Array.from(byPair.values()).map((group) => {
      const canonical =
        group.find((g) => g.user1_id === userId) ?? group[0];
      const restIds = group
        .filter((g) => g.id !== canonical.id)
        .map((g) => g.id);
      const allMatchIds = [canonical.id, ...restIds];
      return { ...canonical, allMatchIds };
    });

    const matchDetails = await Promise.all(
      mergedRows.map(async (match) => {
        const otherId =
          match.user1_id === userId ? match.user2_id : match.user1_id;

        const { data: otherUser } = await supabase
          .from("users")
          .select("full_name, email, profile_picture_url")
          .eq("user_id", otherId)
          .single();

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("match_id", match.allMatchIds)
          .eq("read", false)
          .neq("sender_id", userId);

        const { data: lastRows } = await supabase
          .from("messages")
          .select("created_at")
          .in("match_id", match.allMatchIds)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMessageTime =
          lastRows?.[0]?.created_at ?? match.created_at;

        return {
          ...match,
          otherUser,
          otherId,
          unreadCount: count || 0,
          lastMessageTime,
        };
      })
    );

    const sortedMatches = matchDetails.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime).getTime();
      const timeB = new Date(b.lastMessageTime).getTime();
      return timeB - timeA;
    });

    setMatches(sortedMatches);

    const counts: Record<string, number> = {};
    sortedMatches.forEach((match) => {
      counts[match.id] = match.unreadCount;
    });
    setUnreadCounts(counts);

    setSelectedMatch((prev: any) => {
      if (!prev) return prev;
      const hit = sortedMatches.find(
        (m) =>
          (m.allMatchIds && m.allMatchIds.includes(prev.id)) ||
          m.id === prev.id
      );
      return hit ?? prev;
    });

    setLoading(false);
  };

  const isOwnMessage = (senderId: string) =>
    (senderId || "").toLowerCase() === (userId || "").toLowerCase();

  const loadMessages = async (matchIds: string[]) => {
    const supabase = createClient();
    const uniqueIds = Array.from(new Set(matchIds));

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .in("match_id", uniqueIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Load messages error:", error);
    } else {
      const sorted = [...(data || [])].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sorted);
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
    loadMatches();
  };

  const subscribeToMessages = (matchIds: string[]) => {
    const supabase = createClient();
    const uniqueIds = Array.from(new Set(matchIds));
    const channelName = `messages:${uniqueIds.sort().join(",")}`;

    const channel = supabase.channel(channelName);

    const onInsert = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as {
        id: string;
        match_id: string;
        sender_id: string;
        created_at: string;
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev;
        return [...prev, row].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      if (!isOwnMessage(row.sender_id)) {
        markMessagesAsRead(uniqueIds);
      }

      setMatches((prevMatches) => {
        const updatedMatches = prevMatches.map((match) =>
          match.allMatchIds?.includes(row.match_id) || match.id === row.match_id
            ? { ...match, lastMessageTime: row.created_at }
            : match
        );
        return updatedMatches.sort((a, b) => {
          const timeA = new Date(a.lastMessageTime).getTime();
          const timeB = new Date(b.lastMessageTime).getTime();
          return timeB - timeA;
        });
      });
    };

    for (const mid of uniqueIds) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${mid}`,
        },
        onInsert
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
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
          reader.onloadend = () => {
            setImagePreview(reader.result as string);
          };

          reader.readAsDataURL(file);
        }

        break;
      }
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedMatch) return;

    shouldScrollRef.current = true;
    setUploading(true);
    const supabase = createClient();

    let imageUrl = null;
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) {
        setUploading(false);
        shouldScrollRef.current = false;
        alert('Failed to upload image. Please try again.');
        return;
      }
    }

    const messageData = {
      match_id: resolveMatchIds(selectedMatch)[0],
      sender_id: userId,
      content: newMessage.trim(),
      image_url: imageUrl
    };

    const { data, error } = await supabase
      .from("messages")
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      shouldScrollRef.current = false;
      alert('Failed to send message: ' + error.message);
    } else {
      setNewMessage("");
      clearImage();

      setMatches((prevMatches) => {
        const updatedMatches = prevMatches.map((match) =>
          match.id === selectedMatch.id ||
            match.allMatchIds?.includes(selectedMatch.id)
            ? { ...match, lastMessageTime: new Date().toISOString() }
            : match
        );
        return updatedMatches.sort((a, b) => {
          const timeA = new Date(a.lastMessageTime).getTime();
          const timeB = new Date(b.lastMessageTime).getTime();
          return timeB - timeA;
        });
      });

      setTimeout(() => {
        loadMessages(resolveMatchIds(selectedMatch));
      }, 500);
    }
    setUploading(false);
  };

  const handleSelectMatch = (match: any) => {
    setSelectedMatch(match);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !uploading) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading conversations...</div>;
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No conversations yet</p>
          <p className="text-sm text-gray-500 mt-2">Connect with study buddies to start chatting!</p>
        </CardContent>
      </Card>
    );
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
          <CardHeader>
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => handleSelectMatch(match)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b relative ${
                    selectedMatch?.id === match.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      {match.otherUser?.profile_picture_url && (
                        <AvatarImage src={match.otherUser.profile_picture_url} alt={match.otherUser?.full_name} />
                      )}
                      <AvatarFallback className="bg-blue-600 text-white">
                        {match.otherUser?.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCounts[match.id] > 0 && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <div className="h-2 w-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{match.otherUser?.full_name || "User"}</p>
                    <p className="text-xs text-gray-500 truncate">{match.otherUser?.email}</p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          {selectedMatch ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {selectedMatch.otherUser?.profile_picture_url && (
                      <AvatarImage src={selectedMatch.otherUser.profile_picture_url} alt={selectedMatch.otherUser?.full_name} />
                    )}
                    <AvatarFallback className="bg-blue-600 text-white">
                      {selectedMatch.otherUser?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedMatch.otherUser?.full_name || "User"}</CardTitle>
                    <p className="text-xs text-gray-500">{selectedMatch.otherUser?.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[500px]">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage(message.sender_id) ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwnMessage(message.sender_id)
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
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
                          <p className={`text-xs mt-1 ${isOwnMessage(message.sender_id) ? "text-blue-100" : "text-gray-500"}`}>
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
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
                    <Button onClick={sendMessage} disabled={(!newMessage.trim() && !selectedImage) || uploading}>
                      {uploading ? "..." : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Select a conversation to start chatting</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </>
  );
}