"use client";
import {useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { type ComponentProps } from "react";
import { useFormStatus } from "react-dom";

export function FinishSign() {
  const router = useRouter();

  return (
    <Button type="button" onClick = {() => router.push("/dashboard")}>
      finish signup
    </Button>
  );

}
