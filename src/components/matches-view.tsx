"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, MessageCircle, BookOpen, GraduationCap, X } from "lucide-react";
import { createClient } from "../../supabase/client";

import UserProfileDialog from "./user-profile-dialog";

import { SCORING, applyScore } from "@/lib/matchScoring";


interface MatchesViewProps {
  userId: string;
  onStartChat?: (match: any) => void;
}

export default function MatchesView({ userId, onStartChat }: MatchesViewProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rematching, setRematching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rematchError, setRematchError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel("match_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadData = async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/matches/me", { credentials: "include" });
      const body = (await res.json().catch(() => ({}))) as {
        matches?: any[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(body.error || `Could not load matches (${res.status})`);
        setMatches([]);
        return;
      }
      setMatches(body.matches ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load matches");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (match: any) => {
    const name = match.otherUser?.full_name || "this study buddy";
    if (
      !window.confirm(
        `Remove ${name} from your matches? This removes the match for both of you.`
      )
    ) {
      return;
    }
    setRemovingId(match.id);
    try {
      const res = await fetch("/api/matches/remove", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: match.otherId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(body.error || `Failed to remove match (${res.status})`);
        return;
      }
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to remove match");
    } finally {
      setRemovingId(null);
    }
  };

  const handleRematch = async () => {
    try {
      setRematchError(null);
      setRematching(true);
      const res = await fetch("/api/matches/calculate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setRematchError(body.error || `Rematch failed (${res.status})`);
        return;
      }
      await loadData();
    } catch (e) {
      setRematchError(e instanceof Error ? e.message : "Rematch failed");
    } finally {
      setRematching(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading your study buddies...</div>;
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <p className="text-sm text-red-600 text-center" role="alert">
          {loadError}
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Study Buddies</h2>
          <p className="text-muted-foreground">Found {matches.length} compatible students</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={handleRematch}
            disabled={rematching}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {rematching ? "Rematching..." : "Rematch"}
          </Button>
          {rematchError ? (
            <p className="text-sm text-red-600 max-w-xs text-right">{rematchError}</p>
          ) : null}
        </div>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No matches yet</p>
            <p className="text-sm text-muted-foreground">Complete your profile to find study buddies</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {matches.map((match) => (
            <Card key={match.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => setViewProfileId(match.otherId)}
                    className="flex items-start gap-4 flex-1 min-w-0 text-left group"
                    title="View profile"
                  >
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                        {match.otherUser?.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate group-hover:text-blue-600 transition-colors">{match.otherUser?.full_name || "User"}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground truncate">{match.profile?.major || "Student"}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{match.profile?.year_of_study}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                      {Math.min(100, Math.round(match.compatibility_score))}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={() => handleRemove(match)}
                      disabled={removingId === match.id}
                      title="Remove from matches"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shrink-0">
                    {Math.min(
                      100,
                      Math.round((match.compatibility_score / SCORING.maxTotal) * 100)
                    )}%
                  </Badge>

                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {match.classes && match.classes.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span className="font-medium">Classes:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {match.classes.map((cls: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {cls.class_code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                  onClick={() => onStartChat?.(match)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Start Chatting
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserProfileDialog
        userId={viewProfileId}
        open={!!viewProfileId}
        onOpenChange={(open) => {
          if (!open) setViewProfileId(null);
        }}
        onStartChat={() => {
          const match = matches.find((m) => m.otherId === viewProfileId);
          if (match) onStartChat?.(match);
        }}
      />
    </div>
  );
}
