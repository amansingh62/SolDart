"use client";

import React from "react";
import { Avatar, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Badge } from "@heroui/react";
import { Icon } from "@iconify/react";

interface DartPostProps {
  author: string;
  avatar: string;
  content: string;
  time: string;
  views: string;
  onDelete: () => void;
  onPin: () => void;
}

const DartPost: React.FC<DartPostProps> = ({ author, avatar, content, time, views, onDelete, onPin }) => {
  const walletAddress = "0xD5ake84d339A5b754527154b2C16b28s37C50B407"; // Example wallet address

  // Function to shorten wallet address (first 6 & last 4 characters)
  const shortWallet = (address: string) => 
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="border-b border-default-200 p-4 shadow-[0px_4px_15px_rgba(128,128,128,0.4)] mb-6">
      <div className="flex justify-between">
        <div className="flex gap-3">
          <Avatar src={avatar} size="sm" />
          <div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{author}</span>
                <Badge color="primary" variant="flat">
                  <Icon icon="lucide:check" className="text-xs" />
                </Badge>
              </div>

              {/* Wallet Address & Views in the Same Line */}
              <div className="flex items-center gap-4 text-default-500 text-xs">
                <span>{shortWallet(walletAddress)}</span>
                <span className="flex items-center gap-1">
                  <Icon icon="lucide:eye" />
                  {views}
                </span>
              </div>
            </div>

            <p className="mt-1">{content}</p>
            
            {/* Icons Section */}
            <div className="flex items-center gap-4 mt-2 text-default-500 text-sm">
              {/* 1hr Timing */}
              <span className="flex items-center gap-1">
                <Icon icon="lucide:clock" />
                1hr
              </span>

              {/* Share Icon */}
              <span className="flex items-center gap-1">
                <Icon icon="lucide:repeat" />
                43
              </span>

              {/* Comment Icon (Placed at the End) */}
              <span className="flex items-center gap-1">
                <Icon icon="lucide:message-square" />
                43
              </span>
            </div>
          </div>
        </div>

        {/* Dropdown with White Wrapper */}
        <Dropdown>
          <DropdownTrigger>
            <Button isIconOnly variant="light" size="sm">
              <Icon icon="lucide:more-vertical" className="text-xl" />
            </Button>
          </DropdownTrigger>
          
          {/* Ensure White Background and Shadow for the Wrapper */}
          <DropdownMenu className="bg-white shadow-lg rounded-lg">
            <DropdownItem key="pin" startContent={<Icon icon="lucide:pin" />} onPress={onPin}>
              Pin Echo
            </DropdownItem>
            <DropdownItem 
              key="delete" 
              className="text-danger" 
              color="danger"
              startContent={<Icon icon="lucide:trash" />}
              onPress={onDelete}
            >
              Delete Echo
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
};

export default DartPost;
