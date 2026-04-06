/**
 * Full Page LinkedIn Preview - Exact replica of LinkedIn webpage UI
 * Shows exactly how a post will look on LinkedIn's actual website
 */

"use client";

import {
    XIcon,
    SearchIcon,
    HomeIcon,
    UsersIcon,
    BriefcaseIcon,
    MessageCircleIcon,
    BellIcon,
    LayoutGridIcon,
    ChevronDownIcon,
    ThumbsUpIcon,
    MessageSquareIcon,
    RepeatIcon,
    SendIcon,
    GlobeIcon,
    MoreHorizontalIcon,
    PlusIcon,
    BarChart3Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkedInFullPagePreviewProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    imageUrl?: string | null;
    authorName?: string;
    authorTitle?: string;
    authorAvatar?: string;
}

export function LinkedInFullPagePreview({
    isOpen,
    onClose,
    content,
    imageUrl,
    authorName = "You",
    authorTitle = "Professional",
    authorAvatar,
}: LinkedInFullPagePreviewProps) {
    if (!isOpen) return null;

    // Parse content to highlight hashtags
    const renderContent = (text: string) => {
        if (!text) return null;

        const parts = text.split(/(#\w+|https?:\/\/[^\s]+)/g);

        return parts.map((part, index) => {
            if (part.startsWith('#')) {
                return (
                    <span key={index} className="text-[#0a66c2] font-semibold hover:underline cursor-pointer">
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
            return part.split('\n').map((line, lineIndex, arr) => (
                <span key={`${index}-${lineIndex}`}>
                    {line}
                    {lineIndex < arr.length - 1 && <br />}
                </span>
            ));
        });
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#f4f2ee] overflow-auto">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="fixed top-4 right-4 z-[60] p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
                <XIcon className="h-6 w-6 text-gray-600" />
            </button>

            {/* LinkedIn Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-300">
                <div className="max-w-[1128px] mx-auto px-4 h-[52px] flex items-center justify-between">
                    {/* Left - Logo & Search */}
                    <div className="flex items-center gap-2">
                        {/* LinkedIn Logo - Exact SVG style */}
                        <div className="w-[34px] h-[34px] bg-[#0a66c2] rounded flex items-center justify-center">
                            <span className="text-white font-bold text-xl tracking-tight">in</span>
                        </div>

                        {/* Search */}
                        <div className="flex items-center bg-[#eef3f8] rounded px-2 py-[6px] w-[280px]">
                            <SearchIcon className="h-4 w-4 text-[#666666] mr-2" />
                            <span className="text-sm text-[#666666]">Search</span>
                        </div>
                    </div>

                    {/* Center - Navigation */}
                    <nav className="flex items-center">
                        <NavItem icon={HomeIcon} label="Home" active />
                        <NavItem icon={UsersIcon} label="My Network" badge={3} />
                        <NavItem icon={BriefcaseIcon} label="Jobs" />
                        <NavItem icon={MessageCircleIcon} label="Messaging" badge={5} />
                        <NavItem icon={BellIcon} label="Notifications" badge={10} badgeColor="red" />

                        {/* Me dropdown */}
                        <div className="flex flex-col items-center px-4 py-1 cursor-pointer hover:text-black min-w-[80px]">
                            {authorAvatar ? (
                                <img src={authorAvatar} alt="Me" className="w-6 h-6 rounded-full" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-[#0a66c2] flex items-center justify-center text-white text-[10px] font-semibold">
                                    {getInitials(authorName)}
                                </div>
                            )}
                            <div className="flex items-center text-xs text-[#666666]">
                                <span>Me</span>
                                <ChevronDownIcon className="h-4 w-4" />
                            </div>
                        </div>

                        <div className="w-px h-[52px] bg-gray-300 mx-1" />

                        {/* For Business */}
                        <div className="flex flex-col items-center px-4 py-1 cursor-pointer hover:text-black min-w-[88px]">
                            <LayoutGridIcon className="h-6 w-6 text-[#666666]" />
                            <div className="flex items-center text-xs text-[#666666]">
                                <span>For Business</span>
                                <ChevronDownIcon className="h-4 w-4" />
                            </div>
                        </div>
                    </nav>

                    {/* Premium link */}
                    <div className="text-xs text-[#915907] underline cursor-pointer whitespace-nowrap">
                        Try Premium for ₹0
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1128px] mx-auto px-4 py-6 flex gap-6">
                {/* Left Sidebar - Profile Card */}
                <aside className="w-[225px] flex-shrink-0">
                    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                        {/* Cover image */}
                        <div className="h-14 bg-gradient-to-r from-[#004182] to-[#0077b5] relative" />

                        {/* Avatar */}
                        <div className="px-3 -mt-10 relative flex justify-center">
                            {authorAvatar ? (
                                <img
                                    src={authorAvatar}
                                    alt={authorName}
                                    className="w-[72px] h-[72px] rounded-full border-2 border-white"
                                />
                            ) : (
                                <div className="w-[72px] h-[72px] rounded-full bg-[#0a66c2] border-2 border-white flex items-center justify-center text-white text-2xl font-semibold">
                                    {getInitials(authorName)}
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="p-3 text-center">
                            <h3 className="font-semibold text-gray-900 hover:underline cursor-pointer text-base">
                                {authorName}
                            </h3>
                            <p className="text-xs text-gray-600 mt-0.5">{authorTitle}</p>
                        </div>

                        {/* Experience Button */}
                        <div className="px-3 pb-3">
                            <button className="w-full flex items-center justify-center gap-1 text-[#0a66c2] text-sm font-semibold border border-[#0a66c2] rounded-full py-1.5 hover:bg-[#0a66c2]/10 hover:border-[#0a66c2]/80 transition-all">
                                <PlusIcon className="h-4 w-4" strokeWidth={2.5} />
                                Experience
                            </button>
                        </div>

                        <div className="border-t border-gray-200" />

                        {/* Premium CTA */}
                        <div className="p-3">
                            <p className="text-xs text-gray-600">Unlock exclusive tools & insights</p>
                            <p className="text-xs text-gray-900 flex items-center gap-1 mt-1 font-medium">
                                <span className="w-4 h-4 bg-amber-400 rounded-sm" />
                                <span className="hover:underline cursor-pointer">Try Premium for ₹0</span>
                            </p>
                        </div>

                        <div className="border-t border-gray-200" />

                        {/* Connections */}
                        <div className="p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-600">Connections</span>
                                <span className="text-xs font-semibold text-[#0a66c2]">3</span>
                            </div>
                            <p className="text-xs text-gray-600 hover:underline cursor-pointer">Grow your network</p>
                        </div>
                    </div>
                </aside>

                {/* Main Feed - Post */}
                <div className="flex-1 max-w-[555px]">
                    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                        {/* Post Header */}
                        <div className="p-4 pb-0">
                            <div className="flex items-start gap-2">
                                {authorAvatar ? (
                                    <img
                                        src={authorAvatar}
                                        alt={authorName}
                                        className="w-12 h-12 rounded-full"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-[#0a66c2] flex items-center justify-center text-white font-semibold text-lg">
                                        {getInitials(authorName)}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-sm text-gray-900 hover:text-[#0a66c2] hover:underline cursor-pointer">
                                            {authorName}
                                        </span>
                                        <span className="text-gray-500 text-sm">· You</span>
                                    </div>
                                    <p className="text-xs text-gray-600">{authorTitle}</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <span>1d</span>
                                        <span>·</span>
                                        <GlobeIcon className="h-3 w-3" />
                                    </div>
                                </div>

                                <button className="p-2 hover:bg-gray-100 rounded-full">
                                    <MoreHorizontalIcon className="h-6 w-6 text-gray-600" />
                                </button>
                            </div>
                        </div>

                        {/* Post Content */}
                        <div className="px-4 py-3">
                            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-[1.42857]">
                                {renderContent(content)}
                            </p>
                        </div>

                        {/* Post Image */}
                        {imageUrl && (
                            <div>
                                <img
                                    src={imageUrl}
                                    alt="Post image"
                                    className="w-full h-auto"
                                />
                            </div>
                        )}

                        {/* Engagement Stats */}
                        <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center gap-1 hover:text-[#0a66c2] hover:underline cursor-pointer">
                                <div className="w-4 h-4 rounded-full bg-[#0a66c2] flex items-center justify-center">
                                    <ThumbsUpIcon className="h-2.5 w-2.5 text-white" fill="white" />
                                </div>
                                <span>1</span>
                            </div>
                        </div>

                        {/* Reactions Section */}
                        <div className="px-4 py-2 border-t border-gray-200">
                            <p className="text-sm font-semibold text-gray-900">Reactions</p>
                            <div className="flex items-center gap-2 mt-2">
                                {authorAvatar ? (
                                    <img src={authorAvatar} alt="" className="w-8 h-8 rounded-full" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                        <UsersIcon className="h-4 w-4 text-gray-500" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="border-t border-gray-200">
                            <div className="flex items-center justify-between px-2">
                                <ActionButton icon={ThumbsUpIcon} label="Like" />
                                <ActionButton icon={MessageSquareIcon} label="Comment" />
                                <ActionButton icon={RepeatIcon} label="Repost" />
                                <ActionButton icon={SendIcon} label="Send" />
                            </div>
                        </div>

                        {/* Impressions */}
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                <BarChart3Icon className="h-4 w-4" />
                                <span>23 impressions</span>
                            </div>
                            <span className="text-xs text-[#0a66c2] font-semibold hover:underline cursor-pointer">
                                View analytics
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Ads */}
                <aside className="w-[300px] flex-shrink-0">
                    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                        {/* Promoted Label */}
                        <div className="px-4 pt-3 flex items-center justify-between">
                            <span className="text-xs text-gray-500">Promoted</span>
                            <MoreHorizontalIcon className="h-4 w-4 text-gray-400" />
                        </div>

                        {/* Ad Content */}
                        <div className="p-4 pt-2">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-[#1a1a2e] rounded flex items-center justify-center flex-shrink-0">
                                    <span className="text-[#00d4aa] text-[10px] font-bold">mighty</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm text-gray-900">Mighty Networks</p>
                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                        Vimal, the future of community is on Mighty
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                        See how creators are building communities people pay for
                                    </p>
                                </div>
                            </div>

                            <button className="w-full mt-4 py-1.5 border border-[#0a66c2] text-[#0a66c2] rounded-full text-sm font-semibold hover:bg-[#0a66c2]/10 hover:border-[#004182] transition-all">
                                Follow
                            </button>
                        </div>
                    </div>

                    {/* Footer Links */}
                    <div className="mt-4 px-2 text-xs text-gray-500">
                        <div className="flex flex-wrap gap-x-1">
                            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">About</span>
                            <span>·</span>
                            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">Accessibility</span>
                            <span>·</span>
                            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">Help Center</span>
                        </div>
                        <div className="flex flex-wrap gap-x-1 mt-1">
                            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer flex items-center gap-0.5">
                                Privacy & Terms <ChevronDownIcon className="h-3 w-3" />
                            </span>
                            <span>·</span>
                            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">Ad Choices</span>
                        </div>
                        <div className="flex flex-wrap gap-x-1 mt-1">
                            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">Advertising</span>
                            <span>·</span>
                            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer flex items-center gap-0.5">
                                Business Services <ChevronDownIcon className="h-3 w-3" />
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-x-1 mt-1">
                            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">Get the LinkedIn app</span>
                            <span>·</span>
                            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">More</span>
                        </div>

                        <div className="flex items-center gap-1 mt-4">
                            <div className="flex items-center">
                                <span className="bg-[#0a66c2] text-white text-[10px] font-bold px-1 py-0.5 rounded-sm">in</span>
                            </div>
                            <span className="text-gray-600">LinkedIn Corporation © 2026</span>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Bottom Message Bar */}
            <div className="fixed bottom-0 right-4 flex gap-2">
                <div className="bg-[#0a66c2] text-white px-4 py-2.5 rounded-t-lg flex items-center gap-3 shadow-lg">
                    {authorAvatar ? (
                        <img src={authorAvatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold">
                            {getInitials(authorName)}
                        </div>
                    )}
                    <span className="text-sm font-semibold">{authorName}</span>
                    <XIcon className="h-5 w-5 ml-2 cursor-pointer hover:opacity-80" />
                </div>
                <div className="bg-white text-gray-800 px-4 py-2.5 rounded-t-lg flex items-center gap-2 shadow-lg border border-gray-300">
                    <MessageCircleIcon className="h-5 w-5 text-[#0a66c2]" />
                    <span className="text-sm font-semibold">Messaging</span>
                    <span className="bg-[#cc1016] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">1</span>
                </div>
            </div>
        </div>
    );
}

function NavItem({
    icon: Icon,
    label,
    active = false,
    badge,
    badgeColor = "red",
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active?: boolean;
    badge?: number;
    badgeColor?: "red" | "gray";
}) {
    return (
        <div className={cn(
            "flex flex-col items-center px-4 py-1 cursor-pointer relative min-w-[80px]",
            active ? "text-black" : "text-[#666666] hover:text-black"
        )}>
            <div className="relative">
                <Icon className={cn("h-6 w-6", active && "text-black")} />
                {badge && (
                    <span className={cn(
                        "absolute -top-1 -right-2 text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center",
                        badgeColor === "red" ? "bg-[#cc1016] text-white" : "bg-[#cc1016] text-white"
                    )}>
                        {badge > 9 ? "9+" : badge}
                    </span>
                )}
            </div>
            <span className="text-xs">{label}</span>
            {active && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-black" />
            )}
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
        <button className="flex items-center justify-center gap-2 flex-1 py-3 rounded hover:bg-gray-100 transition-colors text-[#666666] hover:text-gray-900">
            <Icon className="h-5 w-5" />
            <span className="text-sm font-semibold">{label}</span>
        </button>
    );
}
