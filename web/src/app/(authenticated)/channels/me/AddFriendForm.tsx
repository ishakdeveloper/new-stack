import { Button } from "@web/components/ui/button";

import { Input } from "@web/components/ui/input";

interface AddFriendFormProps {
  friendUsername: string;
  setFriendUsername: (username: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export const AddFriendForm = ({
  friendUsername,
  setFriendUsername,
  onSubmit,
  isPending,
}: AddFriendFormProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-muted-foreground">
        You can add friends with their username. It's case sensitive!
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex gap-2 w-full"
      >
        <Input
          placeholder="Enter a username"
          value={friendUsername}
          onChange={(e) => setFriendUsername(e.target.value)}
          className="flex-grow"
        />
        <Button
          variant="default"
          size="default"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Sending..." : "Send Friend Request"}
        </Button>
      </form>
    </div>
  );
};
