import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionalTag, fieldLabel } from "@/components/ui/form-layout";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2, Upload, X, Calendar, Check, Edit, Trash2, Plus } from "lucide-react";
// Duplicate checks use getUserCertifications (the signed-in user's OWN rows):
// the public wall payload no longer carries emails (migration 037), and a
// duplicate is only meaningful within the same account anyway.
import { submitCertification } from "@/lib/google-sheets";
import { getUserCertifications, updateCertification, deleteCertification } from "@/lib/yatris-api";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useTheme } from "@/components/ThemeProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendEmail } from "@/lib/email";
import { getCertificateSubmissionEmail } from "@/lib/email-templates";
import {
  useCertCatalog,
  getFormProviders,
  getAllProviderCerts,
  FALLBACK_FORM_PROVIDERS,
  FALLBACK_PROVIDER_CERTS,
} from "@/lib/cert-catalog";

interface CertificationFormData {
  fullName: string;
  email: string;
  selectedProviders: string[]; // Array of selected provider values
  selectedCertifications: string[]; // Array of certification values
  certificationDate: string;
  linkedinUrl: string;
  verifiedCredential: string;
  country: string;
  stateProvince: string;
  city: string;
  countryCode: string;
  phoneNumber: string;
  photo: File | null;
  additionalNotes?: string;
}

interface SelectedCertification {
  value: string;
  label: string;
  code: string;
  logo?: string;
  logoLight?: string;
}

// Provider and certification data now come from the certification catalog
// (Supabase backed with byte identical fallbacks in @/lib/cert-catalog).


interface CertificationCredential {
  certificationValue: string;
  certificationName: string;
  examCode: string;
  certificationDate: string;
  verifiedCredential: string;
  additionalNotes?: string;
}

interface CertificationFormProps {
  user?: {
    email: string;
    fullName: string;
    linkedinUrl?: string;
    photoUrl?: string;
    country?: string;
    stateProvince?: string;
    city?: string;
    countryCode?: string;
    phoneNumber?: string;
  };
}

