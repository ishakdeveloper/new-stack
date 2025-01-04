import { Avatar, AvatarFallback } from "@web/components/ui/avatar";
import { Button } from "@web/components/ui/button";

interface PendingRequest {
  id: string;
  type: "incoming" | "outgoing";
  requesterId: string;
  addresseeId: string;
  requesterName: string;
  createdAt: Date;
  requester: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface PendingFriendsListProps {
  requests?: PendingRequest[];
  onAccept: (variables: { id: string }) => Promise<any>;
  onDecline: (variables: { id: string }) => Promise<any>;
  isLoading: boolean;
}

export const PendingFriendsList = ({
  requests,
  onAccept,
  onDecline,
  isLoading,
}: PendingFriendsListProps) => {
  if (isLoading) return <div>Loading pending requests...</div>;
  if (!requests?.length) return <div>No pending friend requests</div>;

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center mb-4 p-2 hover:bg-accent rounded-md"
        >
          <Avatar className="h-10 w-10 mr-3">
            <AvatarFallback>{request.requester.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <div className="font-semibold">{request.requester.name}</div>
            <div className="text-sm text-muted-foreground">
              {request.type === "incoming" ? (
                <span className="text-blue-500">Incoming Friend Request</span>
              ) : (
                <span className="text-green-500">Outgoing Friend Request</span>
              )}
            </div>
          </div>
          {request.type === "incoming" && (
            <div className="flex space-x-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => onAccept({ id: request.id })}
              >
                Accept
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDecline({ id: request.id })}
              >
                Decline
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
