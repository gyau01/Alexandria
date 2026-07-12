"use client";

import { useEffect, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { createClient } from "../../supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, Plus, Send, FileText, Trash2, Pencil, MoreVertical, Archive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RichTextEditor from "./rich-text-editor";
import UserProfileDialog from "./user-profile-dialog";

interface CommunityBoardProps {
  userId: string;
}

type Composer = { id: string | null; title: string; content: string };

const EMPTY_COMPOSER: Composer = { id: null, title: "", content: "" };

export default function CommunityBoard({ userId }: CommunityBoardProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [composer, setComposer] = useState<Composer>(EMPTY_COMPOSER);
  const [editorKey, setEditorKey] = useState("new");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadBoard();
  }, [userId]);

  const loadBoard = async () => {
    try {
      const supabase = createClient();

      // Published posts + comments come with author info resolved server-side
      // (users table RLS hides non-matched users from the browser client).
      const res = await fetch("/api/community", { credentials: "include" });
      const body = (await res.json().catch(() => ({}))) as {
        posts?: any[];
        comments?: any[];
        error?: string;
      };

      if (!res.ok) {
        console.error("Error loading posts:", body.error);
        setLoading(false);
        return;
      }

      setPosts(body.posts ?? []);

      const grouped: Record<string, any[]> = {};
      (body.comments ?? []).forEach((c) => {
        grouped[c.post_id] = grouped[c.post_id] || [];
        grouped[c.post_id].push(c);
      });
      setComments(grouped);

      // Drafts are the current user's own rows (readable client-side under RLS).
      const { data: draftData } = await supabase
        .from("community_posts")
        .select("*")
        .eq("status", "draft")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      setDrafts(draftData || []);
    } catch (e) {
      console.error("Error loading board:", e);
    } finally {
      setLoading(false);
    }
  };

  const hasBody = (html: string) =>
    html.replace(/<[^>]*>/g, "").trim().length > 0 || /<img/i.test(html);

  const openNewPost = () => {
    setComposer(EMPTY_COMPOSER);
    setEditorKey(`new-${Date.now()}`);
    setCreating(true);
  };

  const editDraft = (draft: any) => {
    setComposer({ id: draft.id, title: draft.title, content: draft.content });
    setEditorKey(`draft-${draft.id}`);
    setShowDrafts(false);
    setCreating(true);
  };

  const savePost = async (status: "draft" | "published") => {
    const title = composer.title.trim();
    if (!title) {
      alert("Please add a title.");
      return;
    }
    if (status === "published" && !hasBody(composer.content)) {
      alert("Please write your question before posting.");
      return;
    }

    const supabase = createClient();
    const payload = {
      user_id: userId,
      title,
      content: composer.content,
      status,
      updated_at: new Date().toISOString(),
    };

		const res = await fetch("/api/discusssion", {
			method: "POST",
	 		credentials: "include",
	 		headers: {"Content-Type": "application/json" },
	 		body: JSON.stringify({
	   		user_id: userId,
	   	}),
		});

    setComposer(EMPTY_COMPOSER);
    setCreating(false);
    await loadBoard();
  };

  const deleteDraft = async (draftId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", draftId);
    if (error) {
      alert("Failed to delete draft: " + error.message);
      return;
    }
    await loadBoard();
  };

  const handleAddComment = async (postId: string) => {
    const content = (commentDrafts[postId] || "").trim();
    if (!content) return;

    const supabase = createClient();
    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      user_id: userId,
      content,
    });

    if (error) {
      console.error("Error adding comment:", error);
      alert("Failed to comment: " + error.message);
      return;
    }

    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setExpanded((prev) => ({ ...prev, [postId]: true }));
    await loadBoard();
  };

  const handleArchivePost = async (postId: string) => {
    try {
      const res = await fetch("/api/community/archive", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(body.error || "Failed to archive post");
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e: any) {
      alert(e?.message || "Failed to archive post");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (
      !window.confirm(
        "Delete this post permanently? This removes it and all its comments for everyone."
      )
    ) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);
    if (error) {
      alert("Failed to delete post: " + error.message);
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", commentId);
    if (error) {
      alert("Failed to delete comment: " + error.message);
      return;
    }
    setComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
    }));
  };

  // Absolute posted date + time, e.g. "Jul 1, 2026, 2:11 PM".
  const formatTime = (createdAt: string) => {
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="text-center py-12">Loading community board...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Community Board</h2>
          <p className="text-muted-foreground mt-1">
            Ask questions and help others — visible to everyone
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowDrafts(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Drafts{drafts.length > 0 ? ` (${drafts.length})` : ""}
          </Button>
          <Button onClick={openNewPost}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {/* Composer dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {composer.id ? "Edit draft" : "Ask the community"}
            </DialogTitle>
            <DialogDescription>
              Post a question for other students to answer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                placeholder="e.g., Anyone have notes for CS 101 midterm?"
                value={composer.title}
                onChange={(e) =>
                  setComposer({ ...composer, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Question</Label>
              <RichTextEditor
                key={editorKey}
                userId={userId}
                value={composer.content}
                onChange={(html) =>
                  setComposer((prev) => ({ ...prev, content: html }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={() => savePost("published")} className="flex-1">
              Post
            </Button>
            <Button
              variant="outline"
              onClick={() => savePost("draft")}
              className="flex-1"
            >
              Save Draft
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setComposer(EMPTY_COMPOSER);
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drafts dialog */}
      <Dialog open={showDrafts} onOpenChange={setShowDrafts}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Your drafts</DialogTitle>
            <DialogDescription>
              Drafts are private until you post them.
            </DialogDescription>
          </DialogHeader>
          {drafts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No drafts yet.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {draft.title || "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Edited {formatTime(draft.updated_at || draft.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => editDraft(draft)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteDraft(draft.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No posts yet. Be the first to ask a question!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => {
            const postComments = comments[post.id] || [];
            const isExpanded = expanded[post.id];
            return (
              <Card key={post.id} className="shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => post.user_id && setViewProfileId(post.user_id)}
                      className="flex items-center gap-3 text-left group"
                      title="View profile"
                    >
                      <Avatar className="h-9 w-9">
                        {post.author?.profile_picture_url && (
                          <AvatarImage
                            src={post.author.profile_picture_url}
                            alt={post.author?.full_name || "User"}
                          />
                        )}
                        <AvatarFallback className="bg-blue-600 text-white">
                          {(post.author?.full_name || "U")[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">
                          {post.author?.full_name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(post.created_at)}
                        </p>
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground shrink-0"
                          title="Options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleArchivePost(post.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        {post.user_id === userId && (
                          <DropdownMenuItem
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-xl mt-3">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-foreground [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_img]:rounded-lg [&_img]:my-2 [&_img]:max-w-full [&_a]:text-blue-600 [&_a]:underline"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(post.content || ""),
                    }}
                  />

                  <button
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {postComments.length}{" "}
                    {postComments.length === 1 ? "comment" : "comments"}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {postComments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              comment.user_id && setViewProfileId(comment.user_id)
                            }
                            title="View profile"
                          >
                            <Avatar className="h-7 w-7">
                              {comment.author?.profile_picture_url && (
                                <AvatarImage
                                  src={comment.author.profile_picture_url}
                                  alt={comment.author?.full_name || "User"}
                                />
                              )}
                              <AvatarFallback className="bg-gray-400 text-white text-xs">
                                {(comment.author?.full_name || "U")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                          <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  comment.user_id &&
                                  setViewProfileId(comment.user_id)
                                }
                                className="text-sm font-medium hover:text-blue-600 transition-colors"
                                title="View profile"
                              >
                                {comment.author?.full_name || "User"}
                              </button>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(comment.created_at)}
                              </span>
                              {comment.user_id === userId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteComment(comment.id, post.id)
                                  }
                                  className="ml-auto text-muted-foreground hover:text-red-600"
                                  title="Delete comment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Write a comment..."
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={() => handleAddComment(post.id)}
                          disabled={!(commentDrafts[post.id] || "").trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <UserProfileDialog
        userId={viewProfileId}
        open={!!viewProfileId}
        onOpenChange={(open) => {
          if (!open) setViewProfileId(null);
        }}
      />
    </div>
  );
}
