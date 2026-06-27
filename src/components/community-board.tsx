"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare, Plus, Send } from "lucide-react";

interface CommunityBoardProps {
  userId: string;
}

export default function CommunityBoard({ userId }: CommunityBoardProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBoard();
  }, [userId]);

  const fetchUsers = async (ids: string[]) => {
    const supabase = createClient();
    const unique = Array.from(new Set(ids)).filter(Boolean);
    if (unique.length === 0) return {} as Record<string, any>;
    const { data } = await supabase
      .from("users")
      .select("user_id, full_name, email, profile_picture_url")
      .in("user_id", unique);
    const map: Record<string, any> = {};
    (data || []).forEach((u) => {
      map[u.user_id] = u;
    });
    return map;
  };

  const loadBoard = async () => {
    try {
      const supabase = createClient();
      const { data: postData, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading posts:", error);
        setLoading(false);
        return;
      }

      const loadedPosts = postData || [];
      setPosts(loadedPosts);

      const postIds = loadedPosts.map((p) => p.id);
      let allComments: any[] = [];
      if (postIds.length > 0) {
        const { data: commentData } = await supabase
          .from("community_comments")
          .select("*")
          .in("post_id", postIds)
          .order("created_at", { ascending: true });
        allComments = commentData || [];
      }

      const grouped: Record<string, any[]> = {};
      allComments.forEach((c) => {
        grouped[c.post_id] = grouped[c.post_id] || [];
        grouped[c.post_id].push(c);
      });
      setComments(grouped);

      const ids = [
        ...loadedPosts.map((p) => p.user_id),
        ...allComments.map((c) => c.user_id),
      ];
      setUserMap(await fetchUsers(ids));
    } catch (e) {
      console.error("Error loading board:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    const title = newPost.title.trim();
    const content = newPost.content.trim();
    if (!title || !content) {
      alert("Please add a title and your question.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("community_posts").insert({
      user_id: userId,
      title,
      content,
    });

    if (error) {
      console.error("Error creating post:", error);
      alert("Failed to post: " + error.message);
      return;
    }

    setNewPost({ title: "", content: "" });
    setCreating(false);
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

  const authorName = (id: string) =>
    userMap[id]?.full_name || userMap[id]?.email || "User";

  const formatTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading) {
    return <div className="text-center py-12">Loading community board...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Community Board</h2>
          <p className="text-gray-600 mt-1">
            Ask questions and help others — visible to everyone
          </p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ask the community</DialogTitle>
              <DialogDescription>
                Post a question for other students to answer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="post-title">Title</Label>
                <Input
                  id="post-title"
                  placeholder="e.g., Anyone have notes for CS 101 midterm?"
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost({ ...newPost, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="post-content">Question</Label>
                <Textarea
                  id="post-content"
                  placeholder="Share the details of your question..."
                  value={newPost.content}
                  onChange={(e) =>
                    setNewPost({ ...newPost, content: e.target.value })
                  }
                  rows={5}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreatePost} className="flex-1">
                Post
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setNewPost({ title: "", content: "" });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
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
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {userMap[post.user_id]?.profile_picture_url && (
                        <AvatarImage
                          src={userMap[post.user_id].profile_picture_url}
                          alt={authorName(post.user_id)}
                        />
                      )}
                      <AvatarFallback className="bg-blue-600 text-white">
                        {authorName(post.user_id)[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {authorName(post.user_id)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(post.created_at)}
                      </p>
                    </div>
                  </div>
                  <CardTitle className="text-xl mt-3">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {post.content}
                  </p>

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
                          <Avatar className="h-7 w-7">
                            {userMap[comment.user_id]?.profile_picture_url && (
                              <AvatarImage
                                src={
                                  userMap[comment.user_id].profile_picture_url
                                }
                                alt={authorName(comment.user_id)}
                              />
                            )}
                            <AvatarFallback className="bg-gray-400 text-white text-xs">
                              {authorName(comment.user_id)[0]?.toUpperCase() ||
                                "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {authorName(comment.user_id)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTime(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
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
    </div>
  );
}
