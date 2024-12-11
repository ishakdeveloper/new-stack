"use client";

import { Icons } from "./ui/icons";

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <Icons.spinner className="animate-spin" />
    </div>
  );
}
