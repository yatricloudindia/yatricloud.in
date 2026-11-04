import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

/** Accept either a plain string (used as the description) or a full options object. */
export type ConfirmInput = string | ConfirmOptions;

interface ConfirmContextType {
  showConfirm: (options: ConfirmInput) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmOptions>({});
  const [resolveFn, setResolveFn] = useState<(value: boolean) => void>(() => () => {});

  const showConfirm = (options: ConfirmInput): Promise<boolean> => {
    const opts: ConfirmOptions = typeof options === 'string' ? { description: options } : options;
    setConfig(opts);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolveFn(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    resolveFn(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolveFn(false);
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={(open) => {
          if (!open) {
              handleCancel();
          }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{config.title || "Are you sure?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {config.description || "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
                <Button variant="outline" onClick={handleCancel}>
                    {config.cancelText || "No"}
                </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
                <Button variant="destructive" onClick={handleConfirm}>
                    {config.confirmText || "Yes"}
                </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};
