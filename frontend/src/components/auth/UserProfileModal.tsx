"use client";

import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@heroui/react";

interface WalletData {
  address?: string;
  publicKey?: string;
  name?: string;
  [key: string]: unknown; // Allow for additional properties
}

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
    data: WalletData;
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
  <ModalContent className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-xl w-full max-w-md mx-auto p-4 sm:p-6 modal-content min-h-[400px] flex flex-col
    mobile:mx-4 mobile:my-8 mobile:max-w-[calc(100vw-2rem)] mobile:min-h-[350px]
    xs:mx-3 xs:my-6 xs:max-w-[calc(100vw-1.5rem)] xs:p-3
    sm:mx-auto sm:my-auto sm:max-w-md">
    {() => (
      <>
        <ModalHeader className="flex flex-col gap-1 text-center mobile:pb-3 xs:pb-2">
          <h3 className="text-xl font-bold text-white mobile:text-lg xs:text-base">Your Profile</h3>
        </ModalHeader>
        <ModalBody className="px-2 sm:px-4 py-4 flex-1 flex flex-col mobile:px-1 mobile:py-3 xs:px-0 xs:py-2">
          <div className="space-y-4 mobile:space-y-3 xs:space-y-2">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg
              mobile:p-3 mobile:flex-col mobile:gap-2 mobile:text-center
              xs:p-2 xs:gap-1">
              <div className="flex items-center gap-3 mobile:flex-col mobile:gap-2 xs:gap-1">
                <span className="text-2xl mobile:text-xl xs:text-lg">{userInfo?.emoji}</span>
                <div>
                  <p className="text-white font-medium mobile:text-sm xs:text-xs mobile:break-all">
                    {userInfo?.username || userInfo?.email?.split('@')[0]}
                  </p>
                </div>
              </div>
            </div>

            {userInfo?.email && (
              <div className="w-full bg-gray-700 text-white rounded-md px-4 py-2 text-center font-medium text-sm truncate
                mobile:px-3 mobile:py-1.5 mobile:text-xs mobile:break-all mobile:whitespace-normal
                xs:px-2 xs:py-1 xs:text-[10px]">
                {userInfo.email}
              </div>
            )}

            <Button
              className="w-full bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA]
                 text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black
                 hover:text-white px-4 py-2 rounded-md border border-white shadow-md
                 mobile:px-3 mobile:py-1.5 mobile:text-sm
                 xs:px-2 xs:py-1 xs:text-xs"
              onPress={onConnectWallet}
            >
              {connectedWalletInfo?.address ? (
                <div className="flex items-center justify-center gap-2 mobile:gap-1 xs:gap-0.5">
                  <span className="mobile:text-sm xs:text-xs">{connectedWalletInfo.emoji}</span>
                  <span className="text-xs truncate max-w-[100px] md:max-w-[150px] md:inline-block
                    mobile:text-[10px] mobile:max-w-[80px]
                    xs:text-[9px] xs:max-w-[60px]">
                    {connectedWalletInfo.address.substring(0, 4)}...{connectedWalletInfo.address.substring(connectedWalletInfo.address.length - 4)}
                  </span>
                </div>
              ) : (
                <span className="mobile:text-sm xs:text-xs">Connect Wallet</span>
              )}
            </Button>

            <Button
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md
                mobile:px-3 mobile:py-1.5 mobile:text-sm
                xs:px-2 xs:py-1 xs:text-xs"
              onPress={onLogout}
            >
              <span className="mobile:text-sm xs:text-xs">Logout</span>
            </Button>
          </div>
        </ModalBody>
      </>
    )}
  </ModalContent>
</Modal>
  );
}