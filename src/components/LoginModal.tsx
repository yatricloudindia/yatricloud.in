import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginSignup } from "@/components/certified-yatris/LoginSignup";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: any) => void;
    title?: string;
    description?: string;
    initialUser?: any;
    forceOnboarding?: boolean;
}

export const LoginModal = ({
    isOpen,
    onClose,
    onSuccess,
    initialUser,
    forceOnboarding
}: LoginModalProps) => {
    const handleSuccess = (user: any) => {
        onSuccess(user);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && forceOnboarding) return;
            onClose();
        }}>
            <DialogContent
                onPointerDownOutside={(e) => {
                    if (forceOnboarding) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    if (forceOnboarding) e.preventDefault();
                }}
                className="max-w-2xl sm:max-w-3xl p-0 bg-transparent border-none shadow-none focus:outline-none [&>button]:hidden"
            >
                <LoginSignup
                    onSuccess={handleSuccess}
                    initialUser={initialUser}
                    forceOnboarding={forceOnboarding}
                    onClose={onClose}
                />
            </DialogContent>
        </Dialog>
    );
};
