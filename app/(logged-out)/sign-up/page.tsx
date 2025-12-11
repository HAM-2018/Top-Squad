"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PasswordInput } from "@/components/ui/password-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSignUp } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {z} from "zod";

const formSchema = z.object({
    email: z.email(),
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    dob: z.date().refine((date) => {
            const today = new Date();
            const seventeenYears = new Date(
                today.getFullYear() - 17,
                today.getMonth(),
                today.getDate()
            );
            return date <= seventeenYears;
        }, "You must be at least 17 years old"),
    password: z.string().min(8, "Password must contain at least 8 characters").refine((password) => {
        return /^(?=.*[!@#$%^&*])(?=.*[A-Z]).*$/.test(password);
    }, "Password must contain at least 1 special character and 1 uppercase character"),
    passwordConfirm: z.string(),

})
.superRefine((data, ctx) => {
    if(data.password !== data.passwordConfirm) {
        ctx.addIssue({
            code: "custom",
            path: ["passwordConfirm"],
            message: "Passwords do not match"
        })
    }
});

export default function SignupPage() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            firstName: "",
            lastName: "",
            password: "",
            passwordConfirm: "",
        }
    });
    const {signUp, setActive, isLoaded} = useSignUp();
    const router = useRouter();

    //Email verification
    const [pendingVerification, setPendingVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSubmit = async(values: z.infer<typeof formSchema>) => {
        if (!isLoaded) return;

        const {email, password, dob, firstName, lastName} = values;

        try {
            const result = await signUp.create({
                emailAddress: email,
                password,
                firstName,
                lastName,
                unsafeMetadata: {
                    dob: dob.toISOString(),
                },
            });

            if (result.status ==="complete") {
                await setActive({ session: result.createdSessionId});
                router.push("/dashboard");
                return;
            }
            //Ask Clerk to send email code
            await signUp.prepareEmailAddressVerification({
                strategy: "email_code"
            });

            //Show OTP card
            setPendingVerification(true);
            setVerificationCode("");
            setVerificationError(null);
        } catch (err: any) {
            console.log(err);
            setVerificationError("Something went wrong starting signup, please try again");
            setPendingVerification(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if(!isLoaded) return;

        setIsVerifying(true);
        setVerificationError(null);

        try {
            const verification = await signUp.attemptEmailAddressVerification({
                code: verificationCode,
            });

            if (verification.status === "complete") {
                await setActive({session: verification.createdSessionId});
                router.push("/dashboard");
                return;
            }

            setVerificationError("Verification failed. Please check the code and try again");
        } catch (err: any) {
            console.log(err);
            const msg = err?.errors?.[0]?.message || "Verification failed. please check the code and try again";
            setVerificationError(msg);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <>
        <TrophyIcon size={50} className="text-yellow-500" />
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>
                    Sign-up 
                </CardTitle>
                <CardDescription>
                    Sign-up for a new Top-Squad account
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
                                <FormMessage />
                            </FormItem>
                            )}
                         />
                         <FormField control={form.control} name="firstName" render={({field}) => (
                            <FormItem>
                                <FormLabel>
                                    First name
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="John" {...field} /> 
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                         />
                         <FormField control={form.control} name="lastName" render={({field}) => (
                            <FormItem>
                                <FormLabel>
                                    lastName
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="Doe" {...field} /> 
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                         />
                         <FormField control={form.control} name="dob" render={({field}) => (
                            <FormItem className="flex flex-col pt-2 ">
                                <FormLabel>
                                    Date of birth
                                </FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" 
                                            className="normal-case flex justify-between pr-0.5"
                                            >
                                                <span>
                                                {field.value
                                                ? format(field.value, "PPP")
                                                : "Pick a date"}
                                                </span>
                                                <CalendarIcon />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-auto p-0">
                                        <Calendar mode="single"
                                         defaultMonth={field.value} 
                                         selected={field.value}
                                         onSelect={field.onChange}
                                         fixedWeeks
                                         weekStartsOn={1}
                                         captionLayout="dropdown"
                                         disabled={{
                                            after: new Date(),
                                         }} 
                                    />
                                    </PopoverContent>
                                </Popover>
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
                                <FormMessage />
                            </FormItem>
                            )}
                         />
                         <FormField control={form.control} name="passwordConfirm" render={({field}) => (
                            <FormItem>
                                <FormLabel>
                                    Confirm password
                                </FormLabel>
                                <FormControl>
                                    <PasswordInput placeholder="********" {...field} /> 
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                         />
                        <div id="clerk-captcha" />
                        <Button 
                            type="submit"
                            disabled= {
                            pendingVerification || form.formState.isSubmitting
                            }
                        >
                            Sign-up
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="justify-between">
                <small>Already have an account?</small>
                <Button asChild size="sm">
                    <Link href="/login">Login</Link>
                </Button>
            </CardFooter>
        </Card>

        {pendingVerification && (
            <Card className="w-full max-w-sm mt-4">
                <CardHeader>
                    <CardTitle>
                        Verify email
                    </CardTitle>
                    <CardDescription>
                        Enter the 6 digit verification code sent to your email
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
                        <div className="flex justify-center">
                            <InputOTP
                             maxLength={6}
                            value={verificationCode} 
                            onChange={(value) => setVerificationCode(value)}
                            >
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

                        {verificationError && (
                            <p className="text-sm text-red-500 text-center">
                                {verificationError}
                            </p>
                        )}
                        <Button 
                        type="submit"
                        disabled={verificationCode.length !== 6 || isVerifying}
                        >
                            {isVerifying ? "Verifying..." : "Verify Email"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        )}
        </>
    );
};