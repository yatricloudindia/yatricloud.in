export type ProductCategory = "AWS" | "Azure" | "GCP" | "Oracle" | "Salesforce" | "ServiceNow" | "GitHub";

export interface Product {
  id: string;
  title: string;
  category: ProductCategory;
  originalPrice: number;
  discountedPrice: number;
  discount: number;
  image: string;
  description: string;
  examCode?: string;
  level: "Associate" | "Practitioner" | "Professional" | "Specialty";
}

export const categories: ProductCategory[] = ["AWS", "Azure", "GCP", "Oracle", "Salesforce", "ServiceNow", "GitHub"];
