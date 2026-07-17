"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageCircle, BarChart3, MessageSquare } from "lucide-react";
import MatchesView from "./matches-view";
import ChatView from "./chat-view";
import ProfileView from "./profile-view";
import PollsView from "./polls-view";
import CommunityBoard from "./community-board";
import SettingsView from "./settings-view";

interface DashboardContentProps {
  userId: string;
}

export default function DashboardContent({ userId, polls,board }: { userId: string; polls: React.ReactNode; board: React.ReactNode; }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "matches");
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Keep the URL in sync with the active tab so links like ?tab=settings
  // always trigger a change (avoids a "stuck" query param).
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.replace(`/dashboard?tab=${value}`, { scroll: false });
  };

  const handleStartChat = (match: any) => {
    setSelectedMatch(match);
    handleTabChange("chat");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Matches
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="polls" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Polls
          </TabsTrigger>
          <TabsTrigger value="board" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Board
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          <MatchesView userId={userId} onStartChat={handleStartChat} />
        </TabsContent>

        <TabsContent value="chat">
          <ChatView userId={userId} initialMatch={selectedMatch} />
        </TabsContent>

        <TabsContent value="polls">
					{polls}
        </TabsContent>

        <TabsContent value="board">
					<CommunityBoard userId={userId}/>
        </TabsContent>

        <TabsContent value="profile">
          <ProfileView userId={userId} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsView userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
