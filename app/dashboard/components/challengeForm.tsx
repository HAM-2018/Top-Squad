"use client";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarIcon, TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createChallengeSchema , type CreateChallenge} from "@/validation/createChallengeSchema";
import z from "zod";

type Teams = {
  id: number;
  name: string;
};


type Props = {
    onSubmit: (data: CreateChallenge) => Promise<void>;
    defaultValues?: Partial<CreateChallenge>;
    teams: Teams[];
};


export default function ChallengeForm({
    onSubmit, defaultValues, teams }:Props) {
    const form = useForm<z.infer<typeof createChallengeSchema>>({
        resolver: zodResolver(createChallengeSchema) as any, //Reapproach resolver error later
        defaultValues: {
            name: "",
            description: "",
            startDate: new Date(),
            endDate: new Date(),
            isTeamBased: false,
            groupId: undefined,
            teamId: undefined,
            ...defaultValues
        },
    });

    const isTeamBased = form.watch("isTeamBased");

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
      });

    }

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
            <form onSubmit={form.handleSubmit(handleSubmit)}
              className="w-full"
              >
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
                        <Input
                          {...field}
                          placeholder="OTC Push-Up Challenge"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Group / Program / Unit */}
                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Group</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(val) => field.onChange(parseInt(val))}
                          value={field.value ? field.value.toString() : ""}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a group to participate in your challenge" />
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
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
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
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
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

                {/* Team-based switch */}
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
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Team Select when team switch is toggled */}
                {isTeamBased && (
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Select Team</FormLabel>
                      <FormControl>
                        <Select onValueChange={(val) => field.onChange(parseInt(val))}
                          value={field.value ? field.value.toString() : ""}
                          >
                          <SelectTrigger>
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

      {/* Challenges list */}
      <Card>
        <CardHeader className="pb-2 border-b border-rose-500">
          <CardTitle className="flex items-center justify-between text-xl">
            Your Challenges
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any active challenges yet. Create one above to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}