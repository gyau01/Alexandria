import { FormMessage, Message } from "@/components/form-message";
import { FinishSign } from "@/components/FinishSign";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Navbar from "@/components/navbar";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="flex h-screen w-full flex-1 items-center justify-center p-4 sm:max-w-md">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <form className="flex flex-col space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">Thanks!</h1>
              <p className="text-sm text-muted-foreground">
                Look for an email from us.{" "}
              </p>
            </div>

						<p className="text-sm text-muted-foreground">
								If you signed up with your UofL email, you may not see that email.
								That's okay! Just finish setting up your account and get matching!
           </p> 
					 <FinishSign />
          </form>
        </div>
      </div>
    </>
  );
}
