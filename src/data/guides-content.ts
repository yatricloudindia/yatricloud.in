export const ADMIN_GUIDE_CONTENT = `
# Yatri Cloud: The Definitive Operations Manual

## 1. Platform Architecture & Strategy
Yatri Cloud is an enterprise-grade community and learning management system (CLMS) designed to bridge the gap between education and industry certification. 
- **Core Engine**: A hybrid architecture using Google Sheets as a synchronized database, Vercel for high-performance hosting, and a secure proxy layer for API security.
- **Mission**: Orchestrating the "Yatri" (Learner) journey from first gathering to verified cloud expert.

## 2. The Event Ecosystem (Lifecycle)
Efficient event management is the heartbeat of the platform. Admins manage the full lifecycle:
- **Phase 1: Incubation (Draft)**: Identifying the theme and logistics. Posters should be optimized for 16:9 for consistent branding.
- **Phase 2: Live Registration**: 
  - **Dynamic Ticketing**: Configure multiple tiers (Early Bird, Standard, VIP). 
  - **Inventory Control**: Real-time tracking of registration limits.
- **Phase 3: Execution (Live)**: Managing joining links for virtual sessions (Zoom/Google Meet) and venue maps for in-person workshops.
- **Phase 4: Archival (Past Events)**:
  - **Gallery Automation**: Uploading highlight albums to engage the community post-event.
  - **Metrics**: Access registries to track engagement across domains.

## 3. Academia & Training Infrastructure
The Training Hub is designed for scalability and knowledge preservation.
- **Curriculum Architecture**: Hierarchy based on **Modules** (Logical units) and **Lessons** (Specific concepts).
- **Interactive Lessons**: Support for 4K Video embed (YouTube/Vimeo), professional Markdown documentation, and dedicated resource downloads.
- **Validation Engine**: Integrating **Module Quizzes** with auto-grading allows for a "Mastery-based" learning flow.
- **Dynamic Certification**: Only learners who achieve 100% progress and pass all validation checks can retrieve their platform-signed credentials.

## 4. Community Pipeline (Submissions)
Decentralized community growth is managed through three primary submission pipelines:
- **Speaker Proposals**: Quality control for session content and instructor expertise.
- **Venue Partners**: Vetting local hosts for in-person workshops.
- **Sponsorships**: Managing enterprise partnerships and resource allocations.

## 5. Merchant & External API Services
- **Udemy Gateway**: Synchronizing practice sets and managing large-scale voucher distributions via instructor webhooks.
- **Yatri Store**: Full control over inventory for Cloud Vouchers, Certification exams, and exclusive Community Swag.
- **Payment Processing**: Integrated Razorpay reconciliation for secure, transparent transactions.

## 6. Intelligence & Governance
- **Yatri AI Control**: Configuring the Ollama-driven prompts that power the platform's intelligent assistants.
- **Identity Trust**: Verifying "Yatri Star" credentials and social media identities (LinkedIn/GitHub) to ensure platform integrity.

---
**Need help finding a specific URL?** Check our definitive [Sitemap & Access Guide](/admin/sitemap).
`;

export const USER_GUIDE_CONTENT = `
# Yatri Cloud: The Professional Growth Guide

## 1. Your Verified Professional Identity
Yatri Cloud isn't just a learning portal, it's a digital portfolio.
- **The "Yatri Star" Program**: Complete your profile with **LinkedIn** and **GitHub** links to gain the verification badge. Verified accounts rank higher in the Global Wall of Fame.
- **Identity Assets**: Your uploaded profile photo is automatically synced with your earned certificates to ensure high-fidelity credentialing.

## 2. The Learning Journey (Academia)
Mastering cloud technologies through structured, high-stakes training.
- **The Interactive Dashboard**: A triple-pane interface for a distraction-free learning experience (Video, Docs, and Navigation).
- **Progressive Tracking**: Real-time completion percentages across all modules.
- **Knowledge Validation**: Quizzes at the end of each module to test your mastery before certification.
- **Certification Wall**: All earned badges from AWS, Azure, and Google Cloud are showcased alongside your Yatri Cloud progress.

## 3. Community Engagement & Leadership
Transition from a Learner to a Leader.
- **Event Participation**: Direct access to high-impact workshops, meetups, and joining information.
- **Leaderboards**: Track your standing against other "Yatris" in the community through domain-specific filters.
- **Contribute**: Submit proposals to Speak, Host (Venue), or Sponsor events to build your industry authority.

## 4. Store, Vouchers & Rewards
- **Cloud Vouchers**: Access exclusive discounts for Udemy Practice Exams.
- **Store Rewards**: Redeem community points or purchase official certifications and merchandise.

---
**Lost on the Platform?** Use our [URL Sitemap Guide](/profile/sitemap) to find exactly what you need.
`;

