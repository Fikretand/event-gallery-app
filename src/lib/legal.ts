// Legal content — Privacy Policy + Terms of Service, EN + BS.
//
// ⚠ DRAFT / TEMPLATE. This is a starting point, NOT legal advice. Before going
// live: (1) have it reviewed by a qualified lawyer for your jurisdiction, and
// (2) fill in every [BRACKETED] placeholder (legal entity, address, contact
// email, governing law). The <LegalDocView> renders a visible draft notice at
// the top — delete `draftNotice` from each doc once finalized.

import type { Locale } from "@/lib/i18n/index";

export type LegalKind = "privacy" | "terms";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  kind: LegalKind;
  title: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
  draftNotice: string;
  otherLabel: string; // link label to the sibling document
}

// ── Shared placeholders — fill these before publishing ──────────────────────
const COMPANY = "[Naziv pravnog subjekta / Legal entity name]";
const ADDRESS = "[Adresa / Registered address]";
const EMAIL = "[kontakt@confetti.app]";
const LAW = "[Bosna i Hercegovina / your governing law]";
const APP = "Confetti";
const DOMAIN = "event-gallery-app-rho.vercel.app";
const UPDATED = "20.07.2026.";

// ═══════════════════════════════════════════════════════════════════════════
// ENGLISH
// ═══════════════════════════════════════════════════════════════════════════
const EN_PRIVACY: LegalDoc = {
  kind: "privacy",
  title: "Privacy Policy",
  updated: `Last updated: ${UPDATED}`,
  otherLabel: "Terms of Service",
  draftNotice:
    "DRAFT — this policy is a template and is not legal advice. Have it reviewed by a lawyer and replace every [bracketed] placeholder before publishing.",
  intro: [
    `This Privacy Policy explains how ${COMPANY} (“${APP}”, “we”, “us”) collects, uses and protects personal data when you use ${APP} at ${DOMAIN} and related services (the “Service”).`,
    `We act as the data controller for account and billing data. For photos and videos uploaded to a private event gallery, the event owner (the photographer or event host who created the event) is the controller of that content, and we process it on their behalf as a processor.`,
  ],
  sections: [
    {
      heading: "1. Data we collect",
      bullets: [
        "Account data: name, email address, a hashed password, and — for photographers — optional profile details you choose to add (city, phone, website, social links, short bio, avatar image) and your dashboard language preference.",
        "Event data: event titles, dates, client/couple names, gallery and upload settings, and PINs (stored only as hashes).",
        "Uploaded media: photos and videos uploaded by you or by your guests, plus optional guest name/email and technical metadata (file type/size, timestamps, a hashed IP for rate-limiting and abuse prevention).",
        "Billing data: your plan and subscription status, and the email used at checkout. Payments are processed by our payment provider (Payhip) — we do not receive or store your full card details.",
        "Technical data: essential cookies (login/session and language preference) and standard server logs.",
      ],
    },
    {
      heading: "2. How we use data",
      bullets: [
        "To provide the Service: create events, generate guest-upload links and QR codes, host galleries, and deliver media to authorised viewers.",
        "To enable moderation and delivery by the event owner (hiding, deleting, restoring, organising and downloading media).",
        "To operate billing, plan limits and trial logic.",
        "For security, abuse prevention, rate-limiting and troubleshooting.",
        "To communicate with you about your account and, where you have opted in, the optional homepage photographer spotlight.",
      ],
    },
    {
      heading: "3. Legal bases (GDPR)",
      paragraphs: [
        "Where the GDPR applies, we rely on: performance of a contract (providing the Service to account holders); our legitimate interests (security, service improvement, preventing abuse); consent (guest uploads, and appearing in the photographer spotlight — which you can withdraw at any time); and compliance with legal obligations.",
      ],
    },
    {
      heading: "4. Guest uploads and the event owner",
      paragraphs: [
        "When a guest scans a QR code and uploads media, that media is added to the event owner’s private gallery. The event owner decides who can view the gallery, what stays visible, and when it is deleted. Guests should only upload content they have the right to share, and should not upload content of others without their agreement. If you are an event owner, you are responsible for having a lawful basis to collect and share guest content and for honouring requests from people who appear in it.",
      ],
    },
    {
      heading: "5. Sharing and processors",
      paragraphs: [
        "We do not sell your personal data. We share data only with service providers who help us run the Service, under appropriate agreements:",
      ],
      bullets: [
        "Supabase — authentication and database hosting.",
        "Cloudflare R2 — object storage for media.",
        "Vercel — application hosting and delivery.",
        "Payhip — payment processing.",
        "An email delivery provider — transactional emails.",
        "These providers may process data outside your country, including outside the EU/EEA, under safeguards such as standard contractual clauses where required.",
      ],
    },
    {
      heading: "6. Retention",
      bullets: [
        "One-time (couple) plan: guest uploads open for 30 days from the event date; private gallery access for up to 90 days from the event date.",
        "Deleted media is soft-deleted and recoverable for 7 days, then permanently removed from storage.",
        "Account data is kept while your account is active and deleted (or anonymised) on request or after account closure, subject to any legal retention obligations.",
      ],
    },
    {
      heading: "7. Your rights",
      paragraphs: [
        `Subject to applicable law, you may request access to, correction or deletion of your personal data, restriction of or objection to processing, and data portability, and you may withdraw consent at any time. To exercise these rights, contact us at ${EMAIL}. You also have the right to lodge a complaint with your data protection authority. For content inside a private gallery, please also contact the event owner, who controls that content.`,
      ],
    },
    {
      heading: "8. Security",
      paragraphs: [
        "We use encryption in transit (HTTPS), PIN protection for galleries and uploads, access controls, and rate-limiting. No method of transmission or storage is completely secure, so we cannot guarantee absolute security, but we work to protect your data and to review our safeguards over time.",
      ],
    },
    {
      heading: "9. Children",
      paragraphs: [
        "The Service is intended for adults creating and managing events. Event galleries may contain images of children captured at events; the event owner is responsible for having the right to collect and share such images. We do not knowingly create accounts for individuals under the age required by local law.",
      ],
    },
    {
      heading: "10. Cookies",
      paragraphs: [
        "We use essential cookies needed to keep you logged in and to remember your language preference. We do not use these for advertising. If we later add analytics or non-essential cookies, we will update this policy and, where required, ask for consent.",
      ],
    },
    {
      heading: "11. Changes",
      paragraphs: [
        "We may update this policy from time to time. Material changes will be reflected by an updated date at the top of this page and, where appropriate, communicated to account holders.",
      ],
    },
    {
      heading: "12. Contact",
      paragraphs: [`${COMPANY}, ${ADDRESS}. Email: ${EMAIL}.`],
    },
  ],
};

