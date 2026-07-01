"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BarChart3, Clock, MapPin, Users, Calendar, MoreVertical, Trash2, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserProfileDialog from "./user-profile-dialog";

interface PollsViewProps {
  userId: string;
}

export default function PollsView({ userId }: PollsViewProps) {
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    poll_type: "study_time", // study_time, study_location, study_group_size, etc.
    options: [] as string[],
    newOption: ""
  });

  useEffect(() => {
    loadPolls();
  }, [userId]);

  const loadPolls = async () => {
    try {
      const res = await fetch("/api/polls", { credentials: "include" });
      const body = (await res.json().catch(() => ({}))) as {
        polls?: any[];
        error?: string;
      };
      if (!res.ok) {
        console.error("Error loading polls:", body.error);
        setPolls([]);
      } else {
        setPolls(body.polls ?? []);
      }
    } catch (error) {
      console.error("Error loading polls:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    if (newPoll.newOption.trim()) {
      setNewPoll({
        ...newPoll,
        options: [...newPoll.options, newPoll.newOption.trim()],
        newOption: ""
      });
    }
  };

  const handleRemoveOption = (index: number) => {
    setNewPoll({
      ...newPoll,
      options: newPoll.options.filter((_, i) => i !== index)
    });
  };

  const handleCreatePoll = async () => {
    setFormError(null);

    // Validate title
    const trimmedTitle = newPoll.title.trim();
    if (!trimmedTitle) {
      setFormError("Please provide a poll title.");
      return;
    }

    // Validate options - filter out empty strings and check count
    const validOptions = newPoll.options.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) {
      setFormError("Please add at least 2 options.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      // Create poll
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .insert({
          user_id: userId,
          title: trimmedTitle,
          description: newPoll.description.trim() || null,
          poll_type: newPoll.poll_type,
          options: validOptions,
          votes: validOptions.reduce((acc, option) => {
            acc[option] = 0;
            return acc;
          }, {} as Record<string, number>)
        })
        .select()
        .single();

      if (pollError) {
        console.error("Error creating poll:", pollError);
        setFormError(
          `Failed to create poll: ${pollError.message}` +
            (pollError.code ? ` (code ${pollError.code})` : "")
        );
        return;
      }

      console.log("Poll created successfully:", pollData);

      // Reset form
      setNewPoll({
        title: "",
        description: "",
        poll_type: "study_time",
        options: [],
        newOption: ""
      });
      setCreatingPoll(false);

      // Reload polls
      await loadPolls();
      setBanner("Poll created successfully!");
      setTimeout(() => setBanner(null), 4000);
    } catch (error: any) {
      console.error("Error creating poll:", error);
      setFormError(error?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (pollId: string, option: string, myVote?: string | null) => {
    // Clicking the option you already picked does nothing.
    if (myVote === option) return;

    try {
      const supabase = createClient();

      // Records or switches the vote and adjusts the tallies atomically. A
      // secure function is used so non-owners can vote even though the poll's
      // UPDATE policy only allows the owner to edit it.
      const { error } = await supabase.rpc("cast_poll_vote", {
        p_poll_id: pollId,
        p_option: option,
      });

      if (error) {
        console.error("Error voting:", error);
        setBanner(null);
        alert("Failed to vote: " + (error.message || "Unknown error"));
        return;
      }

      // Reload polls
      await loadPolls();
    } catch (error: any) {
      console.error("Error voting:", error);
      alert("Failed to vote: " + (error.message || "Unknown error"));
    }
  };

  const handleArchivePoll = async (pollId: string) => {
    try {
      const res = await fetch("/api/polls/archive", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(body.error || "Failed to archive poll");
        return;
      }
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
      setBanner("Poll archived. Find it in Settings → Archived.");
      setTimeout(() => setBanner(null), 4000);
    } catch (e: any) {
      alert(e?.message || "Failed to archive poll");
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (
      !window.confirm(
        "Delete this poll permanently? This removes it and all its votes for everyone."
      )
    ) {
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.from("polls").delete().eq("id", pollId);
      if (error) {
        alert("Failed to delete poll: " + error.message);
        return;
      }
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
    } catch (e: any) {
      alert(e?.message || "Failed to delete poll");
    }
  };

  const getPollTypeIcon = (type: string) => {
    switch (type) {
      case "study_time":
        return <Clock className="h-4 w-4" />;
      case "study_location":
        return <MapPin className="h-4 w-4" />;
      case "study_group_size":
        return <Users className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getPollTypeLabel = (type: string) => {
    switch (type) {
      case "study_time":
        return "Study Time";
      case "study_location":
        return "Study Location";
      case "study_group_size":
        return "Group Size";
      default:
        return "General";
    }
  };

  const getTotalVotes = (votes: Record<string, number>) => {
    return Object.values(votes || {}).reduce((sum, count) => sum + count, 0);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="text-center py-12">Loading polls...</div>;
  }

  return (
    <div className="space-y-6">
      {banner && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {banner}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Polls</h2>
          <p className="text-muted-foreground mt-1">Create and vote on polls about study preferences</p>
        </div>
        <Dialog
          open={creatingPoll}
          onOpenChange={(open) => {
            setCreatingPoll(open);
            if (open) setFormError(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Poll</DialogTitle>
              <DialogDescription>
                Create a poll to gather opinions from the community
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <div>
                <Label htmlFor="poll_type">Poll Type</Label>
                <Select
                  value={newPoll.poll_type}
                  onValueChange={(value) => setNewPoll({ ...newPoll, poll_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select poll type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="study_time">Study Time</SelectItem>
                    <SelectItem value="study_location">Study Location</SelectItem>
                    <SelectItem value="study_group_size">Group Size</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Poll Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., What's your preferred study time?"
                  value={newPoll.title}
                  onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add more context about your poll..."
                  value={newPoll.description}
                  onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label>Poll Options (at least 2 required)</Label>
                <div className="space-y-2 mt-2">
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add an option..."
                      value={newPoll.newOption}
                      onChange={(e) => setNewPoll({ ...newPoll, newOption: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                    />
                    <Button onClick={handleAddOption} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreatePoll}
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Poll"}
              </Button>
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  setCreatingPoll(false);
                  setFormError(null);
                  setNewPoll({
                    title: "",
                    description: "",
                    poll_type: "study_time",
                    options: [],
                    newOption: ""
                  });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {polls.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No polls yet. Be the first to create one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {polls.map((poll) => {
            const totalVotes = getTotalVotes(poll.votes || {});
            return (
              <Card key={poll.id} className="shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getPollTypeIcon(poll.poll_type)}
                        <Badge variant="outline">{getPollTypeLabel(poll.poll_type)}</Badge>
                      </div>
                      <CardTitle className="text-xl">{poll.title}</CardTitle>
                      {poll.description && (
                        <CardDescription className="mt-2">{poll.description}</CardDescription>
                      )}
                      <button
                        type="button"
                        onClick={() => poll.user_id && setViewProfileId(poll.user_id)}
                        className="mt-3 flex items-center gap-2 group"
                        title="View profile"
                      >
                        <Avatar className="h-6 w-6">
                          {poll.author?.profile_picture_url && (
                            <AvatarImage
                              src={poll.author.profile_picture_url}
                              alt={poll.author?.full_name || "User"}
                            />
                          )}
                          <AvatarFallback className="bg-blue-600 text-white text-xs">
                            {poll.author?.full_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground group-hover:text-blue-600 transition-colors">
                          {poll.author?.full_name || "Unknown user"}
                        </span>
                      </button>
                    </div>
                    <div className="flex items-start gap-1 shrink-0">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(poll.created_at)}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            title="Options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleArchivePoll(poll.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          {poll.user_id === userId && (
                            <DropdownMenuItem
                              onClick={() => handleDeletePoll(poll.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {poll.options.map((option: string) => {
                      const votes = poll.votes?.[option] || 0;
                      const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                      const isMyVote = poll.myVote === option;
                      const hasVoted = !!poll.myVote;
                      return (
                        <div key={option} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {option}
                              {isMyVote && (
                                <span className="ml-2 text-xs font-normal text-blue-600">
                                  Your vote
                                </span>
                              )}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {votes} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant={isMyVote ? "default" : "outline"}
                            onClick={() => handleVote(poll.id, option, poll.myVote)}
                            disabled={isMyVote}
                            className="w-full"
                          >
                            {isMyVote
                              ? "✓ Voted"
                              : hasVoted
                              ? `Switch to ${option}`
                              : `Vote for ${option}`}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
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

