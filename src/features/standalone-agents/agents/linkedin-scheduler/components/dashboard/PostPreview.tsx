/**
 * Post Preview - Realistic LinkedIn post preview
 * Matches the exact look and feel of a LinkedIn post
 */

"use client";

import { ThumbsUpIcon, MessageCircleIcon, RepeatIcon, SendIcon, GlobeIcon, MoreHorizontalIcon, LinkedinIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostPreviewProps {
    content: string;
    image?: string | null;
    authorName: string;
    authorTitle?: string;
    authorAvatar?: string;
}

export function PostPreview({
    content,
    image,
    authorName,
    authorTitle = "Your title",
    authorAvatar,
}: PostPreviewProps) {
    const hasContent = content.trim().length > 0;

    // Parse content to highlight hashtags
    const renderContent = (text: string) => {
        if (!text) return null;

        // Split by hashtags and URLs while preserving them
        const parts = text.split(/(#\w+|https?:\/\/[^\s]+)/g);

        return parts.map((part, index) => {
            if (part.startsWith('#')) {
                return (
                    <span key={index} className="text-[#0a66c2] font-medium hover:underline cursor-pointer">
                        {part}
                    </span>
                );
            }
            if (part.startsWith('http://') || part.startsWith('https://')) {
                return (
                    <span key={index} className="text-[#0a66c2] hover:underline cursor-pointer">
                        {part}
                    </span>
                );
            }
            // Handle line breaks
            return part.split('\n').map((line, lineIndex, arr) => (
                <span key={`${index}-${lineIndex}`}>
                    {line}
                    {lineIndex < arr.length - 1 && <br />}
                </span>
            ));
        });
    };

    // Get initials from name
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>

            <div className="flex-1 flex items-start justify-center">
                {hasContent || image ? (
                    <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        {/* Post Header */}
                        <div className="p-4 pb-2">
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                {authorAvatar ? (
                                    <img
                                        src={authorAvatar}
                                        alt={authorName}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-[#0a66c2] flex items-center justify-center text-white font-semibold text-lg">
                                        {getInitials(authorName)}
                                    </div>
                                )}

                                {/* Name & Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-900 text-sm hover:text-[#0a66c2] hover:underline cursor-pointer">
                                            {authorName}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">
                                        {authorTitle}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <span>Now</span>
                                        <span>•</span>
                                        <GlobeIcon className="h-3 w-3" />
                                    </div>
                                </div>

                                {/* More Options */}
                                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <MoreHorizontalIcon className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Post Content */}
                        {content && (
                            <div className="px-4 pb-3">
                                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                                    {renderContent(content)}
                                </p>
                            </div>
                        )}

                        {/* Post Image */}
                        {image && (
                            <div className="border-t border-gray-100">
                                <img
                                    src={image}
                                    alt="Post image"
                                    className="w-full h-auto max-h-[400px] object-cover"
                                />
                            </div>
                        )}

                        {/* Engagement Stats */}
                        <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <div className="flex -space-x-1">
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0a66c2] text-white text-[8px]">👍</span>
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[8px]">❤️</span>
                                </div>
                                <span className="ml-1 hover:text-[#0a66c2] hover:underline cursor-pointer">
                                    12 reactions
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">
                                    3 comments
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="border-t border-gray-200 px-2 py-1">
                            <div className="flex items-center justify-around">
                                <ActionButton icon={ThumbsUpIcon} label="Like" />
                                <ActionButton icon={MessageCircleIcon} label="Comment" />
                                <ActionButton icon={RepeatIcon} label="Repost" />
                                <ActionButton icon={SendIcon} label="Send" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                            <LinkedinIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Your post preview will appear here
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionButton({
    icon: Icon,
    label
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}) {
    return (
        <button className="flex items-center gap-1.5 px-3 py-2.5 rounded hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900">
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
}
