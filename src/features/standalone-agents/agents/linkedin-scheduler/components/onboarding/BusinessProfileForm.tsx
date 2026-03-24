/**
 * Business Profile Form - Onboarding Step
 * Collects company details to generate personalized content strategy
 */

"use client";

import { useState } from "react";
import { PlusIcon, XIcon, SparklesIcon, Loader2Icon, Building2Icon } from "lucide-react";
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
import type { BusinessProfile, ContentTone } from "../../config";
import { CONTENT_TONES } from "../../config";

interface BusinessProfileFormProps {
    onSubmit: (profile: BusinessProfile) => void;
    isLoading?: boolean;
    initialData?: BusinessProfile | null;
}

export function BusinessProfileForm({
    onSubmit,
    isLoading = false,
    initialData,
}: BusinessProfileFormProps) {
    const [businessName, setBusinessName] = useState(initialData?.businessName || "");
    const [industry, setIndustry] = useState(initialData?.industry || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [productsServices, setProductsServices] = useState<string[]>(
        initialData?.productsServices || []
    );
    const [newProduct, setNewProduct] = useState("");
    const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || "");
    const [contentTone, setContentTone] = useState<ContentTone>(
        initialData?.contentTone || "professional"
    );

    const handleAddProduct = () => {
        if (newProduct.trim()) {
            setProductsServices([...productsServices, newProduct.trim()]);
            setNewProduct("");
        }
    };

    const handleRemoveProduct = (index: number) => {
        setProductsServices(productsServices.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            businessName,
            industry,
            description,
            companySize: "small",
            productsServices,
            targetAudience,
            contentTone,
            linkedInUrl: "",
            websiteUrl: "",
            additionalLinks: [],
        });
    };

    const isValid = businessName.trim() && industry.trim();

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Card className="w-full max-w-2xl border-border/50">
                <CardHeader className="text-center pb-6">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                        <Building2Icon className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Business Profile</CardTitle>
                    <CardDescription>
                        Tell us about your business to generate tailored content
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Business Name & Industry Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="businessName">Business Name</Label>
                                <Input
                                    id="businessName"
                                    placeholder="Your Company"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="industry">Industry</Label>
                                <Input
                                    id="industry"
                                    placeholder="e.g., Technology, Healthcare, Finance"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Business Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Business Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe what your business does and its unique value proposition..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={isLoading}
                                className="min-h-[100px] resize-none"
                            />
                        </div>

                        {/* Products & Services */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <span>Products & Services</span>
                            </Label>
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
                                    onClick={handleAddProduct}
                                    disabled={isLoading || !newProduct.trim()}
                                    className="shrink-0"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </Button>
                            </div>
                            {productsServices.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {productsServices.map((product, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full text-sm"
                                        >
                                            <span>{product}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveProduct(index)}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
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
                                    placeholder="e.g., Small business owners, Marketing professionals"
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

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 text-base"
                            disabled={isLoading || !isValid}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Strategy...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="mr-2 h-4 w-4" />
                                    Generate Content Strategy
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
