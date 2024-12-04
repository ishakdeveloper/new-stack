"use client";

import { useSocket } from "@/providers/SocketProvider";
import { authClient } from "@/utils/authClient";
import { client } from "@/utils/client";
import { InsertMessage } from "@repo/server/src/database/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function Chat({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const session = authClient.useSession();
  const { socket, isConnected } = useSocket();
  const router = useRouter();

  const [inputText, setInputText] = useState("");

  // Query for initial messages
  const { data: initialMessages } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => client.api.rooms({ id: roomId }).messages.get(),
  });

  const { data: initialUsers } = useQuery({
    queryKey: ["users", roomId],
    queryFn: () => client.api.rooms({ id: roomId }).users.get(),
  });

  const { data: roomData } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => client.api.rooms({ id: roomId }).get(),
  });

  const leaveRoom = useMutation({
    mutationFn: (roomId: string) =>
      client.api.rooms({ id: roomId }).leave.delete(
        {
          userId: session?.data?.user?.id ?? "",
        },
        { query: { userId: session?.data?.user?.id ?? "" } }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["users", roomId] });

      socket?.send({
        type: "room:leave",
        data: { roomId },
      });

      router.push("/rooms");
    },
  });

  // Mutation for sending messages
  const sendMessage = useMutation({
    mutationFn: (message: InsertMessage) =>
      client.api.messages.post(message, {
        query: { userId: session?.data?.user?.id ?? "", roomId },
      }),
    onSuccess: (data) => {
      console.log("Message sent successfully", data.data);

      // Send WebSocket event
      socket?.send({
        type: "message:send",
        // @ts-ignore
        data: data.data,
      });

      // Scroll to bottom
      scrollToBottom();
    },
  });

  // Scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  useEffect(() => {
    console.log("users:", initialUsers);
    console.log("room:", roomData);
  }, [initialUsers, roomData]);

  useEffect(() => {
    scrollToBottom();
  }, [initialMessages]);

  useEffect(() => {
    if (!socket) return;

    // Define the handler
    const handleMessage = (event: { data: { type: string; data: any } }) => {
      const { type, data } = event.data;
      if (type === "message:send") {
        console.log("New message received", data);

        // Update state or cache
        queryClient.setQueryData(["messages", roomId], (old: any) => {
          const messages = old?.data || [];
          return {
            ...old,
            data: [...messages, data],
          };
        });

        scrollToBottom();
      }

      if (type === "room:join") {
        queryClient.invalidateQueries({ queryKey: ["users", roomId] });
      }

      if (type === "room:leave") {
        console.log("User left room", data);
        queryClient.invalidateQueries({ queryKey: ["users", roomId] });
      }
    };

    // Join the room and attach the listener
    socket.send({
      type: "room:join",
      data: { roomId },
    });

    socket.on("message", handleMessage);

    return () => {
      socket.off("message", handleMessage);
    };
  }, [socket, queryClient]);

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage.mutate({
      text: inputText,
      userId: session?.data?.user?.id ?? "",
    });

    setInputText("");
  };

  const handleLeaveRoom = async (roomId: string) => {
    leaveRoom.mutate(roomId);
  };

  return (
    <div className="flex max-w-6xl mx-auto h-[calc(100vh-200px)]">
      <div className="flex flex-col flex-1">
        <p className="p-4">
          {isConnected ? "Connected to WebSocket" : "Disconnected"}
        </p>
        <div className="flex justify-between items-center p-4">
          <h1 className="text-2xl font-bold">{roomData?.data?.[0]?.name}</h1>
          <button
            onClick={() => handleLeaveRoom(roomData?.data?.[0]?.id ?? "")}
          >
            Leave Room
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-4 mb-4">
          {initialMessages?.data?.map((msg, idx) => {
            const isMyMessage = msg.userId === session?.data?.user?.id;
            const messageDate = new Date(msg.createdAt).toLocaleString();

            return (
              <div
                key={idx}
                className={`flex ${
                  isMyMessage ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-lg p-4 shadow-sm max-w-[70%] ${
                    isMyMessage
                      ? "bg-blue-500 text-white ml-auto"
                      : "bg-white text-gray-900"
                  }`}
                >
                  <strong className="block mb-1 text-sm">
                    {msg.user?.name}
                  </strong>
                  {msg.text}
                  <div
                    className={`text-xs mt-2 ${
                      isMyMessage ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {messageDate}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t sticky bottom-0 bg-white p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <div className="w-64 border-l p-4 bg-gray-50">
        <h2 className="font-semibold text-lg mb-4">Room Members</h2>
        <div className="space-y-2">
          {initialUsers?.data?.map((user) => (
            <div key={user.user.id} className="flex items-center gap-2">
              {user.user.image && (
                <img
                  src={user.user.image}
                  alt={user.user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm">{user.user.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
