import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { loginAdmin } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

interface AdminLoginProps {
    onLogin: (token: string) => void;
}

const AdminLogin = ({ onLogin }: AdminLoginProps) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await loginAdmin(email, password);
            if (result.success && result.token) {
                toast({
                    title: "Access Granted",
                    description: "Welcome to the Admin Dashboard",
                });
                onLogin(result.token);
            } else {
                toast({
                    title: "Access Denied",
                    description: result.error || "Invalid credentials",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong. Please check your connection.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background px-4 py-10">
            <Card className="w-full max-w-md border border-border rounded-2xl shadow-elevated">
                <CardHeader className="space-y-3 pt-8">
                    <div className="flex justify-center mb-1">
                        <img
                            src="/logo-192.png"
                            alt="Yatri Cloud Logo"
                            className="w-12 h-12 object-contain"
                        />
                    </div>
                    <CardTitle className="font-display text-2xl md:text-3xl font-bold tracking-tight text-center">Admin Login</CardTitle>
                    <CardDescription className="text-center text-muted-foreground">
                        Enter your credentials to access the admin dashboard
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-5 pt-2">
                        <div>
                            <Label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11 rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>
                        <div>
                            <Label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11 rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="pb-8">
                        <Button
                            className="w-full min-h-[44px] px-6 font-semibold rounded-xl bg-primary text-primary-foreground shadow-inset-btn hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-ring"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Login"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default AdminLogin;
