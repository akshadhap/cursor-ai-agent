/**
 * Activity Filters Component
 * Filter activities by type, date range, and search
 */

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ActivityFiltersProps {
    onFilterChange: (filters: ActivityFilters) => void;
}

export interface ActivityFilters {
    search: string;
    type: string;
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
}

const ACTION_TYPES = [
    { value: "all", label: "All Types" },
    { value: "chat", label: "Chat" },
    { value: "task", label: "Generate Task" },
    { value: "email", label: "Draft Email" },
    { value: "scrape", label: "Web Scrape" },
    { value: "enrich", label: "Data Enrichment" },
];

export function ActivityFilters({ onFilterChange }: ActivityFiltersProps) {
    const [search, setSearch] = useState("");
    const [type, setType] = useState("all");
    const [dateFrom, setDateFrom] = useState<Date | undefined>();
    const [dateTo, setDateTo] = useState<Date | undefined>();

    const handleApplyFilters = () => {
        onFilterChange({
            search,
            type: type === "all" ? "" : type,
            dateFrom,
            dateTo,
        });
    };

    const handleReset = () => {
        setSearch("");
        setType("all");
        setDateFrom(undefined);
        setDateTo(undefined);
        onFilterChange({
            search: "",
            type: "",
            dateFrom: undefined,
            dateTo: undefined,
        });
    };

    const hasActiveFilters = search || type !== "all" || dateFrom || dateTo;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search activities..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleApplyFilters();
                        }}
                    />
                </div>

                {/* Type Filter */}
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        {ACTION_TYPES.map((actionType) => (
                            <SelectItem key={actionType.value} value={actionType.value}>
                                {actionType.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Date From */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full sm:w-[180px] justify-start text-left font-normal",
                                !dateFrom && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "From date"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                {/* Date To */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full sm:w-[180px] justify-start text-left font-normal",
                                !dateTo && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateTo ? format(dateTo, "MMM dd, yyyy") : "To date"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button onClick={handleApplyFilters} size="sm">
                    Apply Filters
                </Button>
                {hasActiveFilters && (
                    <Button onClick={handleReset} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-1" />
                        Reset
                    </Button>
                )}
            </div>
        </div>
    );
}
