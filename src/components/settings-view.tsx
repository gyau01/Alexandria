"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "../../supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Palette,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Check,
  Archive,
  BarChart3,
  MessageSquare,
} from "lucide-react";

interface SettingsViewProps {
  userId: string;
}

type SectionId =
  | "account"
  | "notifications"
  | "privacy"
  | "archived"
  | "billing"
  | "preferences";

const SECTIONS: { id: SectionId; label: string; icon: any }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "archived", label: "Archived", icon: Archive },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "preferences", label: "Preferences", icon: Palette },
];

const NOTIFICATION_EVENTS: { key: string; label: string; desc: string }[] = [
  { key: "new_match", label: "New matches", desc: "When you get a new study buddy match" },
  { key: "new_message", label: "New messages", desc: "When someone sends you a chat message" },
  { key: "new_comment", label: "Board replies", desc: "When someone comments on your community post" },
  { key: "poll_activity", label: "Poll activity", desc: "Updates on polls you created or voted in" },
  { key: "product_updates", label: "Product updates", desc: "News, tips, and feature announcements" },
];

const DEFAULT_NOTIFICATIONS: Record<string, boolean> = {
  new_match: true,
  new_message: true,
  new_comment: true,
  poll_activity: false,
  product_updates: false,
};

const DEFAULT_PRIVACY: Record<string, any> = {
  profile_visibility: "public",
  share_classes: true,
  share_activity: true,
  allow_analytics: true,
};

