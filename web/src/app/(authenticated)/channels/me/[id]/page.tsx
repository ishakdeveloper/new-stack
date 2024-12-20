import React from "react";
import PrivateChatbox from "./PrivateChatbox";
import UserProfile from "./UserProfile";

export default async function PrivateChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const slug = (await params).id;

  return (
    <div className="flex w-full">
      <PrivateChatbox slug={slug} />
      {/* <UserProfile /> */}
    </div>
  );
}
