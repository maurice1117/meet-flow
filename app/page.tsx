"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  Calendar,
  CalendarCheck,
  Download,
  Plus,
  User,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TimeSlot = string;

type Member = {
  id: string;
  name: string;
  color: string;
  availability: TimeSlot[];
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const COLORS = [
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-cyan-500",
];

const slot = (day: number, hour: number): TimeSlot => `${day}-${hour}`;

const INITIAL_MEMBERS: Member[] = [
  {
    id: "me",
    name: "You",
    color: "bg-blue-500",
    availability: [
      slot(0, 9),
      slot(0, 10),
      slot(0, 11),
      slot(0, 14),
      slot(0, 15),
      slot(0, 16),
      slot(2, 9),
      slot(2, 10),
      slot(2, 11),
      slot(3, 14),
      slot(3, 15),
      slot(3, 16),
      slot(4, 9),
      slot(4, 10),
    ],
  },
  {
    id: "xiao-liang",
    name: "Xiao-Liang",
    color: "bg-green-500",
    availability: [
      slot(0, 9),
      slot(0, 10),
      slot(0, 11),
      slot(2, 9),
      slot(2, 10),
      slot(2, 11),
      slot(2, 14),
      slot(2, 15),
      slot(2, 16),
      slot(4, 9),
      slot(4, 10),
    ],
  },
  {
    id: "lu-lu",
    name: "Lu-Lu",
    color: "bg-purple-500",
    availability: [
      slot(1, 10),
      slot(1, 11),
      slot(1, 12),
      slot(2, 9),
      slot(2, 10),
      slot(2, 11),
      slot(3, 14),
      slot(3, 15),
    ],
  },
];

function formatSlotLabel(value: TimeSlot) {
  const [day, hour] = value.split("-").map(Number);
  return `${DAYS[day]} ${hour}:00-${hour + 1}:00`;
}

function buildCsv(commonSlots: TimeSlot[], members: Member[]) {
  const rows = [
    ["day", "start", "end", "available_members"],
    ...commonSlots.map((value) => {
      const [day, hour] = value.split("-").map(Number);
      return [
        DAYS[day],
        `${hour}:00`,
        `${hour + 1}:00`,
        members.map((member) => member.name).join(", "),
      ];
    }),
  ];

  return rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type DragState = {
  startDay: number;
  startHourIdx: number;
  curDay: number;
  curHourIdx: number;
  filling: boolean; // true = turning slots ON, false = turning OFF
};

function ScheduleGrid({
  availability,
  onBatchToggle,
  emerald = false,
}: {
  availability: TimeSlot[];
  onBatchToggle?: (slots: TimeSlot[], fill: boolean) => void;
  emerald?: boolean;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragging = useRef(false);

  // Commit the selection when mouse is released anywhere
  useEffect(() => {
    function handleMouseUp() {
      if (!dragging.current || !drag) return;
      const d0 = Math.min(drag.startDay, drag.curDay);
      const d1 = Math.max(drag.startDay, drag.curDay);
      const h0 = Math.min(drag.startHourIdx, drag.curHourIdx);
      const h1 = Math.max(drag.startHourIdx, drag.curHourIdx);
      const selected: TimeSlot[] = [];
      for (let d = d0; d <= d1; d++)
        for (let hi = h0; hi <= h1; hi++)
          selected.push(slot(d, HOURS[hi]));
      onBatchToggle?.(selected, drag.filling);
      dragging.current = false;
      setDrag(null);
    }
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [drag, onBatchToggle]);

  function inDragRect(d: number, hi: number): boolean {
    if (!drag) return false;
    const d0 = Math.min(drag.startDay, drag.curDay);
    const d1 = Math.max(drag.startDay, drag.curDay);
    const h0 = Math.min(drag.startHourIdx, drag.curHourIdx);
    const h1 = Math.max(drag.startHourIdx, drag.curHourIdx);
    return d >= d0 && d <= d1 && hi >= h0 && hi <= h1;
  }

  return (
    <div className="overflow-x-auto select-none">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="w-14" />
            {DAYS.map((day) => (
              <th key={day} className="p-2 text-center text-sm font-medium">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h, hi) => (
            <tr key={h}>
              <td className="text-right pr-3 text-muted-foreground text-xs py-0.5 whitespace-nowrap">
                {h}:00
              </td>
              {DAYS.map((_, d) => {
                const s = slot(d, h);
                const active = availability.includes(s);
                const inRect = inDragRect(d, hi);

                let cellClass: string;
                if (inRect) {
                  // Preview: show what the result will be
                  cellClass = drag!.filling
                    ? "bg-primary/60 border-primary/60"
                    : "bg-muted border-border opacity-40";
                } else if (active) {
                  cellClass = emerald
                    ? "bg-emerald-400 border-emerald-400"
                    : "bg-primary border-primary";
                } else {
                  cellClass = "bg-muted border-border hover:bg-muted/60";
                }

                return (
                  <td key={d} className="p-0.5">
                    <div
                      className={`h-8 rounded border transition-colors ${cellClass} ${onBatchToggle ? "cursor-pointer" : "cursor-default"}`}
                      onMouseDown={(e) => {
                        if (!onBatchToggle) return;
                        e.preventDefault();
                        dragging.current = true;
                        setDrag({
                          startDay: d,
                          startHourIdx: hi,
                          curDay: d,
                          curHourIdx: hi,
                          filling: !active,
                        });
                      }}
                      onMouseOver={() => {
                        if (!dragging.current) return;
                        setDrag((prev) =>
                          prev ? { ...prev, curDay: d, curHourIdx: hi } : prev
                        );
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mb-5 flex gap-4 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`h-3 w-3 rounded ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

export default function MeetFlow() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState("xiao-liang");

  const me = members.find((member) => member.id === "me");
  const others = members.filter((member) => member.id !== "me");
  const viewing = members.find((member) => member.id === viewId) ?? others[0];

  const commonSlots = useMemo(
    () =>
      DAYS.flatMap((_, day) =>
        HOURS.filter((hour) =>
          members.every((member) => member.availability.includes(slot(day, hour)))
        ).map((hour) => slot(day, hour))
      ),
    [members]
  );

  const csvContent = useMemo(
    () => buildCsv(commonSlots, members),
    [commonSlots, members]
  );

  function toggleMySlot(day: number, hour: number) {
    setMembers((previous) =>
      previous.map((member) => {
        if (member.id !== "me") {
          return member;
        }

        const currentSlot = slot(day, hour);
        const nextAvailability = member.availability.includes(currentSlot)
          ? member.availability.filter((value) => value !== currentSlot)
          : [...member.availability, currentSlot];

        return { ...member, availability: nextAvailability };
      })
    );
  }

  function batchToggleMySlots(slots: TimeSlot[], fill: boolean) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id !== "me"
          ? m
          : {
              ...m,
              availability: fill
                ? [...new Set([...m.availability, ...slots])]
                : m.availability.filter((x) => !slots.includes(x)),
            }
      )
    );
  }

  function addMember() {
    const name = newName.trim();
    if (!name) {
      return;
    }

    const newMember: Member = {
      id: `member-${Date.now()}`,
      name,
      color: COLORS[members.length % COLORS.length],
      availability: [],
    };

    setMembers((previous) => [...previous, newMember]);
    setNewName("");
    setOpen(false);
  }

  function handleExportCsv() {
    downloadCsv("meetflow-common-slots.csv", csvContent);
  }

  if (!me) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <CalendarCheck className="h-5 w-5" />
          <h1 className="text-lg font-semibold tracking-tight">MeetFlow</h1>
          <Badge variant="secondary" className="text-xs font-normal">
            Beta
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <Tabs defaultValue="members">
          <TabsList className="mb-8 h-10 flex-wrap">
            <TabsTrigger value="members" className="gap-1.5 text-sm">
              <Users className="h-3.5 w-3.5" />
              Members
            </TabsTrigger>
            <TabsTrigger value="my-schedule" className="gap-1.5 text-sm">
              <User className="h-3.5 w-3.5" />
              My Schedule
            </TabsTrigger>
            <TabsTrigger value="view-member" className="gap-1.5 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              View Member
            </TabsTrigger>
            <TabsTrigger value="common" className="gap-1.5 text-sm">
              <CalendarCheck className="h-3.5 w-3.5" />
              Common Slots
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Members</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {members.length} people in this meeting
                </p>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Add member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Add a new member</DialogTitle>
                  </DialogHeader>
                  <div className="mt-2 flex flex-col gap-3">
                    <Input
                      autoFocus
                      placeholder="Enter member name"
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          addMember();
                        }
                      }}
                    />
                    <Button onClick={addMember} disabled={!newName.trim()}>
                      Create member
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback
                        className={`${member.color} text-sm font-semibold text-white`}
                      >
                        {member.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.availability.length} available slots
                      </p>
                    </div>
                    {member.id === "me" ? (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        You
                      </Badge>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-schedule">
            <div className="mb-5">
              <h2 className="text-base font-semibold">我的時間表</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                點擊或拖曳選取矩形範圍來批次切換空閒時段
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Legend
                  items={[
                    { color: "bg-primary", label: "Available" },
                    { color: "border border-border bg-muted", label: "Unavailable" },
                  ]}
                />
                <ScheduleGrid
                  availability={me.availability}
                  onBatchToggle={batchToggleMySlots}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="view-member">
            <div className="mb-5">
              <h2 className="text-base font-semibold">View Member Schedule</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Compare your schedule against each teammate.
              </p>
            </div>

            {others.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No teammates yet. Add another member first.
              </p>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap gap-2">
                  {others.map((member) => (
                    <Button
                      key={member.id}
                      variant={viewing?.id === member.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewId(member.id)}
                    >
                      {member.name}
                    </Button>
                  ))}
                </div>

                {viewing ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback
                            className={`${viewing.color} text-xs font-semibold text-white`}
                          >
                            {viewing.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        {viewing.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Legend
                        items={[
                          { color: "bg-primary", label: "Available" },
                          {
                            color: "border border-border bg-muted",
                            label: "Unavailable",
                          },
                        ]}
                      />
                      <ScheduleGrid availability={viewing.availability} />
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}
          </TabsContent>

          <TabsContent value="common">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Common Availability</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Slots where all {members.length} members are free.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleExportCsv}
                disabled={commonSlots.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Legend
                  items={[
                    { color: "bg-emerald-400", label: "Common slot" },
                    { color: "border border-border bg-muted", label: "No overlap" },
                  ]}
                />
                {commonSlots.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    There is no time that works for everyone yet.
                  </p>
                ) : (
                  <ScheduleGrid availability={commonSlots} emerald />
                )}
              </CardContent>
            </Card>

            {commonSlots.length > 0 ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Export preview</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The CSV contains one row per shared slot so it can be pasted into
                    spreadsheets or shared with stakeholders.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {commonSlots.map((value) => (
                    <div
                      key={value}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                    >
                      {formatSlotLabel(value)}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
