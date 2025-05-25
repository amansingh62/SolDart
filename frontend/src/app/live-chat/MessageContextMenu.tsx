import React from 'react';
import { Icon } from "@iconify/react";
import { useLanguage } from '../../context/LanguageContext';

// Use the same interface as in your LiveChat component
interface ChatMessage {
    id: string;
    timestamp: string;
    // other properties
}

interface LiveChatMessage {
    _id: string;
    sender: {
        _id: string;
        username: string;
        profileImage: string;
    };
    text?: string;
    audioMessage?: {
        url: string;
        duration: number;
    };
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

interface MessageContextMenuProps {
    contextMenuPosition: { x: number; y: number } | null;
    selectedMessage: LiveChatMessage | null;
    onReply: (message: LiveChatMessage) => void;
    contextMenuRef: React.RefObject<HTMLDivElement | null>;
}

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
    contextMenuPosition,
    selectedMessage,
    onReply,
    contextMenuRef
}) => {
    const { t } = useLanguage();

    if (!contextMenuPosition || !selectedMessage) return null;

    return (
        <div
            ref={contextMenuRef}
            className="absolute bg-white rounded-lg shadow-lg z-50 py-1 w-40"
            style={{
                top: contextMenuPosition.y,
                left: contextMenuPosition.x,
            }}
        >
            <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() => onReply(selectedMessage)}
            >
                <Icon icon="lucide:reply" className="w-4 h-4" />
                {t('Reply')}
            </button>
        </div>
    );
};

export default MessageContextMenu;