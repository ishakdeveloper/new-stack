import Link from "next/link";
import { Avatar, AvatarFallback } from "@web/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@web/components/ui/context-menu";
import { eden, InferOutput } from "@web/utils/client";

interface Friend {
  id: string;
  name: string;
  email: string;
  image: string | null;
  conversationId: string | null;
  friendshipId: string;
}

interface FriendsGridProps {
  friends?: InferOutput["api"]["friendships"]["get"];
  onOpenConversation: (conversationId: string, friendId: string) => void;
  onRemoveFriend: (variables: { id: string }) => Promise<any>;
}

export const FriendsGrid = ({
  friends,
  onOpenConversation,
  onRemoveFriend,
}: FriendsGridProps) => {
  return (
    <div className="space-y-4">
      {friends?.map((friend) => (
        <ContextMenu key={friend.id}>
          <ContextMenuTrigger asChild>
            {friend.conversationId ? (
              <Link
                href={`/channels/me/${friend.conversationId}`}
                onClick={() =>
                  onOpenConversation(friend.conversationId!, friend.id)
                }
              >
                <div className="flex items-center mb-4 p-2 hover:bg-accent rounded-md cursor-pointer">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>{friend.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <div className="font-semibold">{friend.name}</div>
                    <div className="text-sm text-muted-foreground">Online</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center mb-4 p-2 hover:bg-accent rounded-md cursor-pointer">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarFallback>{friend.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <div className="font-semibold">{friend.name}</div>
                  <div className="text-sm text-muted-foreground">Online</div>
                </div>
              </div>
            )}
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => onRemoveFriend({ id: friend.friendshipId })}
            >
              Remove Friend
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );
};