export default function SettingsView({ userId }: SettingsViewProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [section, setSection] = useState<SectionId>("account");
  const [mounted, setMounted] = useState(false);

  // Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Settings (notifications / privacy)
  const [notifications, setNotifications] =
    useState<Record<string, boolean>>(DEFAULT_NOTIFICATIONS);
  const [privacy, setPrivacy] = useState<Record<string, any>>(DEFAULT_PRIVACY);

  // Privacy - blocked users
  const [blocked, setBlocked] = useState<any[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Archived polls & posts
  const [archivedPolls, setArchivedPolls] = useState<any[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<any[]>([]);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  // Billing
  const [subscription, setSubscription] = useState<any>(null);
  const [billingBusy, setBillingBusy] = useState(false);

  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadAll();
  }, [userId]);

  const loadAll = async () => {
    const supabase = createClient();

    const { data: userRow } = await supabase
      .from("users")
      .select("full_name, email, profile_picture_url")
      .eq("user_id", userId)
      .single();
    if (userRow) {
      setFullName(userRow.full_name || "");
      setEmail(userRow.email || "");
      setAvatar(userRow.profile_picture_url || null);
    }

    const { data: settingsRow } = await supabase
      .from("user_settings")
      .select("notifications, privacy")
      .eq("user_id", userId)
      .maybeSingle();
    if (settingsRow) {
      setNotifications({
        ...DEFAULT_NOTIFICATIONS,
        ...(settingsRow.notifications || {}),
      });
      setPrivacy({ ...DEFAULT_PRIVACY, ...(settingsRow.privacy || {}) });
    }

    loadBlocked();
    loadBilling();
    loadArchived();
  };

  const loadArchived = async () => {
    try {
      const [pollsRes, postsRes] = await Promise.all([
        fetch("/api/polls/archive", { credentials: "include" }),
        fetch("/api/community/archive", { credentials: "include" }),
      ]);
      const pollsBody = (await pollsRes.json().catch(() => ({}))) as {
        archived?: any[];
      };
      const postsBody = (await postsRes.json().catch(() => ({}))) as {
        archived?: any[];
      };
      if (pollsRes.ok) setArchivedPolls(pollsBody.archived ?? []);
      if (postsRes.ok) setArchivedPosts(postsBody.archived ?? []);
    } catch {
      /* non-blocking */
    }
  };

  const unarchivePoll = async (pollId: string) => {
    setUnarchivingId(pollId);
    try {
      const res = await fetch("/api/polls/archive", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        alert(body.error || "Failed to restore poll");
        return;
      }
      setArchivedPolls((prev) => prev.filter((a) => a.id !== pollId));
    } finally {
      setUnarchivingId(null);
    }
  };

  const unarchivePost = async (postId: string) => {
    setUnarchivingId(postId);
    try {
      const res = await fetch("/api/community/archive", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        alert(body.error || "Failed to restore post");
        return;
      }
      setArchivedPosts((prev) => prev.filter((a) => a.id !== postId));
    } finally {
      setUnarchivingId(null);
    }
  };

  const loadBlocked = async () => {
    try {
      const res = await fetch("/api/matches/removed", {
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as { removed?: any[] };
      if (res.ok) setBlocked(body.removed ?? []);
    } catch {
      /* non-blocking */
    }
  };

  const loadBilling = async () => {
    try {
      const res = await fetch("/api/billing/status", {
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        subscription?: any;
      };
      if (res.ok) setSubscription(body.subscription ?? null);
    } catch {
      /* non-blocking */
    }
  };

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const persistSettings = async (
    nextNotifications: Record<string, boolean>,
    nextPrivacy: Record<string, any>
  ) => {
    const supabase = createClient();
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        notifications: nextNotifications,
        privacy: nextPrivacy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("save settings:", error);
      alert("Failed to save settings: " + error.message);
      return;
    }
    flashSaved();
  };

  const toggleNotification = (key: string) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    persistSettings(next, privacy);
  };

  const updatePrivacy = (key: string, value: any) => {
    const next = { ...privacy, [key]: value };
    setPrivacy(next);
    persistSettings(notifications, next);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("users")
        .update({ full_name: fullName.trim() })
        .eq("user_id", userId);
      if (error) {
        alert("Failed to update profile: " + error.message);
        return;
      }
      flashSaved();
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        alert("Failed to change password: " + error.message);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      alert("Password updated successfully.");
    } finally {
      setSavingPassword(false);
    }
  };

  const unblock = async (entry: any) => {
    setRestoringId(entry.otherId);
    try {
      const res = await fetch("/api/matches/restore", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: entry.otherId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(body.error || "Failed to unblock");
        return;
      }
      setBlocked((prev) => prev.filter((b) => b.otherId !== entry.otherId));
      window.dispatchEvent(
        new CustomEvent("match-restored", { detail: { otherUserId: entry.otherId } })
      );
    } finally {
      setRestoringId(null);
    }
  };

  const openBillingPortal = async () => {
    setBillingBusy(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (res.ok && body.url) {
        window.location.href = body.url;
      } else {
        alert(body.error || "Could not open billing portal");
      }
    } finally {
      setBillingBusy(false);
    }
  };

  const formatMoney = (amount?: number | null, currency?: string | null) => {
    if (amount == null) return null;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (currency || "usd").toUpperCase(),
      }).format(amount / 100);
    } catch {
      return `${(amount / 100).toFixed(2)}`;
    }
  };

  const formatEpoch = (epoch?: number | null) => {
    if (!epoch) return null;
    return new Date(epoch * 1000).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isActive = subscription && subscription.status === "active";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-3xl font-bold text-foreground">Settings</h2>
        {savedFlash && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-left whitespace-nowrap transition-colors ${
                  section === s.id
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="space-y-6">
          {section === "account" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    Update your public account information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-blue-600 text-white text-xl">
                        {fullName?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm text-muted-foreground">{email}</div>
                  </div>
                  <div>
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={email} disabled />
                  </div>
                  <Button onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save changes"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>
                    Change the password used to sign in.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={changePassword}
                    disabled={savingPassword}
                    variant="outline"
                  >
                    {savingPassword ? "Updating..." : "Update password"}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {section === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Email notifications</CardTitle>
                <CardDescription>
                  Choose which emails you want to receive.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {NOTIFICATION_EVENTS.map((evt) => (
                  <div
                    key={evt.key}
                    className="flex items-center justify-between py-4"
                  >
                    <div className="pr-4">
                      <p className="font-medium">{evt.label}</p>
                      <p className="text-sm text-muted-foreground">{evt.desc}</p>
                    </div>
                    <Switch
                      checked={!!notifications[evt.key]}
                      onCheckedChange={() => toggleNotification(evt.key)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {section === "privacy" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Profile visibility</CardTitle>
                  <CardDescription>
                    Control who can see your profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={privacy.profile_visibility}
                    onValueChange={(v) => updatePrivacy("profile_visibility", v)}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        Public — visible to all students
                      </SelectItem>
                      <SelectItem value="matches">
                        Matches only — visible to your study buddies
                      </SelectItem>
                      <SelectItem value="private">
                        Private — hidden from discovery
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data sharing</CardTitle>
                  <CardDescription>
                    Decide what information you share with others.
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y">
                  {[
                    {
                      key: "share_classes",
                      label: "Share my classes",
                      desc: "Let matches see the classes you're taking",
                    },
                    {
                      key: "share_activity",
                      label: "Share my activity",
                      desc: "Show your recent activity to matches",
                    },
                    {
                      key: "allow_analytics",
                      label: "Usage analytics",
                      desc: "Help improve Alexandria with anonymous usage data",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-4"
                    >
                      <div className="pr-4">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={!!privacy[item.key]}
                        onCheckedChange={(v) => updatePrivacy(item.key, v)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Blocked / removed users</CardTitle>
                  <CardDescription>
                    People you removed from matches. Unblocking restores the
                    match for both of you. Chat history is not restored.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {blocked.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground">
                      You haven&apos;t removed anyone.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {blocked.map((entry) => (
                        <div
                          key={entry.otherId}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-gray-400 text-white">
                                {entry.otherUser?.full_name?.[0]?.toUpperCase() ||
                                  "U"}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium truncate">
                              {entry.otherUser?.full_name ||
                                entry.otherUser?.email ||
                                "User"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unblock(entry)}
                            disabled={restoringId === entry.otherId}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {restoringId === entry.otherId
                              ? "Unblocking..."
                              : "Unblock"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {section === "archived" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Archived polls
                  </CardTitle>
                  <CardDescription>
                    Polls you archived are hidden from the Polls tab. Restore
                    them here.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {archivedPolls.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground">
                      No archived polls.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {archivedPolls.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {entry.poll?.title || "Untitled poll"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Archived{" "}
                              {new Date(entry.archivedAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unarchivePoll(entry.id)}
                            disabled={unarchivingId === entry.id}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {unarchivingId === entry.id
                              ? "Restoring..."
                              : "Restore"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Archived posts
                  </CardTitle>
                  <CardDescription>
                    Community posts you archived are hidden from the Board.
                    Restore them here.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {archivedPosts.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground">
                      No archived posts.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {archivedPosts.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {entry.post?.title || "Untitled post"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Archived{" "}
                              {new Date(entry.archivedAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unarchivePost(entry.id)}
                            disabled={unarchivingId === entry.id}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {unarchivingId === entry.id
                              ? "Restoring..."
                              : "Restore"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {section === "billing" && (
            <Card>
              <CardHeader>
                <CardTitle>Billing & subscription</CardTitle>
                <CardDescription>
                  Manage your plan, payment method, and invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current plan</p>
                      <p className="text-xl font-bold">
                        {isActive ? "Pro" : "Free"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {subscription?.status
                        ? subscription.status.charAt(0).toUpperCase() +
                          subscription.status.slice(1)
                        : "No subscription"}
                    </span>
                  </div>

                  {isActive && (
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {subscription.amount != null && (
                        <p>
                          {formatMoney(
                            subscription.amount,
                            subscription.currency
                          )}
                          {subscription.interval
                            ? ` / ${subscription.interval}`
                            : ""}
                        </p>
                      )}
                      {subscription.current_period_end && (
                        <p>
                          {subscription.cancel_at_period_end
                            ? `Cancels on ${formatEpoch(
                                subscription.current_period_end
                              )}`
                            : `Renews on ${formatEpoch(
                                subscription.current_period_end
                              )}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  {isActive ? (
                    <Button onClick={openBillingPortal} disabled={billingBusy}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {billingBusy ? "Opening..." : "Manage billing"}
                    </Button>
                  ) : (
                    <Button onClick={() => router.push("/pricing")}>
                      Upgrade plan
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => router.push("/pricing")}
                  >
                    View plans
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment method, invoice history, and cancellation are handled
                  securely on Stripe.
                </p>
              </CardContent>
            </Card>
          )}

          {section === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Choose how Alexandria looks to you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label className="mb-3 block">Theme</Label>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const selected = mounted && theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                          selected
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