const EN_TERMS: LegalDoc = {
  kind: "terms",
  title: "Terms of Service",
  updated: `Last updated: ${UPDATED}`,
  otherLabel: "Privacy Policy",
  draftNotice:
    "DRAFT — these terms are a template and are not legal advice. Have them reviewed by a lawyer and replace every [bracketed] placeholder before publishing.",
  intro: [
    `These Terms of Service (“Terms”) govern your use of ${APP}, provided by ${COMPANY}, at ${DOMAIN} and related services (the “Service”). By creating an account or using the Service, you agree to these Terms.`,
  ],
  sections: [
    {
      heading: "1. Accounts and eligibility",
      paragraphs: [
        "You must be able to form a binding contract to use the Service and are responsible for the accuracy of your account details and for keeping your credentials secure. You are responsible for activity under your account.",
      ],
    },
    {
      heading: "2. Plans, billing and refunds",
      bullets: [
        "The Service offers a one-time plan for a single event and subscription plans for photographers, with the limits described at checkout and on the pricing page.",
        "Payments are handled by Payhip. Subscriptions renew for the stated period until cancelled; cancellation stops future renewals and takes effect at the end of the paid period.",
        "Except where required by law, one-time purchases and elapsed subscription periods are non-refundable. Statutory rights (including EU withdrawal rights, where applicable) are unaffected.",
      ],
    },
    {
      heading: "3. Acceptable use",
      paragraphs: ["You agree not to use the Service to:"],
      bullets: [
        "upload or share unlawful, infringing, harmful or non-consensual content;",
        "upload content you do not have the right to share, or that violates the privacy or rights of others;",
        "attempt to breach security, abuse rate limits, or disrupt the Service;",
        "resell or misuse the Service outside its intended purpose.",
      ],
    },
    {
      heading: "4. Your content and licence",
      paragraphs: [
        "You (and your guests) keep all rights in the photos, videos and other content you upload. To operate the Service, you grant us a limited, non-exclusive licence to host, store, process, resize and display that content solely to provide the Service to you and your authorised viewers. As an event owner, you are responsible for the content in your galleries, including guest uploads, and for having a lawful basis to collect, store and share it.",
      ],
    },
    {
      heading: "5. Moderation and removal",
      paragraphs: [
        "Event owners can hide, delete and restore media in their galleries. We may also remove content or suspend accounts that we reasonably believe violate these Terms or applicable law, or in response to a valid legal request.",
      ],
    },
    {
      heading: "6. Plan limits and availability",
      paragraphs: [
        "Storage, active-event counts, upload windows and gallery-access windows are limited by your plan. The Service is provided on an “as is” and “as available” basis; as an evolving product it may change, and we do not guarantee uninterrupted or error-free operation. Keep your own copies of important media.",
      ],
    },
    {
      heading: "7. Intellectual property",
      paragraphs: [
        `The ${APP} name, branding, software and design are owned by ${COMPANY} and protected by law. These Terms do not grant you any rights to our trademarks or software beyond using the Service as intended.`,
      ],
    },
    {
      heading: "8. Third-party services",
      paragraphs: [
        "The Service relies on third parties (including payment, hosting and storage providers). Your use may also be subject to their terms, and we are not responsible for their services.",
      ],
    },
    {
      heading: "9. Disclaimers and limitation of liability",
      paragraphs: [
        "To the maximum extent permitted by law, we exclude implied warranties and are not liable for indirect, incidental or consequential damages, or for loss of data or content. Nothing in these Terms limits liability that cannot be limited by law, including your statutory consumer rights.",
      ],
    },
    {
      heading: "10. Indemnity",
      paragraphs: [
        "You agree to indemnify us against claims arising from content you or your guests upload, your breach of these Terms, or your violation of law or of the rights of others.",
      ],
    },
    {
      heading: "11. Termination",
      paragraphs: [
        "You may stop using the Service and close your account at any time. We may suspend or terminate access for breach of these Terms or where required by law. Some provisions survive termination, including content licences necessary to complete deletion, IP, disclaimers and limitations of liability.",
      ],
    },
    {
      heading: "12. Governing law",
      paragraphs: [
        `These Terms are governed by the laws of ${LAW}, and disputes are subject to the competent courts there, without prejudice to any mandatory consumer-protection rights in your country of residence.`,
      ],
    },
    {
      heading: "13. Changes and contact",
      paragraphs: [
        `We may update these Terms; material changes will be reflected by the updated date above. Questions: ${COMPANY}, ${ADDRESS}, ${EMAIL}.`,
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// BOSANSKI
// ═══════════════════════════════════════════════════════════════════════════
const BS_PRIVACY: LegalDoc = {
  kind: "privacy",
  title: "Politika privatnosti",
  updated: `Zadnje ažurirano: ${UPDATED}`,
  otherLabel: "Uslovi korištenja",
  draftNotice:
    "NACRT — ova politika je predložak i nije pravni savjet. Neka je pregleda pravnik i zamijeni svaki [placeholder u zagradama] prije objave.",
  intro: [
    `Ova Politika privatnosti objašnjava kako ${COMPANY} („${APP}“, „mi“, „nas“) prikuplja, koristi i štiti lične podatke kada koristite ${APP} na ${DOMAIN} i povezane usluge („Usluga“).`,
    `Za podatke o nalogu i naplati mi smo voditelj obrade. Za fotografije i videe učitane u privatnu galeriju događaja, vlasnik događaja (fotograf ili organizator koji je kreirao događaj) je voditelj obrade tog sadržaja, a mi ga obrađujemo u njegovo ime kao izvršitelj obrade.`,
  ],
  sections: [
    {
      heading: "1. Podaci koje prikupljamo",
      bullets: [
        "Podaci o nalogu: ime, email adresa, hešovana lozinka i — za fotografe — opcioni podaci profila koje sami dodate (grad, telefon, web, društvene mreže, kratka biografija, avatar) te jezička preferenca dashboarda.",
        "Podaci o događaju: nazivi događaja, datumi, imena klijenta/para, postavke galerije i prijenosa, te PIN-ovi (pohranjeni samo kao heševi).",
        "Učitani mediji: fotografije i videi koje učitate vi ili vaši gosti, uz opciono ime/email gosta i tehničke metapodatke (tip/veličina fajla, vremenske oznake, hešovana IP adresa za ograničavanje i sprječavanje zloupotrebe).",
        "Podaci o naplati: vaš plan i status pretplate te email korišten pri kupovini. Plaćanja obrađuje naš platni provajder (Payhip) — mi ne primamo niti pohranjujemo pune podatke vaše kartice.",
        "Tehnički podaci: neophodni kolačići (prijava/sesija i jezička preferenca) i standardni serverski zapisi.",
      ],
    },
    {
      heading: "2. Kako koristimo podatke",
      bullets: [
        "Za pružanje Usluge: kreiranje događaja, generisanje linkova i QR kodova za prijenos gostiju, hosting galerija i isporuka medija ovlaštenim posjetiocima.",
        "Za moderaciju i isporuku od strane vlasnika događaja (skrivanje, brisanje, vraćanje, organizaciju i preuzimanje medija).",
        "Za naplatu, ograničenja plana i logiku probnog perioda.",
        "Za sigurnost, sprječavanje zloupotrebe, ograničavanje zahtjeva i rješavanje problema.",
        "Za komunikaciju o vašem nalogu i, ako ste to izabrali, opcioni izlog fotografa na naslovnoj stranici.",
      ],
    },
    {
      heading: "3. Pravni osnovi (GDPR)",
      paragraphs: [
        "Gdje se primjenjuje GDPR, oslanjamo se na: izvršenje ugovora (pružanje Usluge korisnicima naloga); naše legitimne interese (sigurnost, unapređenje usluge, sprječavanje zloupotrebe); privolu (prijenosi gostiju i pojavljivanje u izlogu fotografa — koju možete povući u bilo kojem trenutku); te ispunjenje zakonskih obaveza.",
      ],
    },
    {
      heading: "4. Prijenosi gostiju i vlasnik događaja",
      paragraphs: [
        "Kada gost skenira QR kod i učita medije, ti mediji se dodaju u privatnu galeriju vlasnika događaja. Vlasnik događaja odlučuje ko može vidjeti galeriju, šta ostaje vidljivo i kada se briše. Gosti trebaju učitavati samo sadržaj koji imaju pravo dijeliti i ne bi trebali učitavati sadržaj drugih bez njihove saglasnosti. Ako ste vlasnik događaja, odgovorni ste za zakoniti osnov prikupljanja i dijeljenja sadržaja gostiju te za poštovanje zahtjeva osoba koje se na njemu pojavljuju.",
      ],
    },
    {
      heading: "5. Dijeljenje i izvršitelji obrade",
      paragraphs: [
        "Ne prodajemo vaše lične podatke. Podatke dijelimo samo sa provajderima usluga koji nam pomažu u radu Usluge, uz odgovarajuće ugovore:",
      ],
      bullets: [
        "Supabase — autentikacija i hosting baze podataka.",
        "Cloudflare R2 — pohrana medija.",
        "Vercel — hosting i isporuka aplikacije.",
        "Payhip — obrada plaćanja.",
        "Provajder za slanje emailova — transakcijski emailovi.",
        "Ovi provajderi mogu obrađivati podatke izvan vaše zemlje, uključujući izvan EU/EEA, uz zaštitne mjere poput standardnih ugovornih klauzula gdje je to potrebno.",
      ],
    },
    {
      heading: "6. Čuvanje podataka",
      bullets: [
        "Jednokratni plan (par): prijenos gostiju otvoren 30 dana od datuma događaja; pristup privatnoj galeriji do 90 dana od datuma događaja.",
        "Obrisani mediji se meko brišu i mogu se vratiti 7 dana, a zatim se trajno uklanjaju iz pohrane.",
        "Podaci o nalogu čuvaju se dok je nalog aktivan i brišu se (ili anonimiziraju) na zahtjev ili nakon zatvaranja naloga, uz eventualne zakonske obaveze čuvanja.",
      ],
    },
    {
      heading: "7. Vaša prava",
      paragraphs: [
        `U skladu s primjenjivim propisima, možete zatražiti pristup, ispravku ili brisanje vaših ličnih podataka, ograničenje ili prigovor na obradu te prenosivost podataka, i možete povući privolu u bilo kojem trenutku. Za ostvarivanje ovih prava kontaktirajte nas na ${EMAIL}. Imate i pravo podnijeti pritužbu nadležnom tijelu za zaštitu podataka. Za sadržaj unutar privatne galerije obratite se i vlasniku događaja koji upravlja tim sadržajem.`,
      ],
    },
    {
      heading: "8. Sigurnost",
      paragraphs: [
        "Koristimo enkripciju u prijenosu (HTTPS), PIN zaštitu galerija i prijenosa, kontrole pristupa i ograničavanje zahtjeva. Nijedan metod prijenosa ili pohrane nije potpuno siguran, pa ne možemo garantovati apsolutnu sigurnost, ali radimo na zaštiti vaših podataka i povremenom pregledu naših mjera.",
      ],
    },
    {
      heading: "9. Djeca",
      paragraphs: [
        "Usluga je namijenjena odraslima koji kreiraju i upravljaju događajima. Galerije mogu sadržavati slike djece snimljene na događajima; vlasnik događaja je odgovoran za pravo prikupljanja i dijeljenja takvih slika. Svjesno ne kreiramo naloge za osobe ispod dobi propisane lokalnim zakonom.",
      ],
    },
    {
      heading: "10. Kolačići",
      paragraphs: [
        "Koristimo neophodne kolačiće potrebne da ostanete prijavljeni i da zapamtimo vašu jezičku preferencu. Ne koristimo ih za oglašavanje. Ako kasnije dodamo analitiku ili neobavezne kolačiće, ažuriraćemo ovu politiku i, gdje je potrebno, zatražiti privolu.",
      ],
    },
    {
      heading: "11. Izmjene",
      paragraphs: [
        "Ovu politiku možemo povremeno ažurirati. Značajne izmjene biće označene ažuriranim datumom na vrhu ove stranice i, gdje je prikladno, saopštene korisnicima naloga.",
      ],
    },
    {
      heading: "12. Kontakt",
      paragraphs: [`${COMPANY}, ${ADDRESS}. Email: ${EMAIL}.`],
    },
  ],
};

const BS_TERMS: LegalDoc = {
  kind: "terms",
  title: "Uslovi korištenja",
  updated: `Zadnje ažurirano: ${UPDATED}`,
  otherLabel: "Politika privatnosti",
  draftNotice:
    "NACRT — ovi uslovi su predložak i nisu pravni savjet. Neka ih pregleda pravnik i zamijeni svaki [placeholder u zagradama] prije objave.",
  intro: [
    `Ovi Uslovi korištenja („Uslovi“) uređuju vaše korištenje ${APP}, koji pruža ${COMPANY}, na ${DOMAIN} i povezanim uslugama („Usluga“). Kreiranjem naloga ili korištenjem Usluge prihvatate ove Uslove.`,
  ],
  sections: [
    {
      heading: "1. Nalozi i uslovi korištenja",
      paragraphs: [
        "Morate biti sposobni sklopiti obavezujući ugovor da biste koristili Uslugu i odgovorni ste za tačnost podataka naloga te za sigurnost svojih pristupnih podataka. Odgovorni ste za aktivnosti na svom nalogu.",
      ],
    },
    {
      heading: "2. Planovi, naplata i povrati",
      bullets: [
        "Usluga nudi jednokratni plan za jedan događaj i pretplatničke planove za fotografe, s ograničenjima opisanim pri kupovini i na stranici cijena.",
        "Plaćanja obrađuje Payhip. Pretplate se obnavljaju za navedeni period dok se ne otkažu; otkazivanje zaustavlja buduća obnavljanja i stupa na snagu na kraju plaćenog perioda.",
        "Osim gdje zakon nalaže drugačije, jednokratne kupovine i protekli pretplatni periodi se ne vraćaju. Zakonska prava (uključujući EU pravo na odustanak, gdje je primjenjivo) ostaju netaknuta.",
      ],
    },
    {
      heading: "3. Prihvatljivo korištenje",
      paragraphs: ["Saglasni ste da Uslugu nećete koristiti za:"],
      bullets: [
        "učitavanje ili dijeljenje nezakonitog, povređujućeg, štetnog ili nekonsenzualnog sadržaja;",
        "učitavanje sadržaja koji nemate pravo dijeliti ili koji krši privatnost ili prava drugih;",
        "pokušaje narušavanja sigurnosti, zloupotrebu ograničenja ili ometanje Usluge;",
        "preprodaju ili zloupotrebu Usluge izvan njene namjene.",
      ],
    },
    {
      heading: "4. Vaš sadržaj i licenca",
      paragraphs: [
        "Vi (i vaši gosti) zadržavate sva prava na fotografije, videe i drugi sadržaj koji učitate. Radi rada Usluge, dodjeljujete nam ograničenu, neekskluzivnu licencu za hosting, pohranu, obradu, promjenu veličine i prikaz tog sadržaja isključivo u svrhu pružanja Usluge vama i vašim ovlaštenim posjetiocima. Kao vlasnik događaja, odgovorni ste za sadržaj u svojim galerijama, uključujući prijenose gostiju, i za zakoniti osnov njegovog prikupljanja, pohrane i dijeljenja.",
      ],
    },
    {
      heading: "5. Moderacija i uklanjanje",
      paragraphs: [
        "Vlasnici događaja mogu skrivati, brisati i vraćati medije u svojim galerijama. Mi također možemo ukloniti sadržaj ili suspendovati naloge za koje razumno vjerujemo da krše ove Uslove ili primjenjive propise, ili kao odgovor na valjan pravni zahtjev.",
      ],
    },
    {
      heading: "6. Ograničenja plana i dostupnost",
      paragraphs: [
        "Pohrana, broj aktivnih događaja, periodi prijenosa i pristupa galeriji ograničeni su vašim planom. Usluga se pruža „kakva jeste“ i „po dostupnosti“; kao proizvod koji se razvija može se mijenjati i ne garantujemo neprekidan rad bez grešaka. Čuvajte vlastite kopije važnih medija.",
      ],
    },
    {
      heading: "7. Intelektualno vlasništvo",
      paragraphs: [
        `Naziv ${APP}, brend, softver i dizajn vlasništvo su ${COMPANY} i zaštićeni zakonom. Ovi Uslovi vam ne daju nikakva prava na naše zaštitne znakove ili softver izvan namjenskog korištenja Usluge.`,
      ],
    },
    {
      heading: "8. Usluge trećih strana",
      paragraphs: [
        "Usluga se oslanja na treće strane (uključujući provajdere plaćanja, hostinga i pohrane). Vaše korištenje može podlijegati i njihovim uslovima, a mi nismo odgovorni za njihove usluge.",
      ],
    },
    {
      heading: "9. Odricanja i ograničenje odgovornosti",
      paragraphs: [
        "U najvećoj mjeri dopuštenoj zakonom, isključujemo implicitne garancije i nismo odgovorni za indirektnu, slučajnu ili posljedičnu štetu, niti za gubitak podataka ili sadržaja. Ništa u ovim Uslovima ne ograničava odgovornost koja se zakonom ne može ograničiti, uključujući vaša zakonska potrošačka prava.",
      ],
    },
    {
      heading: "10. Obeštećenje",
      paragraphs: [
        "Saglasni ste da nas obeštetite za zahtjeve proizašle iz sadržaja koji vi ili vaši gosti učitate, vašeg kršenja ovih Uslova ili kršenja zakona ili prava drugih.",
      ],
    },
    {
      heading: "11. Prekid",
      paragraphs: [
        "Možete prestati koristiti Uslugu i zatvoriti nalog u bilo kojem trenutku. Mi možemo suspendovati ili prekinuti pristup zbog kršenja ovih Uslova ili gdje zakon to nalaže. Neke odredbe ostaju na snazi i nakon prekida, uključujući licence sadržaja potrebne za dovršetak brisanja, intelektualno vlasništvo, odricanja i ograničenja odgovornosti.",
      ],
    },
    {
      heading: "12. Mjerodavno pravo",
      paragraphs: [
        `Ovi Uslovi podliježu pravu ${LAW}, a sporovi su u nadležnosti tamošnjih nadležnih sudova, ne dirajući obavezna potrošačka prava u vašoj zemlji prebivališta.`,
      ],
    },
    {
      heading: "13. Izmjene i kontakt",
      paragraphs: [
        `Možemo ažurirati ove Uslove; značajne izmjene biće označene ažuriranim datumom iznad. Pitanja: ${COMPANY}, ${ADDRESS}, ${EMAIL}.`,
      ],
    },
  ],
};

const DOCS: Record<Locale, Record<LegalKind, LegalDoc>> = {
  en: { privacy: EN_PRIVACY, terms: EN_TERMS },
  bs: { privacy: BS_PRIVACY, terms: BS_TERMS },
};

export function getLegalDoc(locale: Locale, kind: LegalKind): LegalDoc {
  return (DOCS[locale] ?? DOCS.en)[kind];
}
