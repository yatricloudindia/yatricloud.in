import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Briefcase, Zap, LogOut, User, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CertificationForm } from "@/components/certified-yatris/CertificationForm";
import { LoginSignup } from "@/components/certified-yatris/LoginSignup";
import { UserActionChoice } from "@/components/certified-yatris/UserActionChoice";
import { fetchCertifications } from "@/lib/google-sheets";
import ScrollReveal from "@/components/ScrollReveal";
import { SEO } from "@/components/SEO";
import { isAuthenticated, getStoredUser, getCurrentUser, logout as logoutUser, isProfileComplete } from "@/lib/yatris-api";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";

interface CertificationEntry {
  id: string;
  fullName: string;
  certificationProvider: string;
  certificationDate: string;
}

const CertifiedYatris = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  // Default to showing choice when logged in
  const [showChoice, setShowChoice] = useState(true);

  useEffect(() => {
    checkAuthentication();
    loadCertifications();
  }, []);

  const getDestinationUrl = () => {
    const redirectParam = searchParams.get('redirect');
    const accessResourceParam = searchParams.get('accessResource') || (typeof window !== 'undefined' ? sessionStorage.getItem('pending_access_resource_id') : null);
    if (redirectParam || accessResourceParam) {
      let dest = redirectParam || '/';
      if (accessResourceParam && !dest.includes('accessResource=')) {
        dest += (dest.includes('?') ? '&' : '?') + `accessResource=${encodeURIComponent(accessResourceParam)}`;
      }
      return dest;
    }
    return null;
  };

  const checkAuthentication = async () => {
    setCheckingAuth(true);
    try {
      // Fast check with stored user mirror
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }

      // Check live session with Supabase
      const currentUser = await getCurrentUser();
      const activeUser = currentUser || storedUser;

      if (activeUser) {
        setUser(activeUser);
        setIsAuthenticated(true);

        // Handle redirect if coming from resource access or custom redirect
        const dest = getDestinationUrl();
        if (dest) {
          navigate(dest, { replace: true });
          return;
        }

        // Check profile completeness
        if (!isProfileComplete(activeUser)) {
          navigate('/edit-profile?complete=true');
          return;
        }
        
        // Default redirect since Certified Yatris is "coming soon"
        navigate('/', { replace: true });
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadCertifications = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCertifications();
      setCertifications(data);
    } catch (error) {
      console.error("Error loading certifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);

    const dest = getDestinationUrl();
    if (dest) {
      navigate(dest, { replace: true });
      return;
    }

    // Check if profile is complete (Google login users won't have all fields)
    if (!isProfileComplete(userData)) {
      navigate('/edit-profile?complete=true');
      return;
    }

    // Default redirect to home instead of showing choice
    navigate('/', { replace: true });
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setIsAuthenticated(false);
    setShowChoice(false);
  };

  // Show login/signup if not authenticated
  if (!isAuthenticated && !checkingAuth) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <SEO
          title="Certified Yatris · Wall of Cloud Achievers"
          description="Meet the Yatris who passed AWS, Azure, GCP and Kubernetes exams. Real people, real certificates. Add your name to the wall and inspire others."
        />
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <LoginSignup onSuccess={handleLoginSuccess} />
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Getting your spot on the wall ready…</p>
        </div>
      </div>
    );
  }

  // If authenticated and showing choice
  if (isAuthenticated && showChoice) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEO
          title="Certified Yatris · Wall of Cloud Achievers"
          description="Meet the Yatris who passed AWS, Azure, GCP and Kubernetes exams. Real people, real certificates. Add your name to the wall and inspire others."
        />
        <Navbar />
        <div className="pt-20">
          <UserActionChoice
            userFullName={user?.fullName || 'Yatri'}
            onShareAchievement={() => setShowChoice(false)}
          />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Certified Yatris · Wall of Cloud Achievers"
        description="Meet the Yatris who passed AWS, Azure, GCP and Kubernetes exams. Real people, real certificates. Add your name to the wall and inspire others."
      />
      <div className="noise-overlay" />
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 md:pt-40 pb-8 overflow-hidden">
          {/* Background Elements */}

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <ScrollReveal>
              <div className="text-center mb-12">
                <motion.div
                  initial={prefersReducedMotion ? false : { scale: 0, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
                  className="inline-flex items-center justify-center mb-6"
                >
                  <img
                    src="https://raw.githubusercontent.com/yatricloud/yatri-images/refs/heads/main/certification.yatricloud.com/All/yatri-certified.png"
                    alt="Yatri Certified"
                    className="w-auto h-20 md:h-28 object-contain"
                  />
                </motion.div>

                <h1 className="text-4xl md:text-6xl font-bold font-display mb-4">
                  You passed. Now <span className="gradient-text">take a bow</span>.
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                  Add your certification to the Yatri Cloud Wall of Fame, real name,
                  real face, real proof. Inspire the Yatris studying right behind you.
                </p>

                {/* User Info & Logout */}
                {user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-4 mb-6"
                  >
                    <div className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-lg">
                      <User className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{user.fullName}</span>
                      <span className="text-muted-foreground">({user.email})</span>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  </motion.div>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Form Section */}
        <section className="pt-4 pb-12">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CertificationForm user={user} />
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CertifiedYatris;

