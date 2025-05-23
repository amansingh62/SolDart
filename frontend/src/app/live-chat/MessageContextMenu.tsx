import React from 'react';
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useLanguage } from '../../context/LanguageContext';

interface MessageContextMenuProps {
    contextMenuPosition: { x: number; y: number } | null;
    selectedMessage: any;
    onReply: (message: any) => void;
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
            style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
        >
            <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() => onReply(selectedMessage)}
            >
                <Icon icon="lucide:reply" width={14} />
                {t('Reply')}
            </button>
        </div>
    );
};

export default React.memo(MessageContextMenu);