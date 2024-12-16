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

const settingsSections = [
  {
    group: "User Settings",
    items: [
      { id: "account", label: "My Account", icon: User },
      { id: "privacy", label: "Privacy & Safety", icon: Lock },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "accessibility", label: "Accessibility", icon: Shield },
      { id: "keybinds", label: "Keybinds", icon: Keyboard },
    ],
  },
  {
    group: "App Settings",
    items: [
      { id: "voice", label: "Voice & Video", icon: Video },
      { id: "text", label: "Text & Messages", icon: MessageSquare },
      { id: "audio", label: "Audio", icon: Volume2 },
      { id: "language", label: "Language", icon: Globe },
    ],
  },
  {
    group: "Billing Settings",
    items: [
      { id: "nitro", label: "Nitro", icon: Gift },
      { id: "billing", label: "Billing", icon: CreditCard },
    ],
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
      <DialogContent className="max-w-full h-full p-0">
        <VisuallyHidden>
          <DialogTitle>User Settings</DialogTitle>
        </VisuallyHidden>
        <SidebarProvider>
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
        </SidebarProvider>
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
    <aside className="w-[240px] h-full border-r">
      <div className="p-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-3 py-2 text-sm rounded-md border"
          />
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-64px)]">
        {settingsSections.map((section) => (
          <div key={section.group} className="mb-4">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
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
                  <span>{item.label}</span>
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

  return (
    <div className="h-full">
      <div className="p-10 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">{currentSection?.label}</h2>
        <div className="space-y-6">
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-2">Section Title</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Setting Name</p>
                  <p className="text-sm text-muted-foreground">
                    Description of what this setting does
                  </p>
                </div>
                <Button variant="outline">Action</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Another Setting</p>
                  <p className="text-sm text-muted-foreground">
                    Description of what this setting does
                  </p>
                </div>
                <Button variant="outline">Action</Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-2">Another Section</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Setting Name</p>
                  <p className="text-sm text-muted-foreground">
                    Description of what this setting does
                  </p>
                </div>
                <Button variant="outline">Action</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
