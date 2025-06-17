"use client";

import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import axios, { AxiosError } from "axios";
import { toast } from "react-hot-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: { username?: string; email?: string; emoji?: string }) => void;
}

interface AuthResponse {
  success?: boolean;
  statusCode?: number;
  user?: {
    username?: string;
    email?: string;
    emoji?: string;
  };
  data?: {
    user?: {
      username?: string;
      email?: string;
      emoji?: string;
    };
  };
}

interface ErrorResponse {
  message?: string;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isSignUp ? "/auth/register" : "/auth/login";
      const response = await axios.post<AuthResponse>(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${endpoint}`,
        { email, password, username, name },
        { withCredentials: true }
      );

      if (response.data.success || response.data.statusCode === 201) {
        toast.success(isSignUp ? "Account created successfully! Welcome to SolEcho!" : "Logged in successfully!");

        setEmail("");
        setPassword("");
        setUsername("");
        setName("");

        onSuccess({
          username: response.data.user?.username || response.data.data?.user?.username,
          email: response.data.user?.email || response.data.data?.user?.email,
          emoji: response.data.user?.emoji || response.data.data?.user?.emoji
        });
        onClose();

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      toast.error(axiosError.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/google`;
    } catch {
      toast.error("Failed to initiate Google authentication");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" placement="center" className="z-[100] modal">
      <ModalContent className="bg-gradient-to-br from-[#32CD32] via-[#7CFC00] to-[#90EE90] rounded-lg shadow-xl 
                           w-full max-w-xs sm:max-w-md mx-auto 
                           p-3 sm:p-4 md:p-6 
                           m-2 sm:m-4 
                           modal-content">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-center px-0 sm:px-2">
              <h3 className="text-lg sm:text-xl font-bold text-black">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h3>
            </ModalHeader>
            <ModalBody className="px-1 sm:px-2 md:px-4 py-3 sm:py-4">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {isSignUp && (
                  <>
                    <Input
                      type="text"
                      label=""
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-white text-black text-sm sm:text-base"
                      size="sm"
                    />
                    <Input
                      type="text"
                      label=""
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="bg-white text-black text-sm sm:text-base"
                      size="sm"
                    />
                  </>
                )}
                <Input
                  type="email"
                  label=""
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white text-black text-sm sm:text-base"
                  size="sm"
                />
                <Input
                  type="password"
                  label=""
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white text-black text-sm sm:text-base"
                  size="sm"
                />
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:!bg-white hover:text-black
                           px-3 sm:px-4 py-2 rounded-md border border-black shadow-md
                           text-sm sm:text-base"
                  size="sm"
                  isLoading={isLoading}
                >
                  {isSignUp ? "Sign Up" : "Log In"}
                </Button>
              </form>

              <div className="mt-3 sm:mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-black"></div>
                  </div>
                  <div className="relative flex justify-center text-xs sm:text-sm">
                    <span className="px-2 bg-[#7CFC00] text-black">Or continue with</span>
                  </div>
                </div>

                <Button
                  className="w-full mt-3 sm:mt-4 bg-white text-black hover:bg-gray-100 
                           px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base"
                  size="sm"
                  onPress={handleGoogleAuth}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Icon icon="flat-color-icons:google" className="text-lg sm:text-xl" />
                    <span>Google</span>
                  </div>
                </Button>
              </div>

              <div className="mt-3 sm:mt-4 text-center">
                <button
                  type="button"
                  className="text-black hover:text-gray-700 text-xs sm:text-sm"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? "Already have an account? Log in" : "Don't have an account? Sign up"}
                </button>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}