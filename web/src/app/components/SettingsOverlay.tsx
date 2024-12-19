"use client";

import * as React from "react";
import {
  Bell,
  Palette,
  Settings,
  X,
  User,
  Keyboard,
  Lock,
  Video,
  MessageSquare,
  Volume2,
  Globe,
  Shield,
  Gift,
  CreditCard,
  Users,
  Layout,
  Smartphone,
  Link,
  Zap,
  Package,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

import {
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarGroupContent,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { authClient } from "@/utils/authClient";
import { useRouter } from "next/navigation";

const settingsSections = [
  {
    group: "USER SETTINGS",
    items: [
      { id: "account", label: "My Account", icon: User },
      { id: "profiles", label: "Profiles", icon: User },
      { id: "privacy", label: "Privacy & Safety", icon: Lock },
      { id: "content", label: "Content & Social", icon: MessageSquare },
      { id: "data", label: "Data & Privacy", icon: Shield },
      { id: "family", label: "Family Center", icon: Users },
      { id: "apps", label: "Authorized Apps", icon: Layout },
      { id: "devices", label: "Devices", icon: Smartphone },
      { id: "connections", label: "Connections", icon: Link },
      { id: "clips", label: "Clips & Activities", icon: Video },
    ],
  },
  {
    group: "BILLING SETTINGS",
    items: [
      { id: "nitro", label: "Nitro", icon: Gift },
      { id: "server-boost", label: "Server Boost", icon: Zap },
      { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
      { id: "inventory", label: "Gift Inventory", icon: Package },
      { id: "billing", label: "Billing", icon: CreditCard },
    ],
  },
  {
    group: "APP SETTINGS",
    items: [
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "accessibility", label: "Accessibility", icon: Shield },
      { id: "voice", label: "Voice & Video", icon: Video },
      { id: "text", label: "Text & Messages", icon: MessageSquare },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "keybinds", label: "Keybinds", icon: Keyboard },
      { id: "language", label: "Language", icon: Globe },
      { id: "streamer", label: "Streamer Mode", icon: Video },
    ],
  },
  {
    group: "LOGOUT",
    items: [{ id: "logout", label: "Log Out", icon: LogOut }],
  },
];

export function SettingsOverlay() {
  const [activeSection, setActiveSection] = React.useState("account");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-full h-full p-0 overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>User Settings</DialogTitle>
        </VisuallyHidden>
        <div className="flex h-full">
          <SettingsSidebar
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />
          <div className="flex-1 relative">
            <DialogClose className="absolute right-4 top-4 z-10" asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
            <SettingsContent activeSection={activeSection} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SettingsSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export function SettingsSidebar({
  activeSection,
  setActiveSection,
}: SettingsSidebarProps) {
  return (
    <aside className="h-full border-r bg-secondary/50">
      <div className="p-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-3 py-1.5 text-sm rounded-sm bg-background border-0 placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-64px)]">
        {settingsSections.map((section) => (
          <div key={section.group} className="mb-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {section.group}
            </div>
            <div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 px-3 py-1.5 w-full hover:bg-accent/50 transition-colors ${
                    activeSection === item.id
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

interface SettingsContentProps {
  activeSection: string;
}

export function SettingsContent({ activeSection }: SettingsContentProps) {
  const currentSection = settingsSections
    .flatMap((section) => section.items)
    .find((item) => item.id === activeSection);

  const router = useRouter();

  const handleLogOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        credentials: "include",
        redirect: "follow",
      },
    });

    router.push("/login");
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-10 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">{currentSection?.label}</h2>
        <div className="space-y-6">
          {activeSection === "account" && (
            <>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center">
                      <User className="h-10 w-10" />
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2"
                    >
                      Edit
                    </Button>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Username#1234</h3>
                    <p className="text-sm text-muted-foreground">Online</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Display Name</p>
                      <p className="text-sm text-muted-foreground">
                        This is how others see you
                      </p>
                    </div>
                    <Button variant="outline">Edit</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        user@example.com
                      </p>
                    </div>
                    <Button variant="outline">Change</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Phone Number</p>
                      <p className="text-sm text-muted-foreground">
                        Add a phone number for additional security
                      </p>
                    </div>
                    <Button variant="outline">Add</Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-2">Account Security</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-muted-foreground">
                        Change your password
                      </p>
                    </div>
                    <Button variant="outline">Change</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security
                      </p>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-2">Account Removal</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Disable Account</p>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable your account
                      </p>
                    </div>
                    <Button variant="outline">Disable</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account
                      </p>
                    </div>
                    <Button variant="destructive">Delete</Button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-4">Log Out</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to log out? You'll need to sign in again
                to access your account.
              </p>
              <div className="flex justify-end gap-4">
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive" onClick={handleLogOut}>
                  Log Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
