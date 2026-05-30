export type Locale = "en" | "bs";

export const locales: Locale[] = ["en", "bs"];
export const defaultLocale: Locale = "en";

// ─── Dictionary shape ─────────────────────────────────────────────────────────

export interface Dict {
  nav: {
    forPhotographers: string;
    forCouples: string;
    pricing: string;
    logIn: string;
    startFree: string;
    switchLang: string; // tooltip for language toggle
  };
  common: {
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    loading: string;
    back: string;
    yes: string;
    no: string;
    or: string;
  };
  landing: {
    badgeText: string;
    heroTitle: string;
    heroBody: string;
    ctaPrimary: string;
    ctaSecondary: string;
    heroCaveat: string;
    stats: Array<{ value: string; label: string }>;
    features: Array<{ eyebrow: string; body: string }>;
    howItWorksEyebrow: string;
    howItWorksTitle: string;
    steps: Array<{ n: string; title: string; body: string }>;
    pricingEyebrow: string;
    pricingTitle: string;
    pricingLink: string;
    footerCtaBadge: string;
    footerCtaTitle: string;
    footerCtaBody: string;
    footerCtaPrimary: string;
    footerCtaSecondary: string;
    footerTagline: string;
    footerLinks: Array<{ label: string; href: string }>;
    photographerSpotlightEyebrow: string;
    photographerSpotlightTitle: string;
    photographerSpotlightBody: string;
    faqEyebrow: string;
    faqTitle: string;
    faqBody: string;
    faqCtaPrimary: string;
    faqCtaSecondary: string;
    forPhotographersEyebrow: string;
    forPhotographersTitle: string;
    forCouplesEyebrow: string;
    forCouplesTitle: string;
    forPhotographersCtaPrimary: string;
    forPhotographersCtaSecondary: string;
    forCouplesCtaPrimary: string;
    forCouplesCtaSecondary: string;
    whoForEyebrow: string;
    whoForTitle: string;
    photographerCardBody: string;
    coupleCardBody: string;
    phoneMockupGalleryName: string;
    phoneMockupDate: string;
    phoneMockupMeta: string;
    phoneMockupGuests: string;
    phoneMockupPinProtected: string;
    phoneMockupTabs: string[];
    phoneNotification: string;
    qrScanLabel: string;
  };
  upload: {
    badge: string;
    closed: string;
    closedExpired: string;
    closedArchived: string;
    closedWindowEnded: string;
    closedDisabled: string;
    privacyNote: string;
    chipTypes: string;
    chipMaxSize: string;
    chipNoAccount: string;
    chipPinRequired: string;
    chipOpenUntil: string;
  };
  gallery: {
    privateGallery: string;
    clientGallery: string;
    enterPin: string;
    visibleFiles: string;
    browseCurated: string;
    privateNoAccess: string;
    expired: string;
    archived: string;
  };
  galleryUnlock: {
    pinLabel: string;
    pinPlaceholder: string;
    unlocking: string;
    unlock: string;
  };
  auth: {
    // Login page
    loginEyebrow: string;
    loginTitle: string;
    loginBody: string;
    loginMobileBody: string;
    needAccount: string;
    createHere: string;
    // Signup page
    signupPhotographerEyebrow: string;
    signupCoupleEyebrow: string;
    signupPhotographerTitle: string;
    signupCoupleTitle: string;
    signupPhotographerBody: string;
    signupCoupleBody: string;
    signupPhotographerMobile: string;
    signupCoupleMobile: string;
    alreadyHaveAccess: string;
    logIn: string;
    // Verify page
    verifyEyebrow: string;
    verifyPhotographerTitle: string;
    verifyCoupleTitle: string;
    verifyBody: string;
    verifyNote: string;
    verifyNoteCouple: string;
    wrongEmail: string;
    goBackSignup: string;
    // Forgot password page
    forgotEyebrow: string;
    forgotTitle: string;
    forgotBody: string;
    forgotRemembered: string;
    forgotBackLogin: string;
    // Reset password page
    resetEyebrow: string;
    resetTitle: string;
    resetBody: string;
    resetNeedLink: string;
    resetRequestAnother: string;
    // Form labels
    formWelcomeBack: string;
    formStartWorkspace: string;
    formStartCoupleEvent: string;
    formLoginTitle: string;
    formCreatePhotographerTitle: string;
    formCreateCoupleTitle: string;
    formYourName: string;
    formFullName: string;
    formNamePlaceholderCouple: string;
    formNamePlaceholderPhotographer: string;
    formEmail: string;
    formPassword: string;
    formPasswordPlaceholder: string;
    formForgotPassword: string;
    formLoginBtn: string;
    formCreateAccountBtn: string;
    formCreateCoupleAccountBtn: string;
    formWorking: string;
  };
  dashboard: {
    // Original (kept for back-compat)
    title: string;
    eyebrow: string;
    newEvent: string;
    noEvents: string;
    noEventsBody: string;
    createFirstEvent: string;
    plan: string;
    activeEvents: string;
    liveStorage: string;
    usageTitle: string;
    // Header chrome
    header: {
      profile: string;
      signOut: string;
      admin: string;
      backToDashboard: string;
      backToEvents: string;
    };
    // Setup notice
    setupNotice: {
      title: string;
      body: string;
    };
    // Home page (event list)
    home: {
      title: string;
      eyebrow: string;
      newEvent: string;
      setupTitle: string;
      setupEyebrow: string;
      eventDeleted: string;
      storageUsed: string;
      remaining: string;
      events: string;
      slotsLeft: string;
      plan: string;
      planProDesc: string;
      planSoloDesc: string;
      managePlan: string;
      noEvents: string;
      noEventsBody: string;
      trialActive: string;        // "Free trial — {{n}} day{{s}} remaining"
      trialExpired: string;
      trialActiveBody: string;    // "{{used}} / {{limit}} photos used · …"
      trialExpiredBody: string;
      choosePlan: string;
    };
    // Event detail page
    event: {
      backToEvents: string;
      eventDate: string;
      expires: string;
      guestUploadsUntil: string;
      mediaFiles: string;
      guestUploads: string;
      storageUsed: string;
      downloads: string;
      guestUploadLink: string;
      clientGalleryLink: string;
      privateGalleryLink: string;
      permanentLinksNote: string;
      openGuestPage: string;
      openGuestUploadPage: string;
      openClientGallery: string;
      openPrivateGallery: string;
      eventExpired: string;
      eventExpiredCouple: string;
      coverImageHint: string;
      coverImageHintCouple: string;
      guestQrCode: string;
      qrSharingHint: string;
      uploadProTitle: string;
      uploadYourTitle: string;
      uploadProBody: string;
      uploadYourBody: string;
      savedNotice: string;
      // Danger zone
      dangerZone: string;
      dangerZoneBody: string;
      // Gallery sections
      sectionsTitle: string;
      sectionsTitleCouple: string;
      sectionsBody: string;
      sectionsBodyCouple: string;
      // Gallery manager
      managerTitle: string;
      managerTitleCouple: string;
      managerBody: string;
      managerBodyCouple: string;
      // Activity
      activityTitle: string;
      activityTitleCouple: string;
      activityBody: string;
      activityBodyCouple: string;
      activityEmpty: string;
      activityFallback: string;
      activityLabels: {
        media_hidden: string;
        media_unhidden: string;
        media_soft_deleted: string;
        media_restored: string;
        media_permanently_deleted: string;
        cover_set: string;
        cover_cleared: string;
      };
    };
    // Create event page
    create: {
      titlePhotographer: string;
      titleCouple: string;
      eyebrowPhotographer: string;
      eyebrowCouple: string;
    };
    // Profile page
    profile: {
      titlePhotographer: string;
      titleCouple: string;
      eyebrowPhotographer: string;
      eyebrowCouple: string;
      backToDashboard: string;
      accountDetails: string;
      publicProfileSettings: string;
      accountDetailsBody: string;
      publicProfileBody: string;
      savedNotice: string;
    };
    // QR poster picker
    qrPicker: {
      plainDownload: string;
      plainPreparing: string;
      printableTemplates: string;
      scrollHint: string;
      swipeHint: string;
      downloadError: string;
      networkError: string;
    };
    // Billing page
    billing: {
      title: string;
      eyebrow: string;
      backToDashboard: string;
      paymentReceived: string;
      currentPlan: string;
      planLabelAdmin: string;
      planLabelActive: string;       // "{{plan}} · active"
      planLabelAdminNote: string;    // "Admin · no limits"
      trialActiveLabel: string;      // "Free trial · {{n}} day{{s}} left"
      trialExpired: string;
      freeTrial: string;
      trialPhotosUsed: string;       // "{{used}} / {{limit}} trial photos used"
      upgradeYourPlan: string;
      oneEvent: string;
      oneTime: string;
      onlineCheckoutSetup: string;
    };
  };
  coupleDashboard: {
    // Header
    title: string;
    eyebrow: string;
    manageEventBtn: string;
    // Event card
    eventLabel: string;
    // Status labels
    statusActive: string;
    statusExpired: string;
    statusDraft: string;
    // Quick links
    guestUploadsTitle: string;
    guestUploadsBody: string;
    guestUploadsLink: string;
    galleryTitle: string;
    galleryBody: string;
    galleryLink: string;
    uploadLinkTitle: string;
    uploadLinkBody: string;
    uploadLinkCta: string;
    // Full management panel
    fullManageTitle: string;
    fullManageBody: string;
    fullManageBtn: string;
    // Empty state
    welcomeTitle: string;
    welcomeEyebrow: string;
    emptyTitle: string;
    emptyBody: string;
    createEventBtn: string;
    // Steps
    steps: Array<{ title: string; body: string }>;
    // Trial banner
    trialActive: string;
    trialExpired: string;
    trialPhotosUsed: string;
    trialExpiredBody: string;
    trialChoosePlan: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    body: string;
    features: Array<{ title: string; body: string }>;
  };
  forPhotographers: {
    eyebrow: string;
    title: string;
    body: string;
    workflowEyebrow: string;
    workflowTitle: string;
    workflowBody: string;
    switchTitle: string;
    switchSubtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    workflow: Array<{ title: string; body: string }>;
    replacesEyebrow: string;
    replaces: string[];
    benefitsEyebrow: string;
    pricingEyebrow: string;
    pricingTitle: string;
    pricingBody: string;
  };
  forCouples: {
    eyebrow: string;
    title: string;
    body: string;
    ctaPrimary: string;
    ctaSecondary: string;
    benefitsEyebrow: string;
    highlightsEyebrow: string;
    highlightsTitle: string;
    howItWorksEyebrow: string;
    howItWorks: string[];
  };
  marketing: {
    photographerPlans: Array<{
      name: string;
      yearlyLabel: string;
      monthlyLabel: string;
      savingsLabel: string;
      summary: string;
      ctaLabel: string;
      features: string[];
    }>;
    couplePlan: {
      name: string;
      priceLabel: string;
      summary: string;
      ctaLabel: string;
      trialCtaLabel: string;
      features: string[];
    };
    photographerBenefits: Array<{ title: string; body: string }>;
    coupleBenefits: Array<{ title: string; body: string }>;
    faqs: Array<{ question: string; answer: string }>;
    testimonials: Array<{ quote: string; author: string; role: string }>;
    photographerSwitchReasons: string[];
    couplePlanHighlights: string[];
    trustBadges: Array<{ label: string; sub: string }>;
  };
  pricingUi: {
    monthlyBilling: string;
    yearlyBilling: string;
    save20: string;
    mostPopular: string;
    includes: string;
    oneTimePlan: string;
    oneTimePerfect: string;
    trialNote: string;
  };
  testimonialsUi: {
    sectionEyebrow: string;
    sectionTitle: string;
    badge: string;
  };
  trustStrip: Array<{ title: string; body: string; icon: string }>;
  photographerPlaceholder: string;
  getStarted: {
    eyebrow: string;
    title: string;
    body: string;
    photographerLabel: string;
    photographerTitle: string;
    photographerBody: string;
    photographerPlan: string;
    photographerCta: string;
    eventLabel: string;
    eventTitle: string;
    eventBody: string;
    eventPlan: string;
    eventCta: string;
    alreadyHaveAccount: string;
    logIn: string;
  };
  uploadDropzone: {
    // Step indicator
    stepChoose: string;
    stepReview: string;
    stepSend: string;
    // Choose phase
    chooseTitle: string;
    chooseSubtitle: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    pinPlaceholder: string;
    nameLabel: string;
    emailLabel: string;
    pinLabel: string;
    selectPhotosBtn: string;
    orClickSelect: string;
    // Review phase
    reviewTitle: string;
    sendBtn: string;
    addMoreBtn: string;
    retryBtn: string;
    // Uploading phase
    uploadingTitle: string;
    // Success phase
    successTitle: string;
    successBody: string;
    uploadAnotherBtn: string;
    // Validation errors
    errFilesRequired: string;
    errVideoNotAllowed: string;
    errPinRequired: string;
  };
}

// ─── Loader ───────────────────────────────────────────────────────────────────

import { dict as enDict } from "./en";
import { dict as bsDict } from "./bs";

export function getDictionary(locale: Locale): Dict {
  return locale === "bs" ? bsDict : enDict;
}

/**
 * URL path prefix for the given locale. The default locale (`en`) maps to ""
 * so routes stay at `/dashboard/...`; other locales prefix as `/{locale}`.
 * Use as `${localePrefix(locale)}/dashboard/profile`.
 */
export function localePrefix(locale: Locale): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}

/** Tiny helper — call as t(dict.someKey, { name: "Amina" }) to replace {{name}} */
export function t(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)),
    template,
  );
}
