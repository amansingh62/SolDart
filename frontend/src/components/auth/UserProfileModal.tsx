"use client";

import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: {
    username?: string;
    email?: string;
    emoji?: string;
  } | null;
  onConnectWallet: () => void;
  onLogout: () => void;
  connectedWalletInfo?: {
    type: "wallet" | "email";
    data: any;
    emoji: string;
    address?: string;
  } | null;
}

export function UserProfileModal({
  isOpen,
  onClose,
  userInfo,
  onConnectWallet,
  onLogout,
  connectedWalletInfo
}: UserProfileModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" placement="center" className="z-[100] modal">
      <ModalContent className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-xl w-full max-w-md mx-auto p-4 sm:p-6 modal-content min-h-[400px] flex flex-col">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-center">
              <h3 className="text-xl font-bold text-white">Your Profile</h3>
            </ModalHeader>
            <ModalBody className="px-2 sm:px-4 py-4 flex-1 flex flex-col">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{userInfo?.emoji}</span>
                    <div>
                      <p className="text-white font-medium">{userInfo?.username || userInfo?.email?.split('@')[0]}</p>
                      <p className="text-gray-400 text-sm">{userInfo?.email}</p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA]
                     text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black
                     hover:text-white px-4 py-2 rounded-md border border-white shadow-md"
                  onPress={onConnectWallet}
                >
                  {connectedWalletInfo?.address ? (
                    <div className="flex items-center justify-center gap-2">
                      <span>{connectedWalletInfo.emoji}</span>
                      <span className="text-xs truncate max-w-[100px] md:max-w-[150px] md:inline-block">
                        {connectedWalletInfo.address.substring(0, 4)}...{connectedWalletInfo.address.substring(connectedWalletInfo.address.length - 4)}
                      </span>
                    </div>
                  ) : (
                    "Connect Wallet"
                  )}
                </Button>

                <Button
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                  onPress={onLogout}
                >
                  Logout
                </Button>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}