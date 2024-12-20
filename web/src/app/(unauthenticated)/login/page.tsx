"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/ui/icons";
import { authClient } from "@/utils/authClient";
import { useUserStore } from "@/stores/useUserStore";
import { Opcodes, useSocket } from "@/providers/SocketProvider";

type FormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export default function LoginScreen() {
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const { sendMessage } = useSocket();

  const onSubmit = async (data: FormData) => {
    await authClient.signIn
      .email({
        email: data.email,
        password: data.password,
        callbackURL: "/channels/me",
      })
      .then((user) => {
        // Send auth:login message to the server
        sendMessage({
          op: Opcodes.Identify,
          d: user.data?.user,
        });
      });
  };

  const handleSocialLogin = (provider: string) => {
    // Handle social login logic here
    console.log(`Login attempted with ${provider}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" {...register("rememberMe")} />
                <label
                  htmlFor="rememberMe"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </label>
              </div>
            </div>
            <Button
              className="w-full mt-6"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-6">
            <Separator />
            <p className="text-center text-sm text-gray-600 mt-4 mb-4">
              Or continue with
            </p>
            <div className="flex flex-col space-y-2">
              <Button
                variant="outline"
                onClick={() => handleSocialLogin("Google")}
                className="w-full"
              >
                <Icons.google className="mr-2 h-4 w-4" /> Sign in with Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialLogin("Discord")}
                className="w-full"
              >
                <Icons.discord className="mr-2 h-4 w-4" /> Sign in with Discord
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialLogin("Apple")}
                className="w-full"
              >
                <Icons.apple className="mr-2 h-4 w-4" /> Sign in with Apple
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <a href="#" className="text-sm text-blue-600 hover:underline">
            Forgot password?
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
