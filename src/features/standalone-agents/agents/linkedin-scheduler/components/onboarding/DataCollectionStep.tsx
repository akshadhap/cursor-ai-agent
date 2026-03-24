/**
 * Step 1: Data Collection
 * Collects company details, LinkedIn URL, website URL, and company size
 */

"use client";

import { useState } from "react";
import {
    PlusIcon,
    XIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    Building2Icon,
    LinkedinIcon,
    GlobeIcon,
    UsersIcon,
    Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompanyProfile, CompanySize, ContentTone } from "../../config";
import { COMPANY_SIZE_LABELS, CONTENT_TONES } from "../../config";

interface DataCollectionStepProps {
    onNext: (profile: CompanyProfile) => void;
    onBack?: () => void;
    initialData?: Partial<CompanyProfile>;
    isLoading?: boolean;
}

export function DataCollectionStep({
    onNext,
    onBack,
    initialData,
    isLoading = false,
}: DataCollectionStepProps) {
    const [businessName, setBusinessName] = useState(initialData?.businessName || "");
    const [industry, setIndustry] = useState(initialData?.industry || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [companySize, setCompanySize] = useState<CompanySize>(initialData?.companySize || "small");
    const [productsServices, setProductsServices] = useState<string[]>(
        initialData?.productsServices || []
    );
    const [newProduct, setNewProduct] = useState("");
    const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || "");
    const [contentTone, setContentTone] = useState<ContentTone>(
        initialData?.contentTone || "professional"
    );
    const [linkedInUrl, setLinkedInUrl] = useState(initialData?.linkedInUrl || "");
    const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl || "");
    const [additionalLinks, setAdditionalLinks] = useState<string[]>(
        initialData?.additionalLinks || []
    );
    const [newLink, setNewLink] = useState("");

    const handleAddProduct = () => {
        if (newProduct.trim()) {
            setProductsServices([...productsServices, newProduct.trim()]);
            setNewProduct("");
        }
    };

    const handleRemoveProduct = (index: number) => {
        setProductsServices(productsServices.filter((_, i) => i !== index));
    };

    const handleAddLink = () => {
        if (newLink.trim()) {
            setAdditionalLinks([...additionalLinks, newLink.trim()]);
            setNewLink("");
        }
    };

    const handleRemoveLink = (index: number) => {
        setAdditionalLinks(additionalLinks.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onNext({
            businessName,
            industry,
            description,
            companySize,
            productsServices,
            targetAudience,
            contentTone,
            linkedInUrl,
            websiteUrl,
            additionalLinks,
        });
    };

    const isValid = businessName.trim() && industry.trim() && linkedInUrl.trim();

    return (
        <div className="h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
            <Card className="w-full max-w-2xl border-border/50 max-h-[calc(100vh-2rem)] flex flex-col">
                <CardHeader className="text-center pb-2 flex-shrink-0">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Step 2 of 7</span>
                    </div>
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Building2Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Tell us about your business</CardTitle>
                    <CardDescription className="text-sm">
                        We&apos;ll use this information to analyze your profile and generate tailored content
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Business Name & Industry Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="businessName">
                                    Business Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="businessName"
                                    placeholder="Your Company"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="industry">
                                    Industry <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="industry"
                                    placeholder="e.g., Technology, Healthcare"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Company Size */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <UsersIcon className="h-4 w-4" />
                                Company Size
                            </Label>
                            <Select
                                value={companySize}
                                onValueChange={(value) => setCompanySize(value as CompanySize)}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(COMPANY_SIZE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* LinkedIn URL */}
                        <div className="space-y-2">
                            <Label htmlFor="linkedInUrl" className="flex items-center gap-2">
                                <LinkedinIcon className="h-4 w-4 text-blue-500" />
                                LinkedIn Page URL <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="linkedInUrl"
                                placeholder="https://linkedin.com/company/your-company"
                                value={linkedInUrl}
                                onChange={(e) => setLinkedInUrl(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Website URL */}
                        <div className="space-y-2">
                            <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                                <GlobeIcon className="h-4 w-4" />
                                Website URL
                            </Label>
                            <Input
                                id="websiteUrl"
                                placeholder="https://yourcompany.com"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Business Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Business Description</Label>
                            <Textarea
                                id="description"
                                placeholder="What does your business do? What makes it unique?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={isLoading}
                                className="min-h-[80px] resize-none"
                            />
                        </div>

                        {/* Products & Services */}
                        <div className="space-y-2">
                            <Label>Products & Services</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a product or service"
                                    value={newProduct}
                                    onChange={(e) => setNewProduct(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddProduct();
                                        }
                                    }}
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    onClick={handleAddProduct}
                                    disabled={isLoading || !newProduct.trim()}
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </Button>
                            </div>
                            {productsServices.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {productsServices.map((product, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full text-sm"
                                        >
                                            <span>{product}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveProduct(index)}
                                                className="text-muted-foreground hover:text-foreground"
                                                disabled={isLoading}
                                            >
                                                <XIcon className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Target Audience & Content Tone Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="targetAudience">Target Audience</Label>
                                <Input
                                    id="targetAudience"
                                    placeholder="e.g., Small business owners"
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Content Tone</Label>
                                <Select
                                    value={contentTone}
                                    onValueChange={(value) => setContentTone(value as ContentTone)}
                                    disabled={isLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={CONTENT_TONES.PROFESSIONAL}>Professional</SelectItem>
                                        <SelectItem value={CONTENT_TONES.CASUAL}>Casual</SelectItem>
                                        <SelectItem value={CONTENT_TONES.FRIENDLY}>Friendly</SelectItem>
                                        <SelectItem value={CONTENT_TONES.AUTHORITATIVE}>Authoritative</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Additional Links */}
                        <div className="space-y-2">
                            <Label>Additional Links (optional)</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add relevant links (blog, portfolio, etc.)"
                                    value={newLink}
                                    onChange={(e) => setNewLink(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddLink();
                                        }
                                    }}
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    onClick={handleAddLink}
                                    disabled={isLoading || !newLink.trim()}
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </Button>
                            </div>
                            {additionalLinks.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {additionalLinks.map((link, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full text-sm"
                                        >
                                            <GlobeIcon className="h-3 w-3" />
                                            <span className="truncate max-w-[200px]">{link}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLink(index)}
                                                className="text-muted-foreground hover:text-foreground"
                                                disabled={isLoading}
                                            >
                                                <XIcon className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="space-y-3">
                            <Button
                                type="submit"
                                className="w-full h-11"
                                disabled={isLoading || !isValid}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Continue
                                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>

                            {onBack && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                    onClick={onBack}
                                    disabled={isLoading}
                                >
                                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
