import { Users } from "lucide-react";

import { Button } from "@web/components/ui/button";

interface FriendsHeaderProps {
  activeTab: "all" | "online" | "pending" | "blocked" | "add";
  setActiveTab: (tab: "all" | "online" | "pending" | "blocked" | "add") => void;
  pendingRequestsCount?: number;
}

export const FriendsHeader = ({
  activeTab,
  setActiveTab,
  pendingRequestsCount,
}: FriendsHeaderProps) => {
  return (
    <div className="p-4 border-b flex flex-col gap-4">
      <div className="flex items-center">
        <Users className="mr-2 h-5 w-5" />
        <div className="font-bold">Friends</div>
      </div>
      <div className="flex space-x-2">
        <Button
          variant={activeTab === "online" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("online")}
        >
          Online
        </Button>
        <Button
          variant={activeTab === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("all")}
        >
          All
        </Button>
        <Button
          variant={activeTab === "pending" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("pending")}
          className="relative"
        >
          Pending
          {pendingRequestsCount && pendingRequestsCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingRequestsCount}
            </div>
          )}
        </Button>
        <Button
          variant={activeTab === "blocked" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("blocked")}
        >
          Blocked
        </Button>
        <Button
          variant={activeTab === "add" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("add")}
        >
          Add Friend
        </Button>
      </div>
    </div>
  );
};
