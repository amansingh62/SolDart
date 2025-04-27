"use client";

import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { shortenWalletAddress } from "@/lib/walletUtils";
import { toast } from "react-hot-toast";

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
  const handleConnectWallet = () => {
    // Set a flag in localStorage to indicate the modal was opened from user profile
    localStorage.setItem("walletModalSource", "userProfile");

    // Call the original onConnectWallet handler
    onConnectWallet();
  };

  // Removed debug logging to clean up console output

  if (!userInfo) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" placement="center" className="z-[100] modal" data-auth-allowed="true">
      <ModalContent className="bg-white rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm mx-auto p-4 sm:p-6 modal-content">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-center">
              <h3 className="text-lg font-bold">Your Profile</h3>
            </ModalHeader>
            <ModalBody className="px-2 sm:px-4 py-4">
              <div className="flex flex-col items-center justify-center p-4 sm:p-6 border rounded-lg shadow-md bg-gray-100 w-full mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] 
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black 
             hover:text-white flex items-center justify-center text-2xl mb-3">
                  {userInfo.emoji || "👤"}
                </div>
                {userInfo.username && (
                  <p className="text-lg font-semibold mb-1">@{userInfo.username}</p>
                )}
                {userInfo.email && (
                  <p className="text-sm text-gray-500 mb-4">{userInfo.email}</p>
                )}
              </div>

              {/* Display wallet information if connected */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-6 border rounded-lg shadow-md bg-gray-100 w-full mb-4">
                {connectedWalletInfo && connectedWalletInfo.address ? (
                  <>
                    <div className="mb-2">
                      <Icon
                        icon={connectedWalletInfo.data?.blockchain === "phantom" ? "cryptocurrency:phantom" :
                          connectedWalletInfo.data?.blockchain === "solflare" ? "cryptocurrency:solflare" :
                            connectedWalletInfo.data?.blockchain === "backpack" ? "cryptocurrency:backpack" :
                              "cryptocurrency:sol"}
                        className="text-3xl"
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-lg font-semibold">{shortenWalletAddress(connectedWalletInfo.address)}</p>
                      <button
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        onClick={async () => {
                          try {
                            if (connectedWalletInfo.address) {
                              await navigator.clipboard.writeText(connectedWalletInfo.address);
                              toast.success('Wallet address copied to clipboard!');
                            }
                          } catch (err) {
                            console.error('Failed to copy address:', err);
                            toast.error('Failed to copy address');
                          }
                        }}
                      >
                        <Icon icon="mdi:content-copy" className="text-lg text-gray-600" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{connectedWalletInfo.data?.blockchain || "wallet"} connected</p>
                  </>
                ) : (
                  <Button
                    className="w-full rounded-lg bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] 
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black 
             hover:text-white  shadow-xl"
                    onPress={handleConnectWallet}
                  >
                    Connect Wallet
                  </Button>
                )}
              </div>

              <Button
                className="w-full rounded-lg bg-red-500 text-white hover:bg-red-700 transition font-bold"
                onPress={onLogout}
              >
                Logout
              </Button>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}