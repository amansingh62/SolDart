import React from 'react';
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Avatar } from "@heroui/react";
import { formatDistanceToNow } from 'date-fns';

interface LiveChatMessage {
    _id: string;
    sender: {
        _id: string;
        username: string;
        profileImage: string;
    };
    text?: string;
    createdAt: string;
    seenBy: string[];
    hiddenFor?: string[];
    replyTo?: {
        _id: string;
        text?: string;
        sender: {
            username: string;
        }
    };
}

interface ChatMessageProps {
    message: LiveChatMessage;
    isOwnMessage: boolean;
    onlineUsers: { [key: string]: boolean };
    onReply: (message: LiveChatMessage) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    isOwnMessage,
    onlineUsers,
    onReply
}) => {
    return (
        <div
            className={`flex items-start gap-1.5 animate-fadeIn w-full mb-1.5 group ${isOwnMessage ? 'flex-row-reverse !justify-start' : ''}`}
        >
            <Avatar
                src={message.sender.profileImage || '/svg.png'}
                alt={message.sender.username}
                className={`w-7 h-7 mt-1 flex-shrink-0 ${isOwnMessage ? 'order-2' : 'order-1'}`}
            />
            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%] ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                <div className={`flex items-center gap-1 mb-0.5 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-xs">{message.sender.username}</span>
                    <span className="text-[10px] text-gray-500">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                    {onlineUsers[message.sender._id] && (
                        <span className="w-1.5 h-1.5 bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black rounded-full"></span>
                    )}
                </div>

                {message.replyTo && (
                    <div className={`text-xs text-gray-500 mb-0.5 flex items-center gap-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <Icon icon="lucide:reply" width={10} />
                        <span>Replying to {message.replyTo.sender.username}</span>
                    </div>
                )}

                <div className="relative">
                    <p className={`text-sm break-words bg-white py-1.5 px-2.5 rounded-lg shadow-sm hover:shadow-md transition-shadow inline-block ${isOwnMessage ? 'border-r-2 border-[#B671FF]' : 'border-l-2 border-[#B671FF]'}`}>
                        {message.text}
                    </p>

                    <div className={`absolute ${isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="bg-white shadow-sm"
                            onPress={() => onReply(message)}
                        >
                            <Icon icon="lucide:reply" width={14} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ChatMessage); 