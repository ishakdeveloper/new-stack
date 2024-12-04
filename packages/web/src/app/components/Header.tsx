"use client";

import { authClient, Session } from "@/utils/authClient";
import { client } from "@/utils/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const router = useRouter();
  const session = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  };

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-gray-800">
              TaskApp
            </Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/rooms"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Rooms
            </Link>
          </nav>

          {session?.data?.session ? (
            <div className="flex items-center">
              <span className="text-gray-600 mr-2">
                {session.data.user.name}
              </span>
              <button
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <Link
                href="/login"
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
