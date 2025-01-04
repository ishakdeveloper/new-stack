"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, X, User, Camera, LogOut } from "lucide-react";

import { Button } from "@web/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogClose,
} from "@web/components/ui/dialog";
import { ScrollArea } from "@web/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@web/components/ui/form";
import { Input } from "@web/components/ui/input";
import { Textarea } from "@web/components/ui/textarea";
import { Alert, AlertDescription } from "@web/components/ui/alert";
import { useUserStore } from "@web/stores/useUserStore";
import { authClient } from "@web/utils/authClient";
import { useQuery } from "@tanstack/react-query";
import { client } from "@web/utils/client";
import { useEffect } from "react";

const userProfileSchema = z.object({
  name: z.string().min(2).max(32),
  nickname: z.string().min(2).max(32).optional(),
  email: z.string().email(),
  bio: z.string().max(190).optional(),
  pronouns: z.string().max(32).optional(),
  customStatus: z.string().max(128).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

type UserProfileFormValues = z.infer<typeof userProfileSchema>;

export function SettingsOverlay() {
  const router = useRouter();
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const currentUserId = useUserStore((state) => state.currentUser?.id);

  useEffect(() => {
    console.log("currentUserId", currentUserId);
  }, []);

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user", currentUserId],
    queryFn: async () => {
      const response = await client.api
        .users({ id: currentUserId ?? "" })
        .get();
      return response.data?.[0] ?? null;
    },
  });

  const form = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      name: user?.name ?? "",
      nickname: user?.nickname ?? "",
      email: user?.email ?? "",
      bio: user?.bio ?? "",
      pronouns: user?.pronouns ?? "",
      customStatus: user?.customStatus ?? "",
      accentColor: user?.accentColor ?? "#000000",
    },
  });

  React.useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onSubmit = async (data: UserProfileFormValues) => {
    console.log(data);
  };

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        credentials: "include",
      },
    });

    router.push("/login");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        {hasUnsavedChanges && (
          <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background z-50">
            <Alert className="bg-primary">
              <AlertDescription className="flex items-center justify-between">
                <span>
                  You have unsaved changes. Make sure to save before closing.
                </span>
                <Button onClick={form.handleSubmit(onSubmit)} type="submit">
                  Save Changes
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <DialogTitle className="text-2xl font-bold">
            User Settings
          </DialogTitle>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </div>

        <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
          <div className="space-y-8">
            {/* Banner and Profile Picture */}
            <div className="relative mb-24">
              <div className="h-32 bg-accent rounded-lg relative">
                <div className="absolute inset-0 bg-cover bg-center rounded-lg" />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 right-2"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Change Banner
                </Button>
              </div>

              <div className="absolute -bottom-12 left-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-background border-4 border-background overflow-hidden">
                    <div className="h-full w-full bg-accent flex items-center justify-center">
                      <User className="h-12 w-12" />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About Me</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Tell us about yourself"
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pronouns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pronouns</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="they/them" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Status</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="What's on your mind?" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            {...field}
                            type="color"
                            className="w-12 h-12 p-1"
                          />
                          <Input {...field} className="flex-1" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-start items-center pt-6">
                  <Button type="submit" disabled={!hasUnsavedChanges}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
