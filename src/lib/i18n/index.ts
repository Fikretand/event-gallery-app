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
    switchTitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    workflow: Array<{ title: string; body: string }>;
  };
  forCouples: {
    eyebrow: string;
    title: string;
    body: string;
    ctaPrimary: string;
    ctaSecondary: string;
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

/** Tiny helper — call as t(dict.someKey, { name: "Amina" }) to replace {{name}} */
export function t(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)),
    template,
  );
}
