import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  DEFAULT_CURRENCY,
  CurrencyOption,
  getCurrencies,
  getInitialCurrency,
  setPreferredCurrency as persistPreferredCurrency,
  convertFromInr,
  formatMoney,
  findCurrency,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: CurrencyOption;
  currencies: CurrencyOption[];
  isLoading: boolean;
  setCurrency: (currencyOrCode: CurrencyOption | string) => void;
  formatInr: (inrAmount: number) => string;
  convertInr: (inrAmount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyOption>(DEFAULT_CURRENCY);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([DEFAULT_CURRENCY]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getCurrencies(), getInitialCurrency()])
      .then(([allCurrencies, initial]) => {
        if (active) {
          setCurrencies(allCurrencies);
          setCurrencyState(initial);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const setCurrency = useCallback((currencyOrCode: CurrencyOption | string) => {
    if (typeof currencyOrCode === "string") {
      setCurrencies((currList) => {
        const found = findCurrency(currList, currencyOrCode);
        setCurrencyState(found);
        persistPreferredCurrency(found.code);
        return currList;
      });
    } else {
      setCurrencyState(currencyOrCode);
      persistPreferredCurrency(currencyOrCode.code);
    }
  }, []);

  const formatInr = useCallback((inrAmount: number) => {
    const converted = convertFromInr(inrAmount, currency);
    return formatMoney(converted, currency);
  }, [currency]);

  const convertInr = useCallback((inrAmount: number) => {
    return convertFromInr(inrAmount, currency);
  }, [currency]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencies,
        isLoading,
        setCurrency,
        formatInr,
        convertInr,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
