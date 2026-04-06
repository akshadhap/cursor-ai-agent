/**
 * Schedule Picker - Beautiful date/time picker for scheduling posts
 */

"use client";

import { useState, useMemo } from "react";
import {
    CalendarIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClockIcon,
    XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SchedulePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function SchedulePicker({ value, onChange, onConfirm, onCancel }: SchedulePickerProps) {
    // Initialize with current time rounded to next 5-minute interval
    const getInitialTime = () => {
        const now = new Date();
        const minutes = now.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 5) * 5;

        if (roundedMinutes >= 60) {
            return { hour: now.getHours() + 1, minute: 0 };
        }
        return { hour: now.getHours(), minute: roundedMinutes };
    };

    const initialTime = getInitialTime();
    const initialHour12 = initialTime.hour === 0 ? 12 : (initialTime.hour > 12 ? initialTime.hour - 12 : initialTime.hour);
    const initialIsPM = initialTime.hour >= 12;

    const [currentDate, setCurrentDate] = useState(value || new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(value || new Date());
    const [selectedHour, setSelectedHour] = useState(value?.getHours() ? (value.getHours() === 0 ? 12 : (value.getHours() > 12 ? value.getHours() - 12 : value.getHours())) : initialHour12);
    const [selectedMinute, setSelectedMinute] = useState(value?.getMinutes() ?? initialTime.minute);
    const [isPM, setIsPM] = useState(value ? value.getHours() >= 12 : initialIsPM);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDay = firstDayOfMonth.getDay();
        const totalDays = lastDayOfMonth.getDate();

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false,
            });
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            days.push({
                date: new Date(year, month, day),
                isCurrentMonth: true,
            });
        }

        // Fill remaining
        const totalCells = days.length <= 35 ? 35 : 42;
        const remainingDays = totalCells - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push({
                date: new Date(year, month + 1, day),
                isCurrentMonth: false,
            });
        }

        return days;
    }, [year, month]);

    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (date: Date) => {
        if (!selectedDate) return false;
        return (
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()
        );
    };

    const isPastDate = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const handleDateSelect = (date: Date) => {
        if (isPastDate(date)) return;
        setSelectedDate(date);
        updateValue(date, selectedHour, selectedMinute, isPM);
    };

    const updateValue = (date: Date | null, hour: number, minute: number, pm: boolean) => {
        if (!date) {
            onChange(null);
            return;
        }
        const newDate = new Date(date);
        let hour24 = hour;
        if (pm && hour !== 12) hour24 = hour + 12;
        if (!pm && hour === 12) hour24 = 0;
        newDate.setHours(hour24, minute, 0, 0);

        // Don't allow scheduling in the past
        if (newDate < new Date()) {
            return;
        }

        onChange(newDate);
    };

    // Check if a specific hour/minute combination is in the past for today
    const isPastTime = (hour: number, minute: number, pm: boolean) => {
        if (!selectedDate || !isToday(selectedDate)) return false;

        const now = new Date();
        let hour24 = hour;
        if (pm && hour !== 12) hour24 = hour + 12;
        if (!pm && hour === 12) hour24 = 0;

        if (hour24 < now.getHours()) return true;
        if (hour24 === now.getHours() && minute <= now.getMinutes()) return true;
        return false;
    };

    // Check if an hour has any valid minutes left
    const isHourFullyPast = (hour: number, pm: boolean) => {
        if (!selectedDate || !isToday(selectedDate)) return false;

        const now = new Date();
        let hour24 = hour;
        if (pm && hour !== 12) hour24 = hour + 12;
        if (!pm && hour === 12) hour24 = 0;

        return hour24 < now.getHours();
    };

    const handleHourChange = (hour: number) => {
        if (isHourFullyPast(hour, isPM)) return;
        setSelectedHour(hour);
        if (selectedDate) updateValue(selectedDate, hour, selectedMinute, isPM);
    };

    const handleMinuteChange = (minute: number) => {
        if (isPastTime(selectedHour, minute, isPM)) return;
        setSelectedMinute(minute);
        if (selectedDate) updateValue(selectedDate, selectedHour, minute, isPM);
    };

    const toggleAMPM = () => {
        const newIsPM = !isPM;
        // Don't allow switching to AM if all AM hours are in the past
        if (!newIsPM && isToday(selectedDate || new Date())) {
            const now = new Date();
            if (now.getHours() >= 12) {
                // It's PM now, so all AM hours are past
                return;
            }
        }
        setIsPM(newIsPM);
        if (selectedDate) updateValue(selectedDate, selectedHour, selectedMinute, newIsPM);
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);

        // When selecting today, adjust time to be valid (in the future)
        const time = getInitialTime();
        const hour12 = time.hour === 0 ? 12 : (time.hour > 12 ? time.hour - 12 : time.hour);
        const newIsPM = time.hour >= 12;

        setSelectedHour(hour12);
        setSelectedMinute(time.minute);
        setIsPM(newIsPM);
        updateValue(today, hour12, time.minute, newIsPM);
    };

    const clearSelection = () => {
        setSelectedDate(null);
        onChange(null);
    };

    const hours = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <div className="bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex">
                {/* Calendar Section */}
                <div className="p-4 border-r border-border/30">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">{MONTHS[month]} {year}</span>
                            <button
                                onClick={() => setCurrentDate(new Date(year, month, 1))}
                                className="text-xs text-muted-foreground hover:text-primary"
                            >
                                ▼
                            </button>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={goToPreviousMonth}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                                <ChevronLeftIcon className="h-4 w-4" />
                            </button>
                            <button
                                onClick={goToNextMonth}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                                <ChevronRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {WEEKDAYS.map((day, i) => (
                            <div key={i} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((dayInfo, index) => {
                            const past = isPastDate(dayInfo.date);
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleDateSelect(dayInfo.date)}
                                    disabled={past}
                                    className={cn(
                                        "h-8 w-8 flex items-center justify-center text-sm rounded-lg transition-all",
                                        !dayInfo.isCurrentMonth && "text-muted-foreground/40",
                                        past && "text-muted-foreground/30 cursor-not-allowed",
                                        isToday(dayInfo.date) && !isSelected(dayInfo.date) && "font-bold text-primary",
                                        isSelected(dayInfo.date) && "bg-primary text-primary-foreground font-medium",
                                        !isSelected(dayInfo.date) && !past && dayInfo.isCurrentMonth && "hover:bg-muted"
                                    )}
                                >
                                    {dayInfo.date.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    {/* Clear & Today Buttons */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                        <button
                            onClick={clearSelection}
                            className="text-sm text-primary hover:underline"
                        >
                            Clear
                        </button>
                        <button
                            onClick={goToToday}
                            className="text-sm text-primary hover:underline"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Time Section */}
                <div className="p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <ClockIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Time</span>
                    </div>

                    <div className="flex gap-2">
                        {/* Hours */}
                        <div className="bg-muted/50 rounded-xl p-1 h-[200px] overflow-y-auto scrollbar-thin">
                            {hours.map((hour) => {
                                const past = isHourFullyPast(hour, isPM);
                                return (
                                    <button
                                        key={hour}
                                        onClick={() => handleHourChange(hour)}
                                        disabled={past}
                                        className={cn(
                                            "block w-12 py-1.5 text-center text-sm rounded-lg transition-colors",
                                            past && "text-muted-foreground/30 cursor-not-allowed",
                                            selectedHour === hour && !past
                                                ? "bg-primary text-primary-foreground font-medium"
                                                : !past && "hover:bg-muted"
                                        )}
                                    >
                                        {String(hour).padStart(2, "0")}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Minutes */}
                        <div className="bg-muted/50 rounded-xl p-1 h-[200px] overflow-y-auto scrollbar-thin">
                            {minutes.filter((_, i) => i % 5 === 0).map((minute) => {
                                const past = isPastTime(selectedHour, minute, isPM);
                                return (
                                    <button
                                        key={minute}
                                        onClick={() => handleMinuteChange(minute)}
                                        disabled={past}
                                        className={cn(
                                            "block w-12 py-1.5 text-center text-sm rounded-lg transition-colors",
                                            past && "text-muted-foreground/30 cursor-not-allowed",
                                            selectedMinute === minute && !past
                                                ? "bg-primary text-primary-foreground font-medium"
                                                : !past && "hover:bg-muted"
                                        )}
                                    >
                                        {String(minute).padStart(2, "0")}
                                    </button>
                                );
                            })}
                        </div>

                        {/* AM/PM */}
                        <div className="bg-muted/50 rounded-xl p-1 flex flex-col gap-1">
                            <button
                                onClick={() => { setIsPM(false); if (selectedDate) updateValue(selectedDate, selectedHour, selectedMinute, false); }}
                                className={cn(
                                    "w-12 py-1.5 text-center text-sm rounded-lg transition-colors",
                                    !isPM
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "hover:bg-muted"
                                )}
                            >
                                AM
                            </button>
                            <button
                                onClick={() => { setIsPM(true); if (selectedDate) updateValue(selectedDate, selectedHour, selectedMinute, true); }}
                                className={cn(
                                    "w-12 py-1.5 text-center text-sm rounded-lg transition-colors",
                                    isPM
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "hover:bg-muted"
                                )}
                            >
                                PM
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-border/30 bg-muted/20">
                <div className="text-sm text-muted-foreground">
                    {selectedDate ? (
                        <span className="font-medium text-foreground">
                            {selectedDate.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                            })} at {String(selectedHour).padStart(2, "0")}:{String(selectedMinute).padStart(2, "0")} {isPM ? "PM" : "AM"}
                        </span>
                    ) : (
                        "Select date and time"
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={onConfirm} disabled={!selectedDate}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Confirm
                    </Button>
                </div>
            </div>
        </div>
    );
}
