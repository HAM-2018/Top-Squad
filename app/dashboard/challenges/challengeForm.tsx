"use client";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, PlusIcon, Trash2Icon, TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createChallengeSchema,
  type CreateChallenge,
} from "@/validation/createChallengeSchema";
import z from "zod";
import { challengeMetricValues } from "@/db/schema";
import { ChallengeWithParts } from "@/types/individualchallengeStats";
import { aggregationValues, betterValues, pointsModeValues } from "@/types/scoring";

type Teams = {
  id: number;
  name: string;
};

type Props = {
  onSubmit: (data: CreateChallenge) => Promise<void>;
  defaultValues?: Partial<CreateChallenge>;
  teams: Teams[];
  challenges?: ChallengeWithParts[];
};

export default function ChallengeForm({
  onSubmit,
  defaultValues,
  teams,
  challenges = [],
}: Props) {
  const form = useForm<z.infer<typeof createChallengeSchema>>({
    resolver: zodResolver(createChallengeSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(),
      isTeamBased: false,
      groupId: undefined,
      teamId: undefined,
      pointsMode: "rank_low_wins",
      parts: [
        {
          name: "",
          metric: "time",
          targetValue: undefined,
          unit: "",
          sortOrder: 1,
          isTeamLogOnly: false,
          aggregation: "best",
          better: "lower",
          pointsMode: "rank_low_wins",
          weight: 1,
        },
      ],
      ...defaultValues,
    },
  });

  const { fields: partFields, append, remove } = useFieldArray({
    control: form.control,
    name: "parts",
  });

  const isTeamBased = form.watch("isTeamBased");

  useEffect(() => {
    if (!isTeamBased) {
      const parts = form.getValues("parts") ?? [];
      parts.forEach((_, i) => form.setValue(`parts.${i}.isTeamLogOnly`, false));
    }
  }, [isTeamBased, form]);

  const handleSubmit = async (values: CreateChallenge) => {
    await onSubmit(values);

    form.reset({
      name: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(),
      isTeamBased: false,
      groupId: undefined,
      teamId: undefined,
      pointsMode: "rank_low_wins",
      parts: [
        {
          name: "",
          metric: "time",
          targetValue: undefined,
          unit: "",
          sortOrder: 1,
          isTeamLogOnly: false,
          aggregation: "best",
          better: "lower",
          pointsMode: "rank_low_wins",
          weight: 1,
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border border-rose-500/40">
        <CardHeader className="pb-2 border-b border-rose-500">
          <CardTitle className="flex items-center justify-center gap-2 text-3xl">
            Create Challenge
            <TrophyIcon size={32} className="text-yellow-500" />
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full">
              <fieldset
                disabled={form.formState.isSubmitting}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Challenge Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="OTC Push-Up Challenge" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Team</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(val) =>
                            field.onChange(val ? parseInt(val) : undefined)
                          }
                          value={field.value ? field.value.toString() : ""}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a Team to participate in your challenge" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id.toString()}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Short description for your teammates"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal w-full",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal w-full",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isTeamBased"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1 flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Team-based challenge</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          If enabled, this challenge will be tracked at the team level.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isTeamBased && (
                  <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Select Team</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(val) => field.onChange(parseInt(val))}
                            value={field.value ? field.value.toString() : ""}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a team" />
                            </SelectTrigger>
                            <SelectContent>
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id.toString()}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="md:col-span-2 space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Events</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          name: "",
                          metric: "reps",
                          targetValue: undefined,
                          unit: "",
                          sortOrder: (partFields.length || 0) + 1,
                          isTeamLogOnly: false,
                          aggregation: "best",
                          better: "higher",
                          pointsMode: "rank_low_wins",
                          weight: 1,
                        })
                      }
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Add part
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {partFields.map((pf, index) => (
                      <div key={pf.id} className="space-y-2 rounded-md border p-3">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <FormField
                            control={form.control}
                            name={`parts.${index}.name` as const}
                            render={({ field }) => (
                              <FormItem className="md:col-span-4">
                                <FormLabel>Event Name</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="h-10 w-full"
                                    placeholder="e.g. Push-ups, 1-mile run"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`parts.${index}.metric` as const}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Metric</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-10 w-full">
                                      <SelectValue placeholder="Select metric" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {challengeMetricValues.map((metric) => (
                                        <SelectItem key={metric} value={metric}>
                                          {metric.charAt(0).toUpperCase() + metric.slice(1)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`parts.${index}.targetValue` as const}
                            render={({ field }) => (
                              <FormItem className="md:col-span-3">
                                <FormLabel>Target (optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    className="h-10 w-full"
                                    type="number"
                                    placeholder="e.g. 50"
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === ""
                                          ? undefined
                                          : Number(e.target.value)
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="md:col-span-3 flex gap-2 items-end">
                            <FormField
                              control={form.control}
                              name={`parts.${index}.unit` as const}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel>Unit (optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="h-10 w-full"
                                      placeholder="miles, meters, etc.."
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {partFields.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 shrink-0"
                                onClick={() => remove(index)}
                                aria-label="Remove part"
                              >
                                <Trash2Icon className="w-4 h-4" />
                              </Button>
                            ) : null}
                          </div>

                          <FormField
                            control={form.control}
                            name={`parts.${index}.aggregation` as const}
                            render={({ field }) => (
                              <FormItem className="md:col-span-3">
                                <FormLabel>How will this event be scored?</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-10 w-full">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {aggregationValues.map((v) => (
                                        <SelectItem key={v} value={v}>
                                          {v.toUpperCase()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`parts.${index}.better` as const}
                            render={({ field }) => (
                              <FormItem className="md:col-span-3">
                                <FormLabel>How do you win?</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-10 w-full">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {betterValues.map((v) => (
                                        <SelectItem key={v} value={v}>
                                          {v === "higher" ? "Higher is better" : "Lower is better"}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`parts.${index}.weight` as const}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Weight</FormLabel>
                                <FormControl>
                                  <Input
                                    className="h-10 w-full"
                                    type="number"
                                    min={1}
                                    value={field.value ?? 1}
                                    onChange={(e) =>
                                      field.onChange(e.target.value === "" ? 1 : Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div
                          className={cn(
                            "overflow-hidden transition-all duration-200 ease-in-out",
                            isTeamBased ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                          )}
                        >
                          <div className="rounded-md border p-3 flex items-center justify-between mt-2">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">Event completed as a Team?</p>
                              <p className="text-xs text-muted-foreground">
                                If enabled, only admins/owners can record a single official team score for this event.
                              </p>
                            </div>

                            <FormField
                              control={form.control}
                              name={`parts.${index}.isTeamLogOnly` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Switch
                                      checked={!!field.value}
                                      onCheckedChange={field.onChange}
                                      disabled={!isTeamBased}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {partFields.length > 1 ? (
                    <div className="rounded-md border p-3">
                      <FormField
                        control={form.control}
                        name="pointsMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Overall points mode</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="h-10 w-full">
                                  <SelectValue placeholder="Select points mode" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pointsModeValues.map((v) => (
                                    <SelectItem key={v} value={v}>
                                      {v === "rank_low_wins" ? "Low points wins" : "High points wins"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : null}
                </div>
              </fieldset>

              <div className="mt-5 flex items-center justify-end gap-4">
                <Button type="submit" className="px-6">
                  Create Challenge
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 border-b border-rose-500">
          <CardTitle className="flex items-center justify-between text-xl">
            Your Challenges
            {challenges.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                Showing {Math.min(challenges.length, 8)}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {challenges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You do not have any active challenges yet. Create one above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {challenges.slice(0, 8).map((c) => (
                <div key={c.challengeId} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground shrink-0">
                          {c.isTeamBased ? "Team" : "Solo"}
                        </span>
                        {c.groupName ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground shrink-0">
                            {c.groupName}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {c.description}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.parts.slice(0, 4).map((p) => (
                          <span
                            key={`${c.challengeId}-${p.partId}`}
                            className="text-[10px] px-2 py-1 rounded-full border text-muted-foreground"
                          >
                            {p.partName} • {p.metric}
                            {p.unit ? ` ${p.unit}` : ""}
                            {p.isTeamLogOnly ? " • admin" : ""}
                          </span>
                        ))}
                        {c.parts.length > 4 ? (
                          <span className="text-[10px] px-2 py-1 rounded-full border text-muted-foreground">
                            +{c.parts.length - 4} more
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
