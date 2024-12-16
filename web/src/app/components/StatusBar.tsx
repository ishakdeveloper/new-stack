"use client";

import { useSocket } from "@/providers/SocketProvider";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const StatusBar = () => {
  const { isConnected } = useSocket();
  const [showConnected, setShowConnected] = useState(false);
  const [showDisconnected, setShowDisconnected] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setShowDisconnected(false);
      setShowConnected(true);
      // Hide the connected message after 3 seconds
      setTimeout(() => {
        setShowConnected(false);
      }, 3000);
    } else {
      setShowConnected(false);
      setShowDisconnected(true);
    }
  }, [isConnected]);

  return (
    <>
      {showConnected && (
        <div className="fixed top-0 left-0 right-0 bg-green-500 text-white py-1 text-center text-sm z-50">
          Connected to server
        </div>
      )}
      {showDisconnected && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white py-1 text-center text-sm z-50">
          You are currently offline
        </div>
      )}
    </>
  );
};

export default StatusBar;
