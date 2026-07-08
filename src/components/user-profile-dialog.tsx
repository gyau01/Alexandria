"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap,
  BookOpen,
  MapPin,
  Clock,
  Lock,
  MessageCircle,
  Activity,
  EyeOff,
} from "lucide-react";

export interface ProfileData {
  userId: string;
  fullName: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  university?: string | null;
  major?: string | null;
  yearOfStudy?: string | null;
  bio?: string | null;
  isSelf?: boolean;
  isMatched?: boolean;
  visibility?: "public" | "matches" | "private";
  canView: boolean;
  classes?: { class_code: string; class_name: string; semester?: string }[] | null;
  classesHidden?: boolean;
  preferences?: {
    study_time_preference?: string[] | null;
    study_location_preference?: string[] | null;
    group_size_preference?: string | null;
    study_style?: string[] | null;
  } | null;
  activity?: {
    id: string;
    type: "post" | "comment";
    title: string;
    created_at: string;
  }[] | null;
  activityHidden?: boolean;
}

interface UserProfileDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartChat?: () => void;
}

const relativeTime = (iso: string) => {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

export default function UserProfileDialog({
  userId,
  open,
  onOpenChange,
  onStartChat,
}: UserProfileDialogProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfile(null);

    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          credentials: "include",
        });
        const body = (await res.json().catch(() => ({}))) as {
          profile?: ProfileData;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !body.profile) {
          setError(body.error || "Could not load this profile");
          return;
        }
        setProfile(body.profile);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const initial = profile?.fullName?.[0]?.toUpperCase() || "U";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Student profile</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-12 text-center text-muted-foreground">
            Loading profile...
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center text-red-600" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && profile && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {profile.avatarUrl && (
                  <AvatarImage
                    src={profile.avatarUrl}
                    alt={profile.fullName || "User"}
                  />
                )}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="text-xl font-bold truncate">
                  {profile.fullName || "Student"}
                </h3>
                {profile.isSelf && profile.email && (
                  <p className="text-sm text-muted-foreground truncate">
                    {profile.email}
                  </p>
                )}
                {profile.isMatched && !profile.isSelf && (
                  <Badge className="mt-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hover:bg-green-100">
                    Study buddy
                  </Badge>
                )}
              </div>
            </div>

            {/* Private profile state */}
            {!profile.canView ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">This profile is private</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.visibility === "matches"
                    ? "Only their study buddies can view this profile."
                    : "This student has hidden their profile from discovery."}
                </p>
              </div>
            ) : (
              <>
                {/* Academic */}
                {(profile.major ||
                  profile.university ||
                  profile.yearOfStudy) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      Academic
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {profile.university && (
                        <div>
                          <p className="text-muted-foreground">University</p>
                          <p className="font-medium">{profile.university}</p>
                        </div>
                      )}
                      {profile.major && (
                        <div>
                          <p className="text-muted-foreground">Major</p>
                          <p className="font-medium">{profile.major}</p>
                        </div>
                      )}
                      {profile.yearOfStudy && (
                        <div>
                          <p className="text-muted-foreground">Year</p>
                          <p className="font-medium capitalize">
                            {profile.yearOfStudy}
                          </p>
                        </div>
                      )}
                    </div>
                    {profile.bio && (
                      <p className="text-sm text-foreground pt-1">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Classes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    Classes
                  </div>
                  {profile.classesHidden ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <EyeOff className="h-4 w-4" />
                      This student keeps their classes private.
                    </div>
                  ) : profile.classes && profile.classes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.classes.map((cls, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs"
                          title={cls.class_name}
                        >
                          {cls.class_code}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No classes added yet.
                    </p>
                  )}
                </div>

                {/* Study preferences */}
                {profile.preferences &&
                  (profile.preferences.study_time_preference?.length ||
                    profile.preferences.study_location_preference?.length ||
                    profile.preferences.study_style?.length ||
                    profile.preferences.group_size_preference) && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-4 w-4 text-blue-600" />
                          Study preferences
                        </div>
                        {!!profile.preferences.study_time_preference?.length && (
                          <div className="flex flex-wrap gap-2">
                            {profile.preferences.study_time_preference.map(
                              (t) => (
                                <Badge
                                  key={t}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {t}
                                </Badge>
                              )
                            )}
                          </div>
                        )}
                        {!!profile.preferences.study_location_preference
                          ?.length && (
                          <div className="flex flex-wrap gap-2">
                            {profile.preferences.study_location_preference.map(
                              (l) => (
                                <Badge
                                  key={l}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {l}
                                </Badge>
                              )
                            )}
                          </div>
                        )}
                        {!!profile.preferences.study_style?.length && (
                          <div className="flex flex-wrap gap-2">
                            {profile.preferences.study_style.map((s) => (
                              <Badge
                                key={s}
                                variant="outline"
                                className="text-xs"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {profile.preferences.group_size_preference && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                            {profile.preferences.group_size_preference}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}

                <Separator />

                {/* Activity */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="h-4 w-4 text-blue-600" />
                    Recent activity
                  </div>
                  {profile.activityHidden ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <EyeOff className="h-4 w-4" />
                      This student keeps their activity private.
                    </div>
                  ) : profile.activity && profile.activity.length > 0 ? (
                    <ul className="space-y-2">
                      {profile.activity.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0">
                            <span className="text-muted-foreground mr-1">
                              {item.type === "post"
                                ? "Posted"
                                : "Commented"}
                              :
                            </span>
                            <span className="text-foreground line-clamp-1">
                              {item.title}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {relativeTime(item.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No recent activity.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Actions */}
            {!profile.isSelf && profile.isMatched && onStartChat && (
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => {
                  onOpenChange(false);
                  onStartChat();
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
