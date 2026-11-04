import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";

import { CartProvider, useCart } from "@/contexts/CartContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { usePageTracker } from "@/hooks/usePageTracker";

// Yatri Cloud Resources: the exam-dumps + resources library, split out of
// yatricloud.com. Only these surfaces live here; every other path belongs to
// the main site and is sent there (see MainSiteRedirect).
const Resources = lazy(() => import("./pages/Resources"));
const ExamDumps = lazy(() => import("./pages/ExamDumps"));
const ExamPracticeViewer = lazy(() => import("./pages/ExamPracticeViewer"));
const MyResources = lazy(() => import("./pages/MyResources"));
const SecurePdfViewer = lazy(() => import("./pages/SecurePdfViewer"));
const MyPurchases = lazy(() => import("./pages/MyPurchases"));
const ReceiptView = lazy(() => import("./pages/ReceiptView"));
const CertifiedYatris = lazy(() => import("./pages/CertifiedYatris"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CancellationRefundPolicy = lazy(() => import("./pages/CancellationRefundPolicy"));
const ShippingExchangePolicy = lazy(() => import("./pages/ShippingExchangePolicy"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const AboutUs = lazy(() => import("./pages/AboutUs"));

// Admin console (exam dumps, resources, payments, coupons only).
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminExamDumps = lazy(() => import("./pages/admin/AdminExamDumps"));
const AdminAddExamDump = lazy(() => import("./pages/admin/AdminAddExamDump"));
const AdminEditExamDump = lazy(() => import("./pages/admin/AdminEditExamDump"));
const AdminResources = lazy(() => import("./pages/admin/AdminResources"));
const AdminAddResource = lazy(() => import("./pages/admin/AdminAddResource"));
const AdminEditResource = lazy(() => import("./pages/admin/AdminEditResource"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));

const MAIN_SITE = "https://www.yatricloud.com";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const FloatingCart = lazy(() => import("@/components/store/FloatingCart"));

const FloatingCartGate = () => {
  const { totalItems } = useCart();
  const { pathname } = useLocation();
  if (totalItems === 0 || pathname.startsWith("/examdumps") || pathname.startsWith("/exam-dumps") || pathname.startsWith("/admin")) {
    return null;
  }
  return (
    <Suspense fallback={null}>
      <FloatingCart />
    </Suspense>
  );
};

/** Shown for the instant a lazy route chunk is fetched. */
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div aria-label="Loading page" role="status" className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent motion-reduce:animate-none" />
  </div>
);

/** Any route that isn't part of Resources lives on the main site. */
const MainSiteRedirect = () => {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    window.location.replace(`${MAIN_SITE}${pathname}${search}${hash}`);
  }, [pathname, search, hash]);
  return <PageLoader />;
};

/** Tracks every page navigation automatically, must be inside BrowserRouter. */
const PageTracker = () => { usePageTracker(); return null; };

const App = () => (
  <ThemeProvider defaultTheme="light">
    <SpeedInsights />
    <Analytics />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CurrencyProvider>
          <CartProvider>
            <ConfirmProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <PageTracker />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Resources />} />
                    <Route path="/resources" element={<Navigate to="/" replace />} />
                    <Route path="/resources/view" element={<SecurePdfViewer />} />
                    <Route path="/resources/:provider" element={<Resources />} />

                    <Route path="/examdumps" element={<ExamDumps />} />
                    <Route path="/examdumps/practice/:slug" element={<ExamPracticeViewer />} />
                    <Route path="/examdumps/practice" element={<ExamPracticeViewer />} />
                    <Route path="/examdumps/:provider" element={<ExamDumps />} />
                    <Route path="/exam-dumps" element={<Navigate to="/examdumps" replace />} />
                    <Route path="/exam-dumps/practice/:slug" element={<ExamPracticeViewer />} />
                    <Route path="/exam-dumps/practice" element={<ExamPracticeViewer />} />
                    <Route path="/exam-dumps/:provider" element={<ExamDumps />} />

                    <Route path="/my-resources" element={<MyResources />} />
                    <Route path="/myresources" element={<MyResources />} />
                    <Route path="/profile/my-resources" element={<MyResources />} />
                    <Route path="/my-purchases" element={<MyPurchases />} />
                    <Route path="/mypurchases" element={<MyPurchases />} />
                    <Route path="/profile/purchases" element={<MyPurchases />} />
                    <Route path="/receipt/:invoiceNumber" element={<ReceiptView />} />

                    <Route path="/login" element={<CertifiedYatris />} />
                    <Route path="/signin" element={<CertifiedYatris />} />
                    <Route path="/certifiedyatris" element={<CertifiedYatris />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Legal + contact pages: payment checkout needs these on this domain too */}
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-and-conditions" element={<TermsOfService />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/cancellation-and-refund" element={<CancellationRefundPolicy />} />
                    <Route path="/shipping-and-exchange" element={<ShippingExchangePolicy />} />
                    <Route path="/contact-us" element={<ContactUs />} />
                    <Route path="/contact" element={<ContactUs />} />
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/about-us" element={<AboutUs />} />

                    {/* Admin Routes (AdminDashboard renders its own login gate) */}
                    <Route path="/admin" element={<AdminDashboard />}>
                      <Route index element={<AdminExamDumps />} />
                      <Route path="exam-dumps" element={<AdminExamDumps />} />
                      <Route path="exam-dumps/add" element={<AdminAddExamDump />} />
                      <Route path="exam-dumps/edit/:id" element={<AdminEditExamDump />} />
                      <Route path="resources" element={<AdminResources />} />
                      <Route path="resources/add" element={<AdminAddResource />} />
                      <Route path="resources/edit/:id" element={<AdminEditResource />} />
                      <Route path="payments" element={<AdminPayments />} />
                      <Route path="coupons" element={<AdminCoupons />} />
                    </Route>

                    <Route path="*" element={<MainSiteRedirect />} />
                  </Routes>
                </Suspense>

                <FloatingCartGate />
              </BrowserRouter>
            </ConfirmProvider>
          </CartProvider>
        </CurrencyProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
