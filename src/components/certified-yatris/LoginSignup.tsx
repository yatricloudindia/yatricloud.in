import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, User, X, Upload, Loader2 } from "lucide-react";
import { loginUser, registerUser, googleLogin, updateProfile, isProfileComplete, logout } from "@/lib/yatris-api";
import { sendPasswordReset, sanitizePhoneNumber } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionalTag, fieldLabel } from "@/components/ui/form-layout";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Country } from "country-state-city";
import { parsePhoneNumber } from "libphonenumber-js";
import { sendEmail } from "@/lib/email";
import { getWelcomeEmail } from "@/lib/email-templates";
import { loadGoogleIdentity } from "@/lib/third-party";
import { InterestedCertificationsPicker } from "./InterestedCertificationsPicker";
import { OnboardingQuestion } from "../onboarding-ui/OnboardingQuestion";
import { OnboardingQuestionType } from "@/types/onboarding-survey";

/** Google Identity Services script attaches itself to window.google at runtime. */
// Window.google global type is declared in src/types/globals.d.ts

interface LoginSignupProps {
  onSuccess: (user: any) => void;
  initialUser?: any;
  forceOnboarding?: boolean;
  onClose?: () => void;
}

export const LoginSignup = ({ onSuccess, initialUser, forceOnboarding, onClose }: LoginSignupProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const nonceRef = useRef<string>("");
  const { toast } = useToast();

  // Step 2 Onboarding state (for Google login & incomplete profiles)
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingUser, setOnboardingUser] = useState<any>(null);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const initializedUserRef = useRef<string | null>(null);
  const [onboardingData, setOnboardingData] = useState({
    country: "",
    stateProvince: "",
    city: "",
    countryCode: "",
    phoneNumber: "",
    linkedinUrl: "",
    interestedCertifications: [] as string[],
  });

  useEffect(() => {
    if (initialUser && (forceOnboarding || !isProfileComplete(initialUser))) {
      const userKey = String(initialUser.id || initialUser.email || "user");
      if (initializedUserRef.current === userKey && isOnboarding) {
        return; // Don't wipe inputs if user is currently filling out the form
      }
      initializedUserRef.current = userKey;

      setOnboardingUser(initialUser);
      setAvatarImgError(false);
      setOnboardingData((prev) => ({
        country: prev.country || initialUser.country || "",
        stateProvince: prev.stateProvince || initialUser.stateProvince || "",
        city: prev.city || initialUser.city || "",
        countryCode: prev.countryCode || initialUser.countryCode || "",
        phoneNumber: prev.phoneNumber || sanitizePhoneNumber(initialUser.phoneNumber) || "",
        linkedinUrl: prev.linkedinUrl || initialUser.linkedinUrl || "",
        interestedCertifications: prev.interestedCertifications?.length ? prev.interestedCertifications : (initialUser.interestedCertifications || []),
      }));
      setIsOnboarding(true);
    }
  }, [initialUser, forceOnboarding]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Register form state
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    linkedinUrl: "",
    photoUrl: "",
    country: "",
    stateProvince: "",
    city: "",
    countryCode: "",
    phoneNumber: "",
    interestedCertifications: [] as string[],
  });

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Get all countries
  const countries = Country.getAllCountries().map(country => ({
    value: country.isoCode,
    label: country.name,
    phoneCode: country.phonecode
  }));

  // Auto-set country code when register country is selected
  useEffect(() => {
    if (registerData.country) {
      const countryData = countries.find(c => c.value === registerData.country);
      if (countryData && countryData.phoneCode) {
        setRegisterData(prev => ({
          ...prev,
          countryCode: `+${countryData.phoneCode}`,
        }));
      }
    }
  }, [registerData.country]);

  // Auto-set country code when onboarding country is selected
  useEffect(() => {
    if (onboardingData.country) {
      const countryData = countries.find(c => c.value === onboardingData.country);
      if (countryData && countryData.phoneCode) {
        setOnboardingData(prev => ({
          ...prev,
          countryCode: `+${countryData.phoneCode}`,
        }));
      }
    }
  }, [onboardingData.country]);

  // Google Auth Initialization, the GSI client script loads on demand here
  useEffect(() => {
    if (isOnboarding) return;
    let cancelled = false;
    (async () => {
      const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!client_id || client_id.includes("YOUR_GOOGLE")) {
        console.warn("Google Client ID missing in .env");
        return;
      }
      const ready = await loadGoogleIdentity();
      if (!ready || cancelled || !window.google) return;
      try {
        // Generate nonce for secure Supabase Google sign in
        const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
        nonceRef.current = nonce;
        const encoder = new TextEncoder();
        const encodedNonce = encoder.encode(nonce);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        window.google.accounts.id.initialize({
          client_id: client_id,
          callback: handleGoogleResponse,
          auto_select: false,
          nonce: hashedNonce,
        });

        const btnContainer = document.getElementById("googleSignInDiv");
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: "outline", size: "large" }
          );
        }
      } catch (e) {
        console.error("Google Auth Init Error", e);
      }
    })();
    return () => { cancelled = true; };
  }, [isLogin, isOnboarding]);

  const handleGoogleResponse = async (response: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const { jwtDecode } = await import("jwt-decode");
      const payload: any = jwtDecode(response.credential);

      const result = await googleLogin({
        email: payload.email,
        fullName: payload.name,
        photoUrl: payload.picture,
        idToken: response.credential,
        nonce: nonceRef.current,
      });

      if (result.success && result.user) {
        const enrichedUser = {
          ...result.user,
          photoUrl: result.user.photoUrl || payload.picture || undefined,
          fullName: result.user.fullName || payload.name || "Yatri",
        };
        if (!isProfileComplete(enrichedUser)) {
          // Incomplete profile -> trigger Step 2 Onboarding
          setAvatarImgError(false);
          setOnboardingUser(enrichedUser);
          setOnboardingData({
            country: enrichedUser.country || "",
            stateProvince: enrichedUser.stateProvince || "",
            city: enrichedUser.city || "",
            countryCode: enrichedUser.countryCode || "",
            phoneNumber: enrichedUser.phoneNumber || "",
            linkedinUrl: enrichedUser.linkedinUrl || "",
            interestedCertifications: enrichedUser.interestedCertifications || [],
          });
          setIsOnboarding(true);
          toast({
            title: "Almost there!",
            description: "Please complete your mandatory profile details.",
          });
        } else {
          onSuccess(enrichedUser);
          toast({
            title: "Welcome!",
            description: `Logged in as ${result.user.fullName}`,
          });
        }
      } else {
        setError(result.error || "Google Login failed");
      }
    } catch (e: any) {
      setError("Google Auth Error: " + (e?.message || "Failed to authenticate with Google"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = loginEmail.trim();
    if (!email || !email.includes("@")) {
      setError("Please enter your email first.");
      return;
    }
    setResetting(true);
    setError(null);
    const { error: resetError } = await sendPasswordReset(email);
    setResetting(false);
    if (resetError) {
      setError(resetError);
      return;
    }
    toast({
      title: "Reset link sent",
      description: `Check ${email} for a link to set a new password. (Also check spam.)`,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginUser(loginEmail, loginPassword);
      if (result.success && result.user) {
        if (!isProfileComplete(result.user)) {
          setOnboardingUser(result.user);
          setOnboardingData({
            country: result.user.country || "",
            stateProvince: result.user.stateProvince || "",
            city: result.user.city || "",
            countryCode: result.user.countryCode || "",
            phoneNumber: result.user.phoneNumber || "",
            linkedinUrl: result.user.linkedinUrl || "",
            interestedCertifications: result.user.interestedCertifications || [],
          });
          setIsOnboarding(true);
          toast({
            title: "Profile Incomplete",
            description: "Please complete your mandatory profile details to continue.",
          });
        } else {
          onSuccess(result.user);
        }
      } else {
        setError(result.error || "Login failed");
      }
    } catch (error: any) {
      setError(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle photo file selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size should be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (registerData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!registerData.fullName.trim()) {
      setError("Full Name is required");
      return;
    }

    setIsLoading(true);

    try {
      let photoUrl = registerData.photoUrl;
      if (photoFile) {
        photoUrl = await fileToBase64(photoFile);
      }

      const result = await registerUser({
        email: registerData.email.trim(),
        password: registerData.password,
        fullName: registerData.fullName.trim(),
        photoUrl: photoUrl,
      });

      if (result.success) {
        if (result.message) {
          toast({
            title: "Account created",
            description: result.message,
          });
          setIsLogin(true);
          return;
        }

        if (result.user) {
          try {
            const emailHtml = getWelcomeEmail(registerData.fullName);
            sendEmail({
              to: registerData.email,
              subject: "Welcome to Yatri Cloud!",
              html: emailHtml
            }).catch(err => console.error("Welcome email failed:", err));
          } catch (emailErr) {
            console.error("Failed to prepare welcome email:", emailErr);
          }

          if (!isProfileComplete(result.user)) {
            setOnboardingUser(result.user);
            setCurrentStep(0);
            setIsOnboarding(true);
            return;
          }

          onSuccess(result.user);
        }
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (error: any) {
      setError(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 Submission (Onboarding)
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!onboardingData.country) {
      setError("Country is mandatory");
      return;
    }
    if (!onboardingData.stateProvince.trim()) {
      setError("State/Province is mandatory");
      return;
    }
    if (!onboardingData.city.trim()) {
      setError("City is mandatory");
      return;
    }

    const rawPhone = (onboardingData.phoneNumber || "").trim();
    const rawCode = (onboardingData.countryCode || "").trim();

    if (!rawPhone) {
      setError("Contact number is mandatory");
      return;
    }

    let fullNumber = rawPhone;
    if (!rawPhone.startsWith("+")) {
      const cleanCode = rawCode ? (rawCode.startsWith("+") ? rawCode : `+${rawCode}`) : "";
      fullNumber = `${cleanCode}${rawPhone}`;
    }

    try {
      const phoneNumber = parsePhoneNumber(fullNumber);
      if (!phoneNumber || !phoneNumber.isValid()) {
        const digits = fullNumber.replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) {
          setError("Please enter a valid contact number (e.g. +91 9876543210)");
          return;
        }
      }
    } catch {
      const digits = fullNumber.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        setError("Please enter a valid contact number (e.g. +91 9876543210)");
        return;
      }
    }

    if (onboardingData.linkedinUrl && onboardingData.linkedinUrl.trim().length > 0) {
      if (!onboardingData.linkedinUrl.match(/^https?:\/\/(www\.)?linkedin\.com\/in\/.+/i)) {
        setError("Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/yourname)");
        return;
      }
    }

    if (!onboardingData.interestedCertifications || onboardingData.interestedCertifications.length === 0) {
      setError("Please select at least one certification you are interested in");
      return;
    }

    setIsLoading(true);
    try {
      const updateRes = await updateProfile({
        country: onboardingData.country,
        stateProvince: onboardingData.stateProvince.trim(),
        city: onboardingData.city.trim(),
        countryCode: onboardingData.countryCode.trim(),
        phoneNumber: onboardingData.phoneNumber.trim(),
        linkedinUrl: onboardingData.linkedinUrl.trim(),
        interestedCertifications: onboardingData.interestedCertifications,
      });

      if (updateRes.success) {
        try {
          const emailHtml = getWelcomeEmail(onboardingUser?.fullName || "Yatri");
          if (onboardingUser?.email) {
            sendEmail({
              to: onboardingUser.email,
              subject: "Welcome to Yatri Cloud!",
              html: emailHtml
            }).catch(err => console.error("Welcome email failed:", err));
          }
        } catch (emailErr) {
          console.error("Failed to prepare welcome email:", emailErr);
        }

        toast({
          title: "Account Ready!",
          description: `Welcome to Yatri Cloud, ${onboardingUser?.fullName || ""}!`,
        });

        onSuccess(updateRes.user || {
          ...onboardingUser,
          ...onboardingData,
        });
      } else {
        setError(updateRes.error || "Failed to update profile details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOnboarding = () => {
    logout();
    setIsOnboarding(false);
    setOnboardingUser(null);
    setError(null);
  };

  const onboardingQuestions: {
    id: string;
    question: string;
    type: OnboardingQuestionType;
    placeholder?: string;
    options?: { label: string; value: string }[];
    optional?: boolean;
  }[] = [
      {
        id: "country",
        question: "Which country are you located in?",
        type: "select",
        options: countries.map(c => ({ label: c.label, value: c.value }))
      },
      {
        id: "stateProvince",
        question: "What is your State or Province?",
        type: "text",
        placeholder: "e.g. Maharashtra, California..."
      },
      {
        id: "city",
        question: "Which City do you live in?",
        type: "text",
        placeholder: "e.g. Mumbai, New York..."
      },
      {
        id: "phone",
        question: "What is your Contact / WhatsApp Number?",
        type: "tel",
        placeholder: "Enter your contact number"
      },
      {
        id: "linkedinUrl",
        question: "What is your LinkedIn Profile URL? (Optional)",
        type: "url",
        placeholder: "https://linkedin.com/in/yourusername",
        optional: true
      },
      {
        id: "interestedCertifications",
        question: "Which certifications are you interested in?",
        type: "custom-certifications"
      }
    ];

  const handleNextStep = () => {
    if (currentStep < onboardingQuestions.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      // Simulate form submission
      const syntheticEvent = { preventDefault: () => { } } as React.FormEvent;
      handleCompleteOnboarding(syntheticEvent);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    }
  };

  const currentQuestion = onboardingQuestions[currentStep];

  const getQuestionValue = (id: string) => {
    if (id === 'phone') {
      return JSON.stringify({ code: onboardingData.countryCode || '+91', phone: onboardingData.phoneNumber });
    }
    if (id === 'interestedCertifications') {
      return JSON.stringify(onboardingData.interestedCertifications);
    }
    return onboardingData[id as keyof typeof onboardingData] as string;
  };

  const setQuestionValue = (id: string, value: string) => {
    if (id === 'phone') {
      try {
        const parsed = JSON.parse(value);
        setOnboardingData(prev => ({ ...prev, countryCode: parsed.code, phoneNumber: parsed.phone }));
      } catch {
        setOnboardingData(prev => ({ ...prev, phoneNumber: value }));
      }
    } else if (id === 'interestedCertifications') {
      try {
        setOnboardingData(prev => ({ ...prev, interestedCertifications: JSON.parse(value) }));
      } catch {
        setOnboardingData(prev => ({ ...prev, interestedCertifications: [] }));
      }
    } else {
      setOnboardingData(prev => ({ ...prev, [id]: value }));
    }
  };

  return (
    <div className="w-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full transition-all duration-300 ${isOnboarding
          ? "max-w-xl sm:max-w-2xl"
          : "max-w-[400px] sm:max-w-[420px]"
          }`}
      >
        <div className="relative w-full bg-card border border-border rounded-3xl px-5 py-5 sm:px-7 sm:py-6 shadow-2xl overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Top-Right Close Button */}
          {onClose && !forceOnboarding && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 z-20 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <AnimatePresence mode="wait">
            {isOnboarding ? (
              /* ================= STEP 2: COMPLETE PROFILE ONBOARDING (ONE BY ONE) ================= */
              <motion.div
                key="onboarding-step"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="space-y-3.5"
              >
                {/* Header Section */}
                <div className="flex items-center gap-3.5 pb-3 border-b border-border/60">
                  {onboardingUser?.photoUrl && !avatarImgError ? (
                    <img
                      src={onboardingUser.photoUrl}
                      alt={onboardingUser.fullName || "User"}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={() => setAvatarImgError(true)}
                      className="w-12 h-12 sm:w-13 sm:h-13 rounded-full object-cover border-2 border-primary/30 shadow-md shrink-0 bg-muted"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                      <User className="w-6 h-6 text-white stroke-[2.2]" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                        Welcome, {onboardingUser?.fullName?.split(" ")[0] || "Yatri"}!
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Please complete your profile to continue.
                      </p>
                    </div>

                    {/* Step indicator on the right side */}
                    <div className="shrink-0">
                      <span className="inline-flex items-center px-3 py-1 bg-primary text-primary-foreground font-semibold text-xs rounded-full shadow-sm">
                        Step {currentStep + 1} of {onboardingQuestions.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="py-0.5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <OnboardingQuestion
                        question={currentQuestion as any}
                        value={getQuestionValue(currentQuestion.id)}
                        onChange={(val) => setQuestionValue(currentQuestion.id, val)}
                        onSubmit={handleNextStep}
                        onBack={handlePrevStep}
                        isFirstQuestion={currentStep === 0}
                        isLastQuestion={currentStep === onboardingQuestions.length - 1}
                        error={error || undefined}
                        isSubmitting={isLoading}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex justify-center pt-0.5">
                  <button
                    type="button"
                    onClick={handleCancelOnboarding}
                    disabled={isLoading}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5"
                  >
                    Cancel and sign in with a different account
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ================= STEP 1: LOGIN / SIGNUP ================= */
              <motion.div
                key="auth-step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2.5"
              >
                {/* Header with Proportionate Logo & Typography */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.05 }}
                    className="inline-flex items-center justify-center mb-1.5"
                  >
                    <img
                      src="/logo-192.png"
                      alt="Yatri Cloud Logo"
                      className="w-10 h-10 object-contain"
                    />
                  </motion.div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {isLogin ? "Welcome Back!" : "Join Yatri Cloud"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hello Yatris 👋
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 bg-destructive text-destructive-foreground font-medium rounded-xl text-xs text-center shadow-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Google Sign In */}
                <div className="flex justify-center w-full">
                  <div id="googleSignInDiv" className="flex justify-center w-full"></div>
                </div>

                {/* Divider */}
                <div className="relative my-1.5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-semibold tracking-wider">
                    <span className="bg-card px-2.5 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                {/* Login Form */}
                {isLogin ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email" className={fieldLabel}>
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={resetting}
                          className="text-[13px] font-medium text-primary hover:underline disabled:opacity-60"
                        >
                          {resetting ? "Sending…" : "Forgot password?"}
                        </button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-[15px] font-semibold rounded-xl"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                ) : (
                  /* Register Form */
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="register-name" className={fieldLabel}>Full name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Your full name"
                        value={registerData.fullName}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, fullName: e.target.value })
                        }
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <Label htmlFor="register-email" className={fieldLabel}>Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="register-password" className={fieldLabel}>Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, password: e.target.value })
                        }
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <Label htmlFor="register-confirm-password" className={fieldLabel}>Confirm password</Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerData.confirmPassword}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <Label htmlFor="register-photo" className={fieldLabel}>Profile photo<OptionalTag /></Label>
                      {photoPreview ? (
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm shrink-0">
                            <img
                              src={photoPreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={removePhoto}
                              className="absolute top-0 right-0 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {photoFile?.name}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <Input
                            id="register-photo"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                          <Label
                            htmlFor="register-photo"
                            className="flex items-center justify-center gap-2 w-full h-12 border border-dashed border-input rounded-xl cursor-pointer hover:bg-muted transition-colors bg-background px-3 text-sm text-muted-foreground font-medium"
                          >
                            <Upload className="w-4 h-4" />
                            Upload photo
                          </Label>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-[15px] font-semibold rounded-xl"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create account and continue"
                      )}
                    </Button>
                  </form>
                )}

                {/* Toggle Login/Signup */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError(null);
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {isLogin ? (
                      <>
                        Don't have an account?{" "}
                        <span className="font-semibold text-primary">Sign up</span>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <span className="font-semibold text-primary">Login</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