export const ADMIN_URL_SITE_MAP = `
# Yatri Cloud: Administrative Sitemap & Operations Guide

This guide provides a comprehensive map of the platform's internal operational infrastructure. Use this to navigate management command centers, moderation queues, and system governance tools.

## 1. System Command Centers
Core locations for platform-wide monitoring and resource allocation.
- **/admin**: The primary dashboard. High-level performance metrics and event status.
- **/admin/events**: Full-lifecycle event management (Draft to Archive).
- **/admin/training**: Academic administration hub for managing courses, modules, and quizzes.
- **/admin/attendees**: Master registry of all event participants and community members.
- **/admin/enrollments**: Global monitoring of student progress and certification achievement.

## 2. Moderation & Partnerships
Review pipelines for community growth and enterprise relations.
- **/admin/submissions**: Moderation queue for incoming proposals (Speakers, Venues, Sponsors).
- **/admin/udemy**: Gateway for synchronizing external practice sets and voucher distributions.
- **/admin/trainers**: Hub for managing verified instructor applications and permissions.
- **/admin/providers**: Configuration for external payment gateways and cloud infrastructure partners.

## 3. Governance & Automation
Infrastructure settings and intelligent platform layers.
- **/admin/ai**: Management for platform-wide AI prompts and automation settings.
- **/admin/products/add**: Inventory management for the Yatri Store.
- **/admin/guide**: The Definitive Operations Manual for system administrators.

---
**Looking for the Learner Sitemap?** You can view the [User Sitemap Guide](/profile/sitemap) to see the platform from the student's perspective.
`;

export const USER_URL_SITE_MAP = `
# Yatri Cloud: User Sitemap & Access Guide

This guide is your definitive reference for navigating the learner-facing side of the Yatri Cloud ecosystem. Use this to find your training materials, certification records, and community event hubs.

## 1. Professional Identity & Profile
Maintain your "Yatri Star" verification and manage your digital certifications.
- **/edit-profile**: Your digital identity. Complete your social profile (LinkedIn/GitHub) to gain the verification badge.
- **/manage-certifications**: The Wall of Badges. Upload and verify your external industry certifications for community recognition.
- **/achievements**: A visual record of your learning milestones and platform contributions.

## 2. Academia & Learning Hub
Primary locations for structured training and certification exam prep.
- **/training**: The course catalog. Browse vendor-neutral cloud certification training (AWS, Azure, Google Cloud).
- **/my-trainings**: Your personal classroom. Resume lessons, track progress (%), and download earned certificates.
- **/yatristore**: Marketplace for Cloud Vouchers, official merchandise, and community swag.

## 3. Community Engagement
Explore upcoming sessions and interact with the global learner network.
- **/**: Platform landing page. Best for discovering trending cloud courses and latest meetups.
- **/events**: The community calendar. View both active registrations and historical galleries.
- **/certifiedyatris**: The Global Wall of Fame. See where you rank on the community leaderboard.
- **/profile/guide**: The comprehensive onboarding handbook for new learners.

## 4. Community Contribution Tools
Specialized hooks for active community members and instructors.
- **/creator**: Onboarding for aspiring trainers looking to contribute to the Academy.
- **/feedback**: Our improvement portal. Share your thoughts on platform features.
- **/reviews**: See what other Yatris are saying about our training programs.
`;
