"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { TrophyIcon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {z} from "zod";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PasswordInput } from "@/components/ui/password-input";

const formSchema = z.object({
    email: z.email({ message: "Please enter a valid email addresss"}),
    password: z.string(),
});


export default function LoginPage() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    });

    const {signIn, setActive, isLoaded} = useSignIn();
    const {isSignedIn} = useAuth();
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (isSignedIn) {
        router.replace("/dashboard");
        }
    }, [isSignedIn, router]);

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        setFormError(null);

        if (!isLoaded) return;

        const { email, password } = values;

        try {
            const result = await signIn.create({
            identifier: email,
            password,
        });

        if (result.status === "complete") {
            await setActive({ session: result.createdSessionId });
            router.push("/dashboard");
        } else {
            setFormError(`Sign-in status: ${result.status}`);
        }
        } catch (err: any) {
            console.error("Sign-in error:", err);

            const code = err?.errors?.[0]?.code;
            const message =
            err?.errors?.[0]?.longMessage ||
            err?.errors?.[0]?.message ||
            "Invalid email or password";

            if (code === "session_exists" || message === "You're already signed in.") {
            router.push("/dashboard");
            return;
            }

        setFormError(message);
    }
};


    return (
        <>
        <TrophyIcon size={50} className="text-yellow-600" />
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>
                    Login
                </CardTitle>
                <CardDescription>
                    Login to your TopSquad account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
                        <FormField control={form.control} name="email" render={({field}) => (
                            <FormItem>
                                <FormLabel>
                                    Email
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="john@doe.com" {...field} /> 
                                </FormControl>
                                <FormDescription>
                                    This is the email you used to create your Top-Squad account
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                         />
                        <FormField control={form.control} name="password" render={({field}) => (
                            <FormItem>
                                <FormLabel>
                                    Password
                                </FormLabel>
                                <FormControl>
                                    <PasswordInput placeholder="********" {...field} /> 
                                </FormControl>
                                <FormDescription>
                                    This is the password you used to create your Top-Squad account
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )} 
                        />
                        <Button type="submit">
                            Login
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="justify-between">
                <small>Dont have an account?</small>
                <Button asChild size="sm">
                    <Link href="/sign-up">Sign-up</Link>
                </Button>
            </CardFooter>
        </Card>
        </>
    );
};