export const CertificationForm = ({ user }: CertificationFormProps) => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [existingCertifications, setExistingCertifications] = useState<any[]>([]);
  const [userCertifications, setUserCertifications] = useState<any[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  const [editingCert, setEditingCert] = useState<number | null>(null);
  const [currentCertIndex, setCurrentCertIndex] = useState(0);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [sortOrder, setSortOrder] = useState<'a-z' | 'z-a' | 'default'>('a-z');
  const [certSearchQuery, setCertSearchQuery] = useState('');

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState<'selection' | 'common-info' | 'credentials'>('selection');
  const [certificationCredentials, setCertificationCredentials] = useState<CertificationCredential[]>([]);


  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CertificationFormData>({
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      selectedProviders: [],
      selectedCertifications: [],
      linkedinUrl: user?.linkedinUrl || "",
      country: "",
      stateProvince: "",
      city: "",
      countryCode: "",
      phoneNumber: "",
      photo: null,
      additionalNotes: "",
    },
    mode: "onChange", // Enable validation on change
  });

  // Certification catalog (fallback renders first, live rows swap in quietly)
  const catalogProviders = useCertCatalog(getFormProviders, FALLBACK_FORM_PROVIDERS);
  const catalogCerts = useCertCatalog(getAllProviderCerts, FALLBACK_PROVIDER_CERTS);

  const CERTIFICATION_PROVIDERS = catalogProviders.map((p) => ({
    value: p.slug,
    label: p.label,
    logo: p.logoUrl,
    logoLight: p.logoLightUrl,
  }));

  const toSelectedCerts = (slug: string): SelectedCertification[] => {
    const provider = catalogProviders.find((p) => p.slug === slug);
    return (catalogCerts[slug] || []).map((c) => ({
      value: c.value,
      label: c.label,
      code: c.examCode,
      logo: provider?.logoUrl,
      logoLight: provider?.logoLightUrl,
    }));
  };

  const AWS_CERTIFICATIONS = toSelectedCerts("aws");
  const AZURE_CERTIFICATIONS = toSelectedCerts("azure");
  const GCP_CERTIFICATIONS = toSelectedCerts("gcp");
  const GITHUB_CERTIFICATIONS = toSelectedCerts("github");
  const ORACLE_CERTIFICATIONS = toSelectedCerts("oracle");
  const SALESFORCE_CERTIFICATIONS = toSelectedCerts("salesforce");
  const SERVICENOW_CERTIFICATIONS = toSelectedCerts("servicenow");
  const OPENAI_CERTIFICATIONS = toSelectedCerts("openai");
  const ANTHROPIC_CERTIFICATIONS = toSelectedCerts("anthropic");
  const SNOWFLAKE_CERTIFICATIONS = toSelectedCerts("snowflake");
  const HASHICORP_CERTIFICATIONS = toSelectedCerts("hashicorp");
  const KUBERNETES_CERTIFICATIONS = toSelectedCerts("kubernetes");

  // Check if user has submitted certifications before
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false);
  const [showAddNew, setShowAddNew] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const addNewParam = params.get("addNew");
    return addNewParam === "true" || addNewParam === "1";
  });
  const [isEditMode, setIsEditMode] = useState(false);


  // Load user certifications on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const addNewParam = params.get("addNew");
      if (addNewParam === "true" || addNewParam === "1") {
        setShowAddNew(true);
      }
    }

    if (user?.email) {
      loadUserCertifications();
      // Set photo preview if user has photo
      if (user.photoUrl) {
        setPhotoPreview(user.photoUrl);
      }
    }

    // Check if editing a certification from ManageCertifications page
    const editingCertStr = sessionStorage.getItem("editingCertification");
    if (editingCertStr) {
      try {
        const editingCert = JSON.parse(editingCertStr);
        // Get all certifications (not filtered by selected providers)
        const allCerts: SelectedCertification[] = [
          ...AWS_CERTIFICATIONS,
          ...AZURE_CERTIFICATIONS,
          ...GCP_CERTIFICATIONS,
          ...GITHUB_CERTIFICATIONS,
          ...ORACLE_CERTIFICATIONS,
          ...SALESFORCE_CERTIFICATIONS,
          ...SERVICENOW_CERTIFICATIONS,
        ];

        const matchingCert = allCerts.find(c =>
          c.label.toLowerCase() === editingCert.certificationName?.toLowerCase() ||
          c.code === editingCert.examCode
        );

        if (matchingCert) {
          // Set edit mode
          setIsEditMode(true);

          // Set the provider first
          const provider = matchingCert.value.split('-')[0];
          if (provider && CERTIFICATION_PROVIDERS.find(p => p.value === provider)) {
            setValue("selectedProviders", [provider]);
          }

          setValue("selectedCertifications", [matchingCert.value]);
          // Initialize credentials with the editing certification data
          const editCredential = {
            certificationValue: matchingCert.value,
            certificationName: editingCert.certificationName,
            examCode: editingCert.examCode,
            certificationDate: editingCert.certificationDate,
            verifiedCredential: editingCert.verifiedCredential || "",
            additionalNotes: editingCert.additionalNotes || "",
          };
          setCertificationCredentials([editCredential]);
          // Skip common-info step and go directly to credentials in edit mode
          setCurrentStep('credentials');

          // Pre-fill the credential form
          setTimeout(() => {
            setCredentialValue('certificationDate', editCredential.certificationDate || '');
            setCredentialValue('verifiedCredential', editCredential.verifiedCredential || '');
            setCredentialValue('additionalNotes', editCredential.additionalNotes || '');
          }, 100);

          toast({
            title: "Edit Mode",
            description: "Editing certification details only. Profile information will remain unchanged.",
          });
        }

        // Clear sessionStorage
        sessionStorage.removeItem("editingCertification");
      } catch (error) {
        console.error("Error parsing editing certification:", error);
      }
    }
  }, [user]);

  // Load user's existing certifications - instant from cache
  const loadUserCertifications = async () => {
    setIsLoadingCerts(true);

    // Load from cache immediately
    if (user?.email) {
      const cacheKey = `yatris_user_certifications_${user.email}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const certs = JSON.parse(cachedData);
          setUserCertifications(certs);
          setHasSubmittedBefore(certs.length > 0);
          setIsLoadingCerts(false);
        } catch (error) {
          console.warn("Error parsing cached certifications:", error);
        }
      }
    }

    // Then fetch fresh data in background
    try {
      const certs = await getUserCertifications();
      setUserCertifications(certs);
      setHasSubmittedBefore(certs.length > 0);
    } catch (error) {
      console.error("Error loading user certifications:", error);
    } finally {
      setIsLoadingCerts(false);
    }
  };

  // Separate form for certification credentials
  const {
    register: registerCredential,
    handleSubmit: handleSubmitCredential,
    formState: { errors: credentialErrors },
    setValue: setCredentialValue,
    watch: watchCredential,
    reset: resetCredential,
  } = useForm<{
    certificationValue?: string;
    certificationDate: string;
    verifiedCredential: string;
    additionalNotes?: string;
  }>({
    defaultValues: {
      certificationDate: "",
      verifiedCredential: "",
      additionalNotes: "",
    },
  });

  const selectedProviders = watch("selectedProviders") || [];
  const selectedCertifications = watch("selectedCertifications") || [];
  const email = watch("email");

  // Load existing certifications on mount for duplicate checking
  useEffect(() => {
    const loadExistingCertifications = async () => {
      try {
        const certs = await getUserCertifications();
        setExistingCertifications(certs);
      } catch (error) {
        console.error("Error loading existing certifications:", error);
        // Continue anyway - duplicate check will be done on submit
      }
    };
    loadExistingCertifications();
  }, []);


  // Get certifications based on provider
  const getCertifications = () => {
    const allCerts: SelectedCertification[] = [];
    if (selectedProviders.includes("aws")) {
      allCerts.push(...AWS_CERTIFICATIONS);
    }
    if (selectedProviders.includes("azure")) {
      allCerts.push(...AZURE_CERTIFICATIONS);
    }
    if (selectedProviders.includes("gcp")) {
      allCerts.push(...GCP_CERTIFICATIONS);
    }
    if (selectedProviders.includes("github")) {
      allCerts.push(...GITHUB_CERTIFICATIONS);
    }
    if (selectedProviders.includes("oracle")) {
      allCerts.push(...ORACLE_CERTIFICATIONS);
    }
    if (selectedProviders.includes("salesforce")) {
      allCerts.push(...SALESFORCE_CERTIFICATIONS);
    }
    if (selectedProviders.includes("servicenow")) {
      allCerts.push(...SERVICENOW_CERTIFICATIONS);
    }
    if (selectedProviders.includes("openai")) {
      allCerts.push(...OPENAI_CERTIFICATIONS);
    }
    if (selectedProviders.includes("anthropic")) {
      allCerts.push(...ANTHROPIC_CERTIFICATIONS);
    }
    if (selectedProviders.includes("snowflake")) {
      allCerts.push(...SNOWFLAKE_CERTIFICATIONS);
    }
    if (selectedProviders.includes("hashicorp")) {
      allCerts.push(...HASHICORP_CERTIFICATIONS);
    }
    if (selectedProviders.includes("kubernetes")) {
      allCerts.push(...KUBERNETES_CERTIFICATIONS);
    }
    return allCerts;
  };

  // Get provider for a certification value
  const getProviderForCertification = (certValue: string): string => {
    if (AWS_CERTIFICATIONS.some(c => c.value === certValue)) return "aws";
    if (AZURE_CERTIFICATIONS.some(c => c.value === certValue)) return "azure";
    if (GCP_CERTIFICATIONS.some(c => c.value === certValue)) return "gcp";
    if (GITHUB_CERTIFICATIONS.some(c => c.value === certValue)) return "github";
    if (ORACLE_CERTIFICATIONS.some(c => c.value === certValue)) return "oracle";
    if (SALESFORCE_CERTIFICATIONS.some(c => c.value === certValue)) return "salesforce";
    if (SERVICENOW_CERTIFICATIONS.some(c => c.value === certValue)) return "servicenow";
    if (OPENAI_CERTIFICATIONS.some(c => c.value === certValue)) return "openai";
    if (ANTHROPIC_CERTIFICATIONS.some(c => c.value === certValue)) return "anthropic";
    if (SNOWFLAKE_CERTIFICATIONS.some(c => c.value === certValue)) return "snowflake";
    if (HASHICORP_CERTIFICATIONS.some(c => c.value === certValue)) return "hashicorp";
    if (KUBERNETES_CERTIFICATIONS.some(c => c.value === certValue)) return "kubernetes";
    return "other";
  };

  // Handle provider toggle
  const handleProviderToggle = (providerValue: string, checked: boolean) => {
    const current = selectedProviders || [];
    if (checked) {
      if (!current.includes(providerValue)) {
        setValue("selectedProviders", [...current, providerValue], { shouldValidate: true });
      }
    } else {
      // Remove provider and all its certifications
      const newProviders = current.filter(p => p !== providerValue);
      setValue("selectedProviders", newProviders, { shouldValidate: true });
      // Remove certifications from this provider
      const certsToRemove = getCertificationsForProvider(providerValue).map(c => c.value);
      const remainingCerts = selectedCertifications.filter(certValue => !certsToRemove.includes(certValue));
      setValue("selectedCertifications", remainingCerts, { shouldValidate: true });
    }
  };

  // Get certifications for a specific provider
  const getCertificationsForProvider = (provider: string) => {
    if (provider === "aws") return AWS_CERTIFICATIONS;
    if (provider === "azure") return AZURE_CERTIFICATIONS;
    if (provider === "gcp") return GCP_CERTIFICATIONS;
    if (provider === "github") return GITHUB_CERTIFICATIONS;
    if (provider === "oracle") return ORACLE_CERTIFICATIONS;
    if (provider === "salesforce") return SALESFORCE_CERTIFICATIONS;
    if (provider === "servicenow") return SERVICENOW_CERTIFICATIONS;
    if (provider === "openai") return OPENAI_CERTIFICATIONS;
    if (provider === "anthropic") return ANTHROPIC_CERTIFICATIONS;
    if (provider === "snowflake") return SNOWFLAKE_CERTIFICATIONS;
    if (provider === "hashicorp") return HASHICORP_CERTIFICATIONS;
    if (provider === "kubernetes") return KUBERNETES_CERTIFICATIONS;
    return [];
  };

  // Check for duplicate submission
  const checkDuplicate = (email: string, certificationName: string, examCode: string, provider?: string): boolean => {
    if (!email || !certificationName || !examCode) return false;

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCertName = certificationName.toLowerCase().trim();
    const normalizedExamCode = examCode.toLowerCase().trim();
    const normalizedProvider = provider ? provider.toLowerCase().trim() : null;

    const duplicate = existingCertifications.find((cert) => {
      const existingEmail = (cert.email || "").toLowerCase().trim();
      const existingCertName = (cert.certificationName || "").toLowerCase().trim();
      const existingExamCode = (cert.examCode || "").toLowerCase().trim();
      const existingProvider = (cert.certificationProvider || "").toLowerCase().trim();

      // First check: email, certification name, and exam code must match
      const basicMatch = (
        existingEmail === normalizedEmail &&
        existingCertName === normalizedCertName &&
        existingExamCode === normalizedExamCode
      );

      if (!basicMatch) return false;

      // If provider is provided in the check, it MUST match
      // This ensures AWS and Azure certs with same name are treated separately
      if (normalizedProvider) {
        // If we're checking with a provider, the existing cert must also have that provider
        if (!existingProvider) {
          return false; // Existing cert has no provider, can't be a duplicate
        }
        return existingProvider === normalizedProvider;
      }

      // If no provider specified in check, match without provider requirement
      return true;
    });

    if (duplicate) {
      console.log(`Duplicate match found:`, {
        existing: {
          email: duplicate.email,
          certName: duplicate.certificationName,
          examCode: duplicate.examCode,
          provider: duplicate.certificationProvider
        },
        new: {
          email: normalizedEmail,
          certName: normalizedCertName,
          examCode: normalizedExamCode,
          provider: normalizedProvider
        }
      });
    } else {
      console.log(`No duplicate found for:`, {
        email: normalizedEmail,
        certName: normalizedCertName,
        examCode: normalizedExamCode,
        provider: normalizedProvider,
        totalExistingCerts: existingCertifications.length
      });
    }

    return !!duplicate;
  };

  // Handle certification toggle (multiple selection)
  const handleCertificationToggle = (certValue: string, checked: boolean) => {
    const current = selectedCertifications || [];
    if (checked) {
      // Only add if not already in the array
      if (!current.includes(certValue)) {
        setValue("selectedCertifications", [...current, certValue], { shouldValidate: true });
      }
    } else {
      // Remove from array
      setValue("selectedCertifications", current.filter(v => v !== certValue), { shouldValidate: true });
    }
  };

  // Handle "Done" button - move to common info step
  const handleDoneSelection = () => {
    if (selectedCertifications.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one certification.",
        variant: "destructive",
      });
      return;
    }
    // Initialize credentials array for each selected certification
    const certifications = getCertifications();
    const initialCredentials: CertificationCredential[] = selectedCertifications.map(certValue => {
      const cert = certifications.find(c => c.value === certValue);
      return {
        certificationValue: certValue,
        certificationName: cert?.label || '',
        examCode: cert?.code || '',
        certificationDate: '',
        verifiedCredential: '',
      };
    });
    setCertificationCredentials(initialCredentials);
    setCurrentStep('common-info');
  };

  // Handle final submission - submit all certifications with credentials
  const handleCommonInfoSubmit = async (data: CertificationFormData) => {
    // Validate that we have selected certifications
    if (!selectedCertifications || selectedCertifications.length === 0) {
      toast({
        title: "Error",
        description: "Please go back and select at least one certification.",
        variant: "destructive",
      });
      return;
    }

    // Validate photo (only if user hasn't submitted before AND user doesn't have a photo from signup)
    // If user is logged in and has a photo from signup, use that instead
    if (!hasSubmittedBefore && !user?.photoUrl && (!data.photo || !photoPreview)) {
      toast({
        title: "Validation Error",
        description: "Please upload a photo.",
        variant: "destructive",
      });
      return;
    }

    // If user has photo from signup, ensure it's set in photoPreview
    if (user?.photoUrl && !photoPreview) {
      setPhotoPreview(user.photoUrl);
    }

    // Validate that all certifications are selected
    const missingCerts = certificationCredentials.filter(
      (cred) => !cred.certificationValue || cred.certificationValue.trim() === ''
    );

    if (missingCerts.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please select a certification for all ${missingCerts.length} certification(s).`,
        variant: "destructive",
      });
      return;
    }

    // Submit all certifications (fire and forget - it handles its own state)
    submitAllCertifications();
  };

  // Handle credential field updates
  const handleCredentialUpdate = (certValue: string, field: 'certificationDate' | 'verifiedCredential', value: string) => {
    const updated = [...certificationCredentials];
    const index = updated.findIndex(c => c.certificationValue === certValue);
    if (index >= 0) {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      setCertificationCredentials(updated);
    }
  };

  // Handle credential submission for current certification
  const handleCredentialSubmit = async (credentialData: { certificationDate: string; verifiedCredential: string; additionalNotes?: string }) => {
    const updated = [...certificationCredentials];
    updated[currentCertIndex] = {
      ...updated[currentCertIndex],
      ...credentialData,
    };
    setCertificationCredentials(updated);

    // If in edit mode, update immediately and navigate back
    if (isEditMode) {
      const currentCert = updated[currentCertIndex];
      if (currentCert && user?.email) {
        // Optimistically update cache immediately
        updateCacheOptimistically(currentCert, credentialData);

        // Submit in background
        submitAllCertifications();

        // Navigate back immediately
        setTimeout(() => {
          window.location.href = '/manage-certifications';
        }, 100);
      }
      return;
    }

    // Move to next certification or submit all
    if (currentCertIndex < certificationCredentials.length - 1) {
      setCurrentCertIndex(currentCertIndex + 1);
      resetCredential();
      // Pre-fill next certification's exam code if available
      const nextCert = updated[currentCertIndex + 1];
      if (nextCert) {
        setCredentialValue('certificationDate', '');
        setCredentialValue('verifiedCredential', '');
        setCredentialValue('additionalNotes', '');
      }
    } else {
      // All credentials collected, submit everything
      submitAllCertifications();
    }
  };

  // Optimistically update cache with new certifications immediately
  const updateCacheWithNewCertifications = (credentials: CertificationCredential[], userEmail: string) => {
    try {
      const cacheKey = `yatris_user_certifications_${userEmail}`;
      const cachedData = localStorage.getItem(cacheKey);

      const newCerts = credentials.map((cred, index) => {
        // Use the getProviderForCertification function
        const provider = getProviderForCertification(cred.certificationValue);
        return {
          id: `${provider}-${cred.examCode}-${userEmail}-${Date.now()}-${index}`,
          fullName: user?.fullName || '',
          email: userEmail,
          certificationProvider: provider,
          certificationName: cred.certificationName,
          examCode: cred.examCode,
          certificationDate: '', // Year Passed field removed
          verifiedCredential: cred.verifiedCredential || '',
          additionalNotes: cred.additionalNotes || '',
          linkedinUrl: user?.linkedinUrl || '',
          photoUrl: user?.photoUrl || '',
          country: user?.country || '',
        };
      });

      const existingCerts = cachedData ? JSON.parse(cachedData) : [];
      const updatedCerts = [...existingCerts, ...newCerts];

      // Update cache immediately
      localStorage.setItem(cacheKey, JSON.stringify(updatedCerts));
      localStorage.setItem(`yatris_user_certifications_timestamp_${userEmail}`, Date.now().toString());

      // Dispatch custom event to update ManageCertifications page
      window.dispatchEvent(new CustomEvent('certificationsUpdated', { detail: updatedCerts }));
    } catch (error) {
      console.warn("Error updating cache with new certifications:", error);
    }
  };

  // Optimistically update cache immediately
  const updateCacheOptimistically = (cert: any, updatedData: any) => {
    if (!user?.email) return;

    try {
      const cacheKey = `yatris_user_certifications_${user.email}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        const certs = JSON.parse(cachedData);
        const updatedCerts = certs.map((c: any) => {
          // Match by exam code and provider
          if (c.examCode === cert.examCode &&
            c.certificationProvider?.toLowerCase() === cert.certificationProvider?.toLowerCase()) {
            return {
              ...c,
              certificationDate: updatedData.certificationDate || c.certificationDate,
              verifiedCredential: updatedData.verifiedCredential || c.verifiedCredential,
              additionalNotes: updatedData.additionalNotes || c.additionalNotes,
            };
          }
          return c;
        });

        // Update cache immediately
        localStorage.setItem(cacheKey, JSON.stringify(updatedCerts));
        localStorage.setItem(`yatris_user_certifications_timestamp_${user.email}`, Date.now().toString());

        // Dispatch custom event to update ManageCertifications page
        window.dispatchEvent(new CustomEvent('certificationsUpdated', { detail: updatedCerts }));
      }
    } catch (error) {
      console.warn("Error updating cache optimistically:", error);
    }
  };

  // Submit all certifications with their credentials
  const submitAllCertifications = async () => {
    setIsSubmitting(true);
    try {
      const commonData = watch();

      const submissionPromises = certificationCredentials.map(async (cred) => {
        try {
          // Determine provider for this certification
          const certProvider = getProviderForCertification(cred.certificationValue);
          console.log(`Processing certification: ${cred.certificationName} (${cred.examCode})`);
          console.log(`Detected provider: ${certProvider}`);
          console.log(`Certification value: ${cred.certificationValue}`);

          const sheetName = certProvider === "aws"
            ? "certified-aws-yatris"
            : certProvider === "azure"
              ? "certified-azure-yatris"
              : certProvider === "gcp"
                ? "certified-gcp-yatris"
                : certProvider === "github"
                  ? "certified-github-yatris"
                  : certProvider === "oracle"
                    ? "certified-oracle-yatris"
                    : certProvider === "salesforce"
                      ? "certified-salesforce-yatris"
                      : certProvider === "servicenow"
                        ? "certified-servicenow-yatris"
                        : certProvider === "openai"
                          ? "certified-openai-yatris"
                          : certProvider === "anthropic"
                            ? "certified-anthropic-yatris"
                            : certProvider === "snowflake"
                              ? "certified-snowflake-yatris"
                              : certProvider === "hashicorp"
                              ? "certified-hashicorp-yatris"
                            : certProvider === "kubernetes"
                              ? "certified-kubernetes-yatris"
                              : "certified-other-yatris";

          console.log(`Target sheet: ${sheetName}`);

          // Check for duplicates (include provider in check)
          const isDuplicate = checkDuplicate(commonData.email, cred.certificationName, cred.examCode, certProvider);
          if (isDuplicate) {
            console.warn(`Duplicate detected: ${cred.certificationName} (${cred.examCode}) for ${commonData.email} from ${certProvider.toUpperCase()}`);
            console.warn(`This exact certification already exists. Skipping to prevent duplicate entries.`);
            return { success: false, reason: 'duplicate', provider: certProvider, cert: cred.certificationName };
          }

          console.log(`No duplicate found for ${certProvider.toUpperCase()}: ${cred.certificationName} (${cred.examCode})`);

          const subSheetName = `${cred.examCode}: ${cred.certificationName}`;

          console.log(`Submitting ${certProvider.toUpperCase()} certification: ${cred.certificationName} to ${sheetName}`);

          // Always use the old API to write to separate provider sheets
          // This ensures data appears in achievements section
          // Use user data if available (when hasSubmittedBefore), otherwise use form data
          // For photo: use user's photoUrl if available, otherwise use form photo
          const photoToUse = user?.photoUrl
            ? null // If user has photoUrl, we'll pass it as photoUrl string (handled separately)
            : (commonData.photo || null);

          await submitCertification({
            fullName: hasSubmittedBefore ? (user?.fullName || '') : (user?.fullName || commonData.fullName),
            email: hasSubmittedBefore ? (user?.email || '') : (user?.email || commonData.email),
            certificationProvider: certProvider,
            certificationName: cred.certificationName,
            examCode: cred.examCode,
            certificationDate: '', // Year Passed field removed
            linkedinUrl: user?.linkedinUrl || '',
            verifiedCredential: cred.verifiedCredential,
            country: user?.country || '',
            stateProvince: user?.stateProvince || '',
            city: user?.city || '',
            countryCode: user?.countryCode || '',
            phoneNumber: user?.phoneNumber || '',
            photo: photoToUse,
            photoUrl: user?.photoUrl || (photoPreview && !photoPreview.startsWith('data:') ? photoPreview : ''), // Pass photoUrl if user has one from signup
            additionalNotes: commonData.additionalNotes || '',
            sheetName,
            subSheetName,
          });

          console.log(`Successfully submitted ${certProvider.toUpperCase()} certification: ${cred.certificationName}`);
          return { success: true, provider: certProvider, cert: cred.certificationName };
        } catch (error: any) {
          console.error(`Error submitting certification ${cred.certificationName}:`, error);
          const certProvider = getProviderForCertification(cred.certificationValue);
          return { success: false, reason: 'error', error: error.message, provider: certProvider, cert: cred.certificationName };
        }
      });

      const results = await Promise.all(submissionPromises);
      const successful = results.filter(r => r && r.success === true).length;
      const failed = results.filter(r => r && r.success === false);
      const total = certificationCredentials.length;

      // Send Confirmation Email for successful submissions
      if (successful > 0) {
        try {
          const successNames = results
            .filter(r => r && r.success === true)
            .map(r => r?.cert)
            .join(', ');

          const providerName = results
            .filter(r => r && r.success === true)
            .map(r => r?.provider?.toUpperCase())
            .filter((v, i, a) => a?.indexOf(v) === i) // Unique providers
            .join(' & ');

          // Use first user name available
          const recipientName = hasSubmittedBefore ? (user?.fullName || '') : (user?.fullName || commonData.fullName);
          const recipientEmail = hasSubmittedBefore ? (user?.email || '') : (user?.email || commonData.email);

          const emailHtml = getCertificateSubmissionEmail(recipientName, successNames, providerName);

          // Send in background
          sendEmail({
            to: recipientEmail,
            subject: `Submission Received: ${successNames}`,
            html: emailHtml
          }).catch(err => console.error("Email API error:", err));

        } catch (emailErr) {
          console.error("Failed to prepare submission confirmation email", emailErr);
        }
      }

      // Log detailed results
      console.log(`Submission Summary: ${successful}/${total} successful`);
      if (failed.length > 0) {
        console.error(`Failed submissions:`, failed);
        failed.forEach((f: any) => {
          console.error(`  - ${f.provider.toUpperCase()}: ${f.cert} - ${f.reason}${f.error ? `: ${f.error}` : ''}`);
        });
      }

      // Show detailed success/error message
      if (failed.length > 0) {
        const failedProviders = [...new Set(failed.map((f: any) => f.provider))];
        toast({
          title: "Partial Success",
          description: `${successful} of ${total} certification${total > 1 ? 's' : ''} submitted. ${failed.length} failed (${failedProviders.join(', ').toUpperCase()}). Check browser console for details.`,
          variant: "destructive",
        });
        // Don't reset form if there were failures - let user see what happened
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      reset();
      resetCredential();
      setPhotoPreview(null);
      setCurrentStep('selection');
      setCurrentCertIndex(0);
      setCertificationCredentials([]);
      setShowAddNew(false); // Reset to show certifications view

      toast({
        title: "Success!",
        description: `Successfully submitted ${successful} of ${total} certification${total > 1 ? 's' : ''}! A confirmation email has been sent.`,
      });

      // Optimistically update cache immediately with submitted certifications
      if (user?.email) {
        updateCacheWithNewCertifications(certificationCredentials, user.email);
      }

      // Reload certifications from achievements in background (no delay)
      (async () => {
        try {
          const currentCerts = await getUserCertifications();
          setExistingCertifications(currentCerts);
          // Also reload user certifications if authenticated
          if (user?.email) {
            await loadUserCertifications();
          }
        } catch (e) {
          console.warn("Background certification refresh failed:", e);
        }
      })();
    } catch (error: any) {
      console.error("Error submitting certifications:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to submit certifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setValue("photo", file, { shouldValidate: true, shouldDirty: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setValue("photo", null, { shouldValidate: true });
      setPhotoPreview(null);
    }
  };

  // Handle form submission
  const onSubmit = async (data: CertificationFormData) => {
    // Validate required fields
    if (!selectedProviders || selectedProviders.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one certification provider",
        variant: "destructive",
      });
      return;
    }

    // Validation is now handled in the submission function

    if (!photoPreview || !data.photo) {
      toast({
        title: "Validation Error",
        description: "Please upload your photo",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate submission
    setIsCheckingDuplicates(true);
    try {
      // Refresh certifications list before checking to get latest data
      console.log("Refreshing existing certifications before submission...");
      const currentCerts = await getUserCertifications();
      console.log(`Loaded ${currentCerts.length} existing certifications for duplicate check`);
      setExistingCertifications(currentCerts);
      // Duplicate checking is now done per certification in the submission loop
    } catch (error) {
      console.error("Error checking duplicates:", error);
      // Continue with submission if duplicate check fails
    } finally {
      setIsCheckingDuplicates(false);
    }

    setIsSubmitting(true);
    setIsSuccess(false);

    try {
      // Validate that at least one certification is selected
      if (!data.selectedCertifications || data.selectedCertifications.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one certification.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Get all certifications for selected providers
      const certifications = getCertifications();

      // Submit each selected certification separately
      const submissionPromises = data.selectedCertifications.map(async (certValue) => {
        const selectedCert = certifications.find((c) => c.value === certValue);
        if (!selectedCert) {
          throw new Error(`Certification not found: ${certValue}`);
        }

        // Determine provider for this certification
        const certProvider = getProviderForCertification(certValue);
        const sheetName = certProvider === "aws"
          ? "certified-aws-yatris"
          : certProvider === "azure"
            ? "certified-azure-yatris"
            : certProvider === "gcp"
              ? "certified-gcp-yatris"
              : certProvider === "github"
                ? "certified-github-yatris"
                : certProvider === "oracle"
                  ? "certified-oracle-yatris"
                  : certProvider === "salesforce"
                    ? "certified-salesforce-yatris"
                    : certProvider === "servicenow"
                      ? "certified-servicenow-yatris"
                      : "certified-other-yatris";

        const fullCertificationName = selectedCert.label;
        const examCode = selectedCert.code;

        // Check for duplicates before submitting (include provider)
        if (checkDuplicate(data.email, fullCertificationName, examCode, certProvider)) {
          console.warn(`Skipping duplicate: ${fullCertificationName} (${examCode}) for ${data.email} from ${certProvider.toUpperCase()}`);
          return null; // Skip this one
        }

        // Create sub-sheet name in format: "Exam Code: Certification Name"
        const subSheetName = `${examCode}: ${fullCertificationName}`;

        // Submit to Google Sheets (always use old flow to write to separate provider sheets)
        return await submitCertification({
          fullName: user?.fullName || data.fullName,
          email: user?.email || data.email,
          certificationProvider: certProvider,
          certificationName: fullCertificationName,
          examCode: examCode,
          certificationDate: data.certificationDate,
          linkedinUrl: user?.linkedinUrl || data.linkedinUrl,
          verifiedCredential: data.verifiedCredential,
          country: user?.country || '',
          stateProvince: user?.stateProvince || '',
          city: user?.city || '',
          countryCode: user?.countryCode || '',
          phoneNumber: user?.phoneNumber || '',
          photo: null,
          photoUrl: user?.photoUrl || '', // reuse the profile photo URL; `photo` is for File uploads only
          additionalNotes: data.additionalNotes,
          sheetName,
          subSheetName,
        });
      });

      // Wait for all submissions to complete
      const results = await Promise.all(submissionPromises);
      const successful = results.filter(r => r !== null).length;
      const total = data.selectedCertifications.length;

      setIsSuccess(true);
      reset();
      setPhotoPreview(null);

      toast({
        title: "Success!",
        description: `Successfully submitted ${successful} of ${total} certification${total > 1 ? 's' : ''}!`,
      });
    } catch (error: any) {
      console.error("Error submitting certification:", error);
      const errorMessage = error?.message || "Failed to submit certification. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </motion.div>
        <h2 className="font-display text-3xl font-bold tracking-tight mb-4">Thank you!</h2>
        <p className="text-muted-foreground mb-8">
          Your certification has been submitted successfully. You'll appear on the Wall of Fame soon!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button onClick={() => {
            setIsSuccess(false);
            reset();
            setCurrentStep('selection');
            setShowAddNew(false);
            if (user?.email) {
              loadUserCertifications();
            }
          }}>Submit Another</Button>
          <Button
            variant="default"
            onClick={() => {
              window.location.href = "/achievements";
            }}
          >
            View Achievements
          </Button>
          {user?.email && (
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/manage-certifications";
              }}
            >
              Manage Certifications
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  // Handle delete certification, removes the user's own row (RLS-enforced).
  const handleDeleteCertification = async (cert: any) => {
    if (!confirm("Are you sure you want to delete this certification?\n\nNote: This action cannot be undone. The certification will be removed from the achievements section.")) {
      return;
    }

    const result = await deleteCertification(cert.id);
    if (result.success) {
      toast({ title: "Deleted", description: "Your certification has been removed." });
    } else {
      toast({
        title: "Delete Failed",
        description: result.error || "Could not delete certification. Please try again.",
        variant: "destructive",
      });
    }

    await loadUserCertifications();
  };

  // Handle edit certification
  // Navigate to edit mode with certification data
  const handleEditCertification = (cert: any) => {
    // Store certification data in sessionStorage for edit mode
    sessionStorage.setItem("editingCertification", JSON.stringify({
      certificationName: cert.certificationName,
      examCode: cert.examCode,
      certificationDate: cert.certificationDate,
      certificationProvider: cert.certificationProvider,
      verifiedCredential: cert.verifiedCredential || "",
      additionalNotes: cert.additionalNotes || "",
    }));

    // Navigate to form (remove edit param to show form)
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    // Navigate to the form page without edit param
    window.location.href = url.toString();
  };

  // Group certifications by provider
  const groupedCerts = userCertifications.reduce((acc, cert) => {
    const provider = cert.certificationProvider?.toLowerCase() || "other";
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(cert);
    return acc;
  }, {} as Record<string, any[]>);

  const providerLabels: Record<string, string> = {
    aws: "AWS",
    azure: "Azure",
    gcp: "Google Cloud",
    github: "GitHub",
    oracle: "Oracle",
    salesforce: "Salesforce",
    servicenow: "ServiceNow",
    other: "Other",
  };

  // Check if we're editing a certification first (before redirecting)
  const isEditingCert = sessionStorage.getItem("editingCertification");

  // If editing, don't redirect - show the edit form
  // The edit mode useEffect will set currentStep to 'credentials' and isEditMode to true
  if (isEditingCert || isEditMode || currentStep === 'credentials') {
    // Let the edit mode logic handle the display - don't redirect
  } else if (hasSubmittedBefore && !showAddNew && user?.email && !isLoadingCerts) {
    // Redirect to manage certifications page
    window.location.href = '/manage-certifications';
    return null;
  }

  // Render step 1: Certification Selection (for new submissions or when showAddNew is true)
  if (currentStep === 'selection') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">

        {/* New Certification Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-6 md:p-10"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-2">Select your certifications</h2>
          <p className="text-muted-foreground mb-8">
            Choose the certifications you want to submit
          </p>

          <div className="space-y-6">
            {/* Show message that profile info will be used from account if user is logged in */}
            {(hasSubmittedBefore || showAddNew || user?.email) ? (
              <div className="p-4 bg-muted/50 border border-border rounded-xl">
                <p className="text-sm text-foreground font-medium">
                  Your profile information will be used from your account. You can update it in the Profile section.
                </p>
              </div>
            ) : (
              <>
                {/* Full Name - only show if user is not logged in */}
                <div>
                  <Label htmlFor="fullName" className={fieldLabel}>
                    Full name
                  </Label>
                  <Input
                    id="fullName"
                    {...register("fullName", { required: "Full name is required" })}
                    placeholder="Your full name"
                    className="w-full"
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-[13px] text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Email - only show if user is not logged in */}
                <div>
                  <Label htmlFor="email" className={fieldLabel}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    placeholder="you@example.com"
                    className="w-full"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-[13px] text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Multiple Provider Selection - Card Style */}
            <div>
              <Label className="mb-1.5 block text-base font-semibold">
                Step 1: Choose your certification providers
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose one or more providers. You can select multiple providers to submit certifications from different platforms.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {CERTIFICATION_PROVIDERS.map((provider) => {
                  const isChecked = selectedProviders.includes(provider.value);
                  return (
                    <motion.div
                      key={provider.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleProviderToggle(provider.value, !isChecked)}
                      className={`
                      relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-200
                      ${isChecked
                          ? 'bg-card border-primary ring-[3px] ring-ring/25'
                          : 'bg-background border-input hover:border-primary/50 hover:bg-muted'
                        }
                    `}
                    >
                      {/* Check Icon */}
                      {isChecked && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </motion.div>
                      )}

                      {/* Provider Content */}
                      <div className="flex flex-col items-center text-center space-y-2">
                        {provider.logo && (
                          <div className="flex justify-center mb-2">
                            <img
                              src={
                                provider.value === 'github'
                                  ? (theme === 'dark' ? provider.logo : (provider as any).logoLight || provider.logo) // Interchanged for GitHub
                                  : (theme === 'dark' && (provider as any).logoLight ? (provider as any).logoLight : provider.logo)
                              }
                              alt={provider.label}
                              className={`h-12 w-auto object-contain ${provider.value === 'terraform'
                                ? 'dark:invert'
                                : provider.value === 'github' && theme === 'light'
                                  ? 'invert' // Invert white icon for light theme
                                  : ''
                                } ${provider.value === 'oracle' || provider.value === 'servicenow'
                                  ? 'max-w-[120px]' // Limit width for Oracle and ServiceNow
                                  : ''
                                }`}
                              onError={(e) => {
                                // Hide image if it fails to load
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="font-semibold text-base text-foreground">
                          {provider.label}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Selection Feedback */}
              {selectedProviders.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl"
                >
                  <p className="text-sm text-destructive font-medium">
                    Please select at least one provider to continue
                  </p>
                </motion.div>
              )}
              {selectedProviders.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-muted/50 border border-border rounded-xl"
                >
                  <p className="text-sm text-foreground font-medium">
                    {selectedProviders.length} provider{selectedProviders.length > 1 ? 's' : ''} selected
                    {selectedProviders.length > 1 && ". Great, you can submit certifications from more than one platform."}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Multiple Certification Selection - Grouped by Provider */}
            {selectedProviders.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="block text-base font-semibold">
                    Step 2: Choose your certifications
                  </Label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="w-full sm:w-64">
                      <Input
                        type="text"
                        value={certSearchQuery}
                        onChange={(e) => setCertSearchQuery(e.target.value)}
                        placeholder="Search by name or exam code"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Sort:</Label>
                      <Select value={sortOrder} onValueChange={(value: 'a-z' | 'z-a' | 'default') => setSortOrder(value)}>
                        <SelectTrigger className="w-[120px] h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a-z">A to Z</SelectItem>
                          <SelectItem value="z-a">Z to A</SelectItem>
                          <SelectItem value="default">Default</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose the specific certifications you want to submit. You can select multiple certifications from your chosen providers.
                </p>
                <div className="border border-border rounded-xl p-4 max-h-96 overflow-y-auto bg-background space-y-6">
                  {selectedProviders.map((providerValue) => {
                    const provider = CERTIFICATION_PROVIDERS.find(p => p.value === providerValue);
                    const providerCerts = getCertificationsForProvider(providerValue);
                    if (providerCerts.length === 0) return null;

                    const providerColors: Record<string, string> = {
                      aws: "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
                      azure: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
                      gcp: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
                      github: "text-muted-foreground dark:text-muted-foreground border-border dark:border-border",
                      oracle: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
                      salesforce: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
                      servicenow: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
                      openai: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                      anthropic: "text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-800",
                      snowflake: "text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
                      hashicorp: "text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
                      kubernetes: "text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
                      other: "text-muted-foreground dark:text-muted-foreground border-border dark:border-border"
                    };
                    const colorClass = providerColors[providerValue] || providerColors.other;

                    return (
                      <div key={providerValue} className="space-y-3">
                        <div className={`flex items-center gap-2 pb-2 border-b ${colorClass.split(' ')[2]}`}>
                          <h4 className={`font-semibold text-sm ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]}`}>
                            {provider?.label} Certifications
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2 ml-2">
                          {[...providerCerts]
                            .filter((cert) => {
                              if (!certSearchQuery) return true;
                              const query = certSearchQuery.toLowerCase();
                              return (
                                cert.label.toLowerCase().includes(query) ||
                                cert.code.toLowerCase().includes(query)
                              );
                            })
                            .sort((a, b) => {
                              if (sortOrder === 'a-z') {
                                return a.label.localeCompare(b.label);
                              } else if (sortOrder === 'z-a') {
                                return b.label.localeCompare(a.label);
                              }
                              return 0;
                            }).map((cert) => {
                              const isChecked = selectedCertifications.includes(cert.value);
                              return (
                                <motion.div
                                  key={cert.value}
                                  whileHover={{ x: 4 }}
                                  className={`
                                flex items-center space-x-3 py-2.5 px-3 rounded-lg border transition-all cursor-pointer
                                ${isChecked
                                      ? 'bg-background border-primary'
                                      : 'bg-background hover:bg-muted border-border'
                                    }
                              `}
                                  onClick={() => handleCertificationToggle(cert.value, !isChecked)}
                                >
                                  <div className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                                ${isChecked
                                      ? 'bg-primary border-primary'
                                      : 'border-muted-foreground/40'
                                    }
                              `}>
                                    {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                                  </div>
                                  {cert.logo && (
                                    <div className="flex-shrink-0">
                                      <img
                                        src={
                                          cert.logo.includes('github-white-icon')
                                            ? (theme === 'dark' ? cert.logo : (cert as any).logoLight || cert.logo) // Interchanged for GitHub
                                            : (theme === 'dark' && (cert as any).logoLight ? (cert as any).logoLight : cert.logo)
                                        }
                                        alt={cert.label}
                                        className={`h-8 w-auto object-contain ${cert.logo && cert.logo.includes('HashiCorp')
                                          ? 'dark:invert'
                                          : cert.logo.includes('github-white-icon') && theme === 'light'
                                            ? 'invert' // Invert white icon for light theme
                                            : ''
                                          }`}
                                        onError={(e) => {
                                          // Hide image if it fails to load
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-medium text-sm ${isChecked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                      {cert.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      Exam Code: <span className="font-mono font-semibold">{cert.code}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selection Feedback */}
                {selectedCertifications.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl"
                  >
                    <p className="text-sm text-destructive font-medium">
                      Please select at least one certification to continue
                    </p>
                  </motion.div>
                )}
                {selectedCertifications.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-muted/50 border border-border rounded-xl"
                  >
                    <p className="text-sm text-foreground font-medium">
                      {selectedCertifications.length} certification{selectedCertifications.length > 1 ? 's' : ''} selected
                      {selectedCertifications.length > 1 && " - Ready to proceed!"}
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Selected Certifications Summary */}
            {selectedCertifications.length > 0 && (
              <div className="mt-6 p-4 bg-card border border-border rounded-xl">
                <h3 className="font-semibold mb-3 text-foreground">Selected certifications</h3>
                <div className="space-y-2">
                  {selectedCertifications.map((certValue) => {
                    const cert = getCertifications().find(c => c.value === certValue);
                    if (!cert) return null;
                    return (
                      <div key={certValue} className="flex items-center justify-between p-2 bg-background rounded-lg border border-border">
                        <div>
                          <span className="font-medium">{cert.label}</span>
                          <span className="text-sm text-muted-foreground ml-2">({cert.code})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCertificationToggle(certValue, false)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Done Button */}
            {selectedCertifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-end pt-6 border-t border-border mt-6"
              >
                <div className="text-sm text-muted-foreground mb-3 text-right">
                  {selectedCertifications.length} certification{selectedCertifications.length > 1 ? 's' : ''} ready to submit
                </div>
                <Button
                  type="button"
                  onClick={handleDoneSelection}
                  className="h-12 rounded-xl px-8 text-[15px] font-semibold"
                  disabled={selectedCertifications.length === 0}
                  size="lg"
                >
                  Continue to next step
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-right max-w-md">
                  You can add more certifications later by clicking "Back to add more certifications" in the next step
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Render step 2: Common Information
  if (currentStep === 'common-info') {
    return (
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-6 md:p-10"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-2">Your information</h2>
          <p className="text-muted-foreground mb-8">
            Enter your personal details (this will be used for all certifications)
          </p>

          {/* Back to Selection Button */}
          <div className="mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentStep('selection');
              }}
              className="mb-4"
            >
              Back to add more certifications
            </Button>
            <p className="text-sm text-muted-foreground">
              You can go back to add more certifications from other providers
            </p>
          </div>

          {/* Selected Certifications Summary */}
          {selectedCertifications.length > 0 && (
            <div className="mb-6 p-4 bg-card border border-border rounded-xl">
              <h3 className="font-semibold mb-3 text-foreground">Selected certifications ({selectedCertifications.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedCertifications.map((certValue) => {
                  const cert = getCertifications().find(c => c.value === certValue);
                  if (!cert) return null;
                  const provider = getProviderForCertification(certValue);
                  const providerLabel = CERTIFICATION_PROVIDERS.find(p => p.value === provider)?.label || provider;
                  return (
                    <div key={certValue} className="flex items-center justify-between p-2 bg-background rounded-lg border border-border text-sm">
                      <div>
                        <span className="font-medium">{cert.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">({cert.code}) · {providerLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(handleCommonInfoSubmit)} className="space-y-6">
            {/* Show message that profile info will be used from account */}
            {(hasSubmittedBefore || showAddNew || user?.email) ? (
              <div className="p-4 bg-muted/50 border border-border rounded-xl">
                <p className="text-sm text-foreground font-medium">
                  Your profile information will be used from your account. You can update it in the Profile section.
                </p>
              </div>
            ) : (
              <>
                {/* Full Name - only show if user is not logged in */}
                <div>
                  <Label htmlFor="fullName" className={fieldLabel}>
                    Full name
                  </Label>
                  <Input
                    id="fullName"
                    {...register("fullName", { required: "Full name is required" })}
                    placeholder="Your full name"
                    className="w-full"
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-[13px] text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Email - only show if user is not logged in */}
                <div>
                  <Label htmlFor="email" className={fieldLabel}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    placeholder="you@example.com"
                    className="w-full"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-[13px] text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Selected Certifications with Credential Inputs */}
            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="text-base font-semibold text-foreground">Credentials for each certification</h3>
              {certificationCredentials.map((cred) => {
                const cert = getCertifications().find(c => c.value === cred.certificationValue);
                if (!cert) return null;

                return (
                  <div key={cred.certificationValue} className="p-5 bg-background border border-border rounded-xl space-y-4">
                    <div className="pb-3 border-b border-border">
                      <h4 className="text-base font-semibold">{cert.label}</h4>
                      <p className="text-sm text-muted-foreground">Exam Code: {cert.code}</p>
                    </div>


                    {/* Verified Credential URL */}
                    <div>
                      <Label htmlFor={`verified-${cred.certificationValue}`} className={fieldLabel}>
                        Verified credential URL
                      </Label>
                      <Input
                        id={`verified-${cred.certificationValue}`}
                        type="url"
                        value={cred.verifiedCredential || ''}
                        onChange={(e) => handleCredentialUpdate(cred.certificationValue, 'verifiedCredential', e.target.value)}
                        placeholder="https://www.credly.com/badges/... or https://learn.microsoft.com/..."
                        className="w-full"
                        required
                      />
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Additional Notes - Single field for all certifications */}
            <div className="border-t border-border pt-6">
              <Label htmlFor="additionalNotes" className={fieldLabel}>
                Additional notes<OptionalTag />
              </Label>
              <Textarea
                id="additionalNotes"
                {...register("additionalNotes")}
                placeholder="Anything else about your certifications"
                className="w-full"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep('selection')}
              >
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-12 rounded-xl px-8 font-semibold">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  `Submit All ${certificationCredentials.length} Certification${certificationCredentials.length > 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  // Render step 3: Individual Certification Credentials
  if (currentStep === 'credentials') {
    const currentCert = certificationCredentials[currentCertIndex];
    if (!currentCert) {
      return null;
    }

    return (
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-6 md:p-10"
        >
          {isEditMode && (
            <div className="mb-6 p-4 bg-muted/50 border border-border rounded-xl">
              <p className="text-sm text-foreground font-medium">
                Edit mode: Only certification details will be updated. Your profile information remains unchanged.
              </p>
            </div>
          )}

          <div className="mb-6">
            {!isEditMode && (
              <div className="text-sm text-muted-foreground mb-2">
                Certification {currentCertIndex + 1} of {certificationCredentials.length}
              </div>
            )}
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-2">
              {isEditMode ? 'Edit Certification' : currentCert.certificationName}
            </h2>
            <div className="space-y-1">
              <p className="text-muted-foreground">
                <span className="font-semibold">Certification:</span> {currentCert.certificationName}
              </p>
              <p className="text-muted-foreground">
                <span className="font-semibold">Exam Code:</span> {currentCert.examCode}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitCredential(handleCredentialSubmit)} className="space-y-6">
            {/* Certification Selection */}
            <div>
              <Label htmlFor="credential-certification" className={fieldLabel}>
                Certification
              </Label>
              <Select
                value={currentCert.certificationValue || ''}
                onValueChange={(value) => {
                  const allCerts = getCertifications();
                  const selectedCert = allCerts.find(c => c.value === value);
                  if (selectedCert) {
                    setCredentialValue("certificationValue", value);
                    // Update the current cert in the credentials array
                    const updatedCreds = [...certificationCredentials];
                    updatedCreds[currentCertIndex] = {
                      ...updatedCreds[currentCertIndex],
                      certificationValue: value,
                      certificationName: selectedCert.label,
                      examCode: selectedCert.code,
                    };
                    setCertificationCredentials(updatedCreds);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a certification" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCertifications
                    .map(certValue => {
                      const allCerts = getCertifications();
                      return allCerts.find(c => c.value === certValue);
                    })
                    .filter(cert => cert !== undefined)
                    .sort((a, b) => {
                      if (!a || !b) return 0;
                      if (sortOrder === 'a-z') {
                        return a.label.localeCompare(b.label);
                      } else if (sortOrder === 'z-a') {
                        return b.label.localeCompare(a.label);
                      }
                      return 0;
                    })
                    .map((cert) => (
                      <SelectItem key={cert!.value} value={cert!.value}>
                        {cert!.label} ({cert!.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Verified Credential URL */}
            <div>
              <Label htmlFor="credential-verifiedCredential" className={fieldLabel}>
                Verified credential URL
              </Label>
              <Input
                id="credential-verifiedCredential"
                type="url"
                defaultValue={currentCert.verifiedCredential || ''}
                {...registerCredential("verifiedCredential", {
                  required: "Verified Credential URL is required",
                  pattern: {
                    value: /^https?:\/\/.+/i,
                    message: "Please enter a valid URL",
                  },
                })}
                placeholder="https://www.credly.com/badges/..."
                className="w-full"
              />
              {credentialErrors.verifiedCredential && (
                <p className="mt-1.5 text-[13px] text-destructive">
                  {credentialErrors.verifiedCredential.message}
                </p>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <Label htmlFor="credential-additionalNotes" className={fieldLabel}>
                Additional notes<OptionalTag />
              </Label>
              <Textarea
                id="credential-additionalNotes"
                defaultValue={currentCert.additionalNotes || ''}
                {...registerCredential("additionalNotes")}
                placeholder="Anything else about this certification"
                className="w-full"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isEditMode) {
                    // In edit mode, go back to manage certifications
                    window.location.href = '/manage-certifications';
                  } else if (currentCertIndex > 0) {
                    setCurrentCertIndex(currentCertIndex - 1);
                    const prevCert = certificationCredentials[currentCertIndex - 1];
                    setCredentialValue('certificationDate', prevCert.certificationDate);
                    setCredentialValue('verifiedCredential', prevCert.verifiedCredential);
                  } else {
                    setCurrentStep('common-info');
                  }
                }}
              >
                {isEditMode ? 'Cancel' : (currentCertIndex > 0 ? 'Previous' : 'Back')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEditMode ? 'Update Certification' : (currentCertIndex < certificationCredentials.length - 1 ? 'Next Certification' : 'Submit All')}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
};
