# Yatri Cloud Resources

Practice exams and the study-resources library for Yatri Cloud, served at
https://yatricloud.in. Split out of yatricloud.com so the main
site stays focused (and AdSense-eligible).

- Vite + React + TypeScript on its own Supabase project `hiwqpaknodvcegavmcuj` (ap-south-1, RLS-secured).
- Admin console for practice exams, resources, payments and coupons lives at /admin on this site.
- Emails go out from info@yatricloud.com (Zoho SMTP) and payments use the same Razorpay account as yatricloud.com.
- Any route not owned by this site redirects to https://www.yatricloud.com.
- No AdSense code or ads.txt on this domain, on purpose.

## Develop
    npm ci
    # create .env with the vars below
    npm run dev

## Env vars (Vercel)
Supabase values from the yatricloud.in project; Razorpay, Google client ID and EMAIL_* same as yatricloud.com:
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_USE_SUPABASE,
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_GOOGLE_CLIENT_ID,
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, VITE_RAZORPAY_KEY_ID, RAZORPAY_ROUTE_ENABLED,
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, EMAIL_FROM_NAME
