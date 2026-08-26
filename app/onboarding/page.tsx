"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useNotify } from "@/lib/hooks/useNotify";
import { useAuthStore } from "@/lib/store/authStore";
import { apiClient } from "@/lib/api/axios";
import { Stepper } from "@/components/onboarding/Stepper";
import { StepBusinessInfo } from "@/components/onboarding/StepBusinessInfo";
import { StepCurrency } from "@/components/onboarding/StepCurrency";
import { StepSettlement } from "@/components/onboarding/StepSettlement";
import { StepWebhook } from "@/components/onboarding/StepWebhook";
import { StepReview } from "@/components/onboarding/StepReview";

export type OnboardingData = {
  businessName: string;
  businessType: "individual" | "business";
  country: string;
  settlementCurrency: string;
  autoConvert: boolean;
  preferredAnchor: string;
  autoSettle: boolean;
  webhookUrl: string;
};

const initialData: OnboardingData = {
  businessName: "",
  businessType: "business",
  country: "Nigeria",
  settlementCurrency: "NGN",
  autoConvert: true,
  preferredAnchor: "Cowry",
  autoSettle: true,
  webhookUrl: "",
};

const steps = ["Business info", "Currency", "Settlement", "Webhook", "Review"];

export default function OnboardingPage() {
  const router = useRouter();
  const notify = useNotify();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore saved step and draft data on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("onboardingDraft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.step === "number" && parsed.step >= 0 && parsed.step < steps.length) {
          setStep(parsed.step);
        }
        if (parsed.data && typeof parsed.data === "object") {
          setData((prev) => ({ ...prev, ...parsed.data }));
        }
      }
    } catch {
      // Ignore parse/storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Sync current step and form draft to localStorage on changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem("onboardingDraft", JSON.stringify({ step, data }));
      } catch {
        // Ignore storage write errors
      }
    }
  }, [step, data, isHydrated]);

  // Trim string inputs upfront so state always reflects the cleaned value.
  // This keeps the validation logic in sync with what is actually sent to
  // the API at submit time (and prevents inputs like "  Acme  " from being
  // stored as-is and validated against the trimmed length in isolation).
  const updateData = (changes: Partial<OnboardingData>) => {
    const cleaned = Object.fromEntries(
      Object.entries(changes).map(([k, v]) => [
        k,
        typeof v === 'string' ? v.trim() : v,
      ]),
    ) as Partial<OnboardingData>;
    setData((current) => ({ ...current, ...cleaned }));
    setErrors({});
  };

  const validate = (targetStep: number) => {
    const nextErrors: Record<string, string> = {};
    if (targetStep === 0) {
      if (data.businessName.trim().length < 2) nextErrors.businessName = "Enter a business name with at least 2 characters.";
      if (!data.country) nextErrors.country = "Select your country.";
    }
    if (targetStep === 1 && !data.settlementCurrency) nextErrors.settlementCurrency = "Choose a settlement currency.";
    if (targetStep === 2 && !data.preferredAnchor) nextErrors.preferredAnchor = "Choose a preferred anchor.";
    // webhookUrl is optional — skip URL validation entirely when it is
    // empty so a blank input never triggers a runtime exception from new URL().
    if (targetStep === 3 && data.webhookUrl.trim()) {
      try { new URL(data.webhookUrl); } catch { nextErrors.webhookUrl = "Enter a valid URL, including https://."; }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToStep = (target: number) => {
    if (target <= step || validate(step)) setStep(target);
  };

  const skip = () => {
    localStorage.setItem("onboardingCompleted", "false");
    localStorage.removeItem("onboardingDraft");
    notify.success("Onboarding saved for later. You can finish it from Settings.");
    router.push("/dashboard");
  };

  const submit = async () => {
    if (!user) { router.push("/auth/login"); return; }
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/api/merchants/${user.id}`, {
        name: data.businessName.trim(), businessType: data.businessType, country: data.country,
      });
      await apiClient.patch(`/api/merchants/${user.id}/settings`, {
        defaultSettlementCurrency: data.settlementCurrency, autoConvert: data.autoConvert,
        preferredAnchor: data.preferredAnchor, autoSettle: data.autoSettle,
        webhookUrl: data.webhookUrl || null,
      });
      localStorage.setItem("onboardingCompleted", "true");
      localStorage.removeItem("onboardingDraft");
      notify.success("Your merchant profile is ready!");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your onboarding details.";
      notify.error(message);
    } finally { setIsSubmitting(false); }
  };


  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 sm:py-12">
      <Card className="mx-auto w-full max-w-3xl shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl sm:text-3xl">Set up your merchant account</CardTitle>
          <CardDescription>Tell us how you want to receive and manage payments. You can update these choices later.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Stepper steps={steps} currentStep={step} onStepClick={goToStep} />
          {step === 0 && <StepBusinessInfo data={data} errors={errors} onChange={updateData} />}
          {step === 1 && <StepCurrency data={data} errors={errors} onChange={updateData} />}
          {step === 2 && <StepSettlement data={data} errors={errors} onChange={updateData} />}
          {step === 3 && <StepWebhook data={data} errors={errors} onChange={updateData} />}
          {step === 4 && <StepReview data={data} onEdit={setStep} />}
          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>}
              <Button variant="ghost" onClick={skip} disabled={isSubmitting}>Complete later</Button>
            </div>
            {step < steps.length - 1 ? (
              <Button onClick={() => validate(step) && setStep(step + 1)}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button onClick={submit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Finish setup</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
