import { Link } from 'react-router-dom';
import { SITE } from '../lib/site.js';

/**
 * The website's legal and company pages.
 *
 * Written for how Mediigo actually works today: patients book OPD tokens and
 * pay the clinic directly; Mediigo bills clinics per token; there is no
 * teleconsultation and no online payment by patients. If any of that changes,
 * these pages must change with it.
 *
 * This is a careful starting draft, not legal advice. Have it reviewed by a
 * lawyer familiar with the DPDP Act 2023 and the IT Rules before launch.
 */

const P = ({ children }) => <p>{children}</p>;
const UL = ({ items }) => <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
const Mail = ({ to }) => <a href={`mailto:${to}`}>{to}</a>;
const L = ({ to, children }) => <Link to={to}>{children}</Link>;

const company = () => <><strong>{SITE.legalName}</strong> (“{SITE.name}”, “we”, “us”), {SITE.address}</>;

const grievanceBlock = () => (
  <div className="legal-card">
    <p><strong>{SITE.grievanceOfficer.name}</strong>, {SITE.grievanceOfficer.designation}</p>
    <p>{SITE.legalName}, {SITE.address}</p>
    <p>Email: <Mail to={SITE.grievanceEmail} /> · Phone: {SITE.supportPhone}</p>
    <p>{SITE.supportHours}</p>
  </div>
);

export const LEGAL_DOCS = [
  // ───────────────────────────────────────────────────────────── Privacy
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    description: 'How Mediigo collects, uses, shares and protects personal and health information of patients, doctors and clinics, and the rights you have under Indian law.',
    sections: [
      {
        id: 'about', heading: 'About this policy',
        body: <>
          <P>This Privacy Policy explains how {company()} handles personal data when you use the Mediigo website at {SITE.url.replace('https://', '')}, our patient portal, the clinic desk and related services (together, the “Platform”).</P>
          <P>It is published under the Digital Personal Data Protection Act, 2023 (“DPDP Act”), the Information Technology Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011. By using the Platform you agree to this policy. If you do not agree, please do not use the Platform.</P>
        </>,
      },
      {
        id: 'roles', heading: 'Who is responsible for your data',
        body: <>
          <P><strong>For your Mediigo account</strong> — your profile, bookings, tokens and reviews — Mediigo is the data fiduciary.</P>
          <P><strong>For clinical records a clinic creates</strong> — such as prescriptions, diagnoses and visit notes written by your doctor — the clinic and doctor treating you are responsible for those records. Mediigo stores and processes them on the clinic’s behalf, and only to provide the Platform to that clinic.</P>
        </>,
      },
      {
        id: 'collect', heading: 'What we collect',
        body: <>
          <h3>If you are a patient</h3>
          <UL items={[
            'Account details: your name, mobile number, and optionally email, date of birth, gender and photo.',
            'Family members you add: their name, relationship, date of birth, gender and any health conditions you choose to record.',
            'Bookings and visits: the doctor and clinic, date and sitting, token number, the reason for the visit you tell us, and the visit status.',
            'Clinical records your doctor writes on Mediigo: symptoms, diagnosis, prescribed medicines, advice and follow-up date.',
            'Insurance details, only if you choose to add them: insurer, policy number, plan, cover amounts and members covered.',
            'Aadhaar number, only if you choose to enter it: we keep a one-way cryptographic fingerprint (hash) to recognise you across clinics. We never store your Aadhaar number in readable form.',
            'Location: with your permission, your device location to show doctors near you. You can also pick a city instead. Your last chosen location is saved to your account so distances stay accurate.',
            'Reviews and ratings you write about a doctor.',
          ]} />
          <h3>If you are a doctor, clinic owner or clinic staff</h3>
          <UL items={[
            'Name, mobile number, email, photo and login credentials (passwords are stored only as a secure hash).',
            'Professional details: medical council, registration number and year, qualifications, specialty, designation, experience, fees and OPD schedule.',
            'Clinic details: name, licence number, address and map location, photos, facilities, contact details and subscription plan.',
            'Records of the clinic’s use of the Platform: tokens issued, payments recorded at the front desk, petty cash entries and usage-based charges.',
          ]} />
          <h3>If you enquire about Mediigo for your clinic</h3>
          <UL items={['Your name, mobile number, email, clinic name, city, specialty, number of doctors, preferred time to call and your message, together with the advertisement or link that brought you to us.']} />
          <h3>From every visitor</h3>
          <UL items={['Technical data: IP address, device and browser type, pages visited, and error and security logs.', <>Cookies and similar storage — see our <L to="/cookie-policy">Cookie Policy</L>.</>]} />
        </>,
      },
      {
        id: 'use', heading: 'How we use it',
        body: <>
          <UL items={[
            'To create and secure your account, including sending one-time passwords (OTPs).',
            'To show doctors and clinics near you, book tokens and show the live queue.',
            'To send booking confirmations, queue alerts and reminders, including by WhatsApp and SMS.',
            'To let the clinic and doctor you book see your booking and the details they need to treat you, and to keep your visit history with them.',
            'To verify and onboard clinics and doctors, and to bill clinics for their use of the Platform.',
            'To respond to enquiries, support requests and complaints.',
            'To keep the Platform safe: preventing fraud and misuse, and keeping audit logs of sensitive actions.',
            'To meet legal obligations and respond to lawful requests from authorities.',
            'To understand and improve the Platform using aggregated information that does not identify you.',
          ]} />
          <P><strong>We do not sell your personal data.</strong> We do not use your health information for advertising, and we do not share it with advertisers.</P>
        </>,
      },
      {
        id: 'basis', heading: 'Consent and your choices',
        body: <>
          <P>We process your personal data with your consent, which you give when you create an account, book a token or submit a form, and for the legitimate uses the DPDP Act allows (for example, a booking you asked for, or a legal requirement). Optional information — insurance details, Aadhaar, family members, location — is collected only if you provide it.</P>
          <P>You can withdraw consent at any time by deleting the information, deleting your account, or writing to us. Withdrawal does not affect processing that already took place, and some records may have to be kept by law (see “How long we keep it”).</P>
        </>,
      },
      {
        id: 'share', heading: 'Who we share it with',
        body: <>
          <UL items={[
            <><strong>The clinic and doctor you book</strong>, including their front-desk staff, to manage your visit.</>,
            <><strong>Service providers</strong> who run parts of the Platform for us under contract and confidentiality obligations: cloud hosting and file storage (including Google Cloud), messaging providers for WhatsApp and SMS, and Google Maps for addresses, maps and distances.</>,
            <><strong>Mediigo staff</strong> — field agents and district administrators — when they onboard, verify or support a clinic.</>,
            <><strong>Authorities</strong> when required by law, court order or to protect someone’s life or safety.</>,
            <><strong>A successor business</strong>, if Mediigo is merged or acquired, under the same protections as this policy.</>,
          ]} />
          <P>Doctor and clinic profiles (name, photo, qualifications, specialty, registration number, fees, timings, address, photos and published reviews) are public on the Platform, because that is how patients choose a doctor.</P>
        </>,
      },
      {
        id: 'security', heading: 'How we protect it',
        body: <>
          <P>We use reasonable security practices consistent with IS/ISO/IEC 27001, including encryption of data in transit (HTTPS), password hashing, one-way hashing of Aadhaar numbers, role-based access so staff see only what their role needs, and audit logs of sensitive actions. No system is completely secure; if a personal data breach affects you, we will inform you and the Data Protection Board of India as the law requires.</P>
          <P>Our service providers may store data on servers in or outside India. Any transfer outside India is made only to countries not restricted by the Government of India, with safeguards no weaker than this policy.</P>
        </>,
      },
      {
        id: 'retention', heading: 'How long we keep it',
        body: <UL items={[
          'Account data: for as long as your account is active. When you delete your account we remove or anonymise your personal data, except what we must keep by law.',
          'Clinical records created by a clinic: for the period the clinic is required to keep medical records (for example, at least three years under the Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations, 2002), or longer where another law requires it.',
          'Billing and tax records: for the period required by tax laws (generally eight years).',
          'Clinic enquiries: up to 24 months after our last contact, unless you become a customer.',
          'Security logs: up to 180 days, or longer where needed to investigate an incident.',
        ]} />,
      },
      {
        id: 'rights', heading: 'Your rights',
        body: <>
          <P>Under the DPDP Act you may:</P>
          <UL items={[
            'ask for a summary of the personal data we hold about you and how we process it;',
            'correct, complete or update it — most of it directly in your Profile;',
            'erase it — you can delete your account from Profile → Delete account;',
            'withdraw consent;',
            'nominate a person to exercise your rights if you die or become unable to;',
            'raise a grievance with us, and then with the Data Protection Board of India.',
          ]} />
          <P>To exercise a right, write to <Mail to={SITE.privacyEmail} /> from your registered email or mention your registered mobile number. We may need to verify your identity. We respond within the time the law requires.</P>
        </>,
      },
      {
        id: 'children', heading: 'Children',
        body: <P>Mediigo accounts are for adults. A parent or lawful guardian may add a child as a family member and book on the child’s behalf, and in doing so gives verifiable consent for that child’s data. We do not knowingly track or advertise to children.</P>,
      },
      {
        id: 'changes', heading: 'Changes to this policy',
        body: <P>We may update this policy. The date at the top shows when it last changed. For significant changes we will notify you on the Platform or by message before they take effect.</P>,
      },
      {
        id: 'contact', heading: 'Contact and Grievance Officer',
        body: <>
          <P>For privacy questions write to <Mail to={SITE.privacyEmail} />. For complaints, contact our Grievance Officer:</P>
          {grievanceBlock()}
        </>,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Terms
  {
    slug: 'terms',
    title: 'Terms of Use',
    description: 'The terms that apply when you use Mediigo to find doctors, book OPD tokens and follow the live queue.',
    sections: [
      {
        id: 'agreement', heading: 'Agreement',
        body: <>
          <P>These Terms of Use (“Terms”) are an agreement between you and {company()} for your use of the Platform. They are an electronic record under the Information Technology Act, 2000 and need no physical signature. By using the Platform you accept these Terms and our <L to="/privacy-policy">Privacy Policy</L>.</P>
          <P>Clinics, doctors and their staff are also bound by the <L to="/clinic-terms">Clinic & Doctor Terms</L>.</P>
        </>,
      },
      {
        id: 'what', heading: 'What Mediigo is — and is not',
        body: <>
          <P>Mediigo is a technology platform that helps you find clinics and doctors, book an OPD token, and follow the queue. <strong>Mediigo is not a hospital, clinic or healthcare provider and does not give medical advice.</strong> Consultations, diagnosis, treatment and prescriptions are provided solely by the independent doctors and clinics you choose, who are responsible for them.</P>
          <P>Mediigo is not for emergencies. In a medical emergency call <strong>112</strong> or <strong>108</strong>, or go to the nearest hospital. See our <L to="/medical-disclaimer">Medical Disclaimer</L>.</P>
        </>,
      },
      {
        id: 'account', heading: 'Your account',
        body: <UL items={[
          'You must be 18 or older to create an account. You may book for family members, including children, for whom you are responsible.',
          'Give accurate details, and keep your mobile number up to date — it is how you sign in.',
          'You are responsible for activity on your account. Do not share OTPs with anyone; Mediigo will never ask for them.',
          'You can delete your account at any time from your Profile.',
        ]} />,
      },
      {
        id: 'bookings', heading: 'Bookings and tokens',
        body: <UL items={[
          'A token reserves your place in a doctor’s queue for a sitting. It is not a fixed appointment time: waiting times shown are estimates based on the live queue and can change.',
          'Clinics set their own timings, fees and capacity. A clinic may change or cancel a sitting — for example, if the doctor is called to an emergency — and we will try to tell you as soon as the clinic does.',
          'Please arrive in time for your turn. A clinic may skip or cancel a token if you are not present when called, following its own policy.',
          'You can cancel a booking from My Bookings before your turn. Cancelling does not refund any fee you have already paid to the clinic.',
          'Mediigo does not charge patients a booking fee today. Consultation fees are set by the clinic and paid directly to the clinic. See our Refund Policy.',
        ]} />,
      },
      {
        id: 'info', heading: 'Doctor and clinic information',
        body: <P>Doctor and clinic details — qualifications, registration numbers, fees, timings and photos — are provided by the clinics. We check registration details during onboarding, but we do not guarantee that every detail is complete, current or accurate, and we do not endorse any doctor. Please use your own judgment when choosing a doctor.</P>,
      },
      {
        id: 'reviews', heading: 'Reviews',
        body: <>
          <P>Reviews must be your genuine experience of a visit you made. Do not post anything false, abusive, defamatory, or that includes someone else’s personal or health information. Reviews are moderated before they appear and we may edit out personal details or decline to publish a review that breaks these rules.</P>
          <P>By posting a review you allow Mediigo to display it on the Platform with your first name.</P>
        </>,
      },
      {
        id: 'conduct', heading: 'Acceptable use',
        body: <>
          <P>You agree not to:</P>
          <UL items={[
            'book tokens you do not intend to use, or book in someone else’s name without their permission;',
            'misuse, harass or threaten clinic staff, doctors or other users;',
            'copy, scrape or resell data from the Platform, or use bots to book tokens;',
            'attempt to access accounts, data or systems you are not authorised to;',
            'upload anything unlawful, or that infringes others’ rights, or contains malware;',
            'use the Platform in breach of any law, including the IT Rules, 2021.',
          ]} />
          <P>We may suspend or close accounts that break these Terms.</P>
        </>,
      },
      {
        id: 'ip', heading: 'Intellectual property',
        body: <P>The Platform, its software, design, logo and content (other than content provided by clinics and users) belong to Mediigo or its licensors. You may use the Platform for its intended purpose only.</P>,
      },
      {
        id: 'liability', heading: 'Liability',
        body: <>
          <P>The Platform is provided “as is”. We work to keep it available and accurate but cannot promise it will be uninterrupted or error-free, or that a clinic will honour a booking.</P>
          <P>To the extent permitted by law, Mediigo is not liable for the medical services, advice, treatment or conduct of any doctor or clinic, or for indirect or consequential loss. Where we are liable, our total liability to you is limited to ₹1,000 or the amount you paid Mediigo in the previous twelve months, whichever is higher. Nothing in these Terms limits liability that cannot be limited by law, or your rights under the Consumer Protection Act, 2019.</P>
        </>,
      },
      {
        id: 'law', heading: 'Governing law and disputes',
        body: <P>These Terms are governed by the laws of India. Please raise any complaint first with our Grievance Officer (see <L to="/grievance-redressal">Grievance Redressal</L>). Subject to that, the courts at {SITE.jurisdictionCity} have jurisdiction, without affecting your right to approach a consumer commission.</P>,
      },
      {
        id: 'changes', heading: 'Changes',
        body: <P>We may update these Terms. Continuing to use the Platform after an update means you accept the new Terms; for significant changes we will notify you in advance.</P>,
      },
      {
        id: 'contact', heading: 'Contact',
        body: <P>Questions about these Terms: <Mail to={SITE.supportEmail} />.</P>,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Cookies
  {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    description: 'The cookies and browser storage Mediigo uses, why, and how you can control them.',
    sections: [
      {
        id: 'what', heading: 'What cookies are',
        body: <P>Cookies are small files a website stores in your browser. Similar technologies — such as your browser’s local storage — work in the same way. This policy covers both.</P>,
      },
      {
        id: 'necessary', heading: 'Strictly necessary (always on)',
        body: <>
          <P>These keep the Platform working and secure. They do not need consent and cannot be switched off without breaking sign-in.</P>
          <div className="legal-table">
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr></thead>
              <tbody>
                <tr><td><code>refreshToken</code></td><td>Cookie (HTTP-only, secure)</td><td>Keeps you signed in securely</td><td>Up to 30 days</td></tr>
                <tr><td><code>mediigo:cookie-consent</code></td><td>Local storage</td><td>Remembers your cookie choice</td><td>Until you clear it</td></tr>
              </tbody>
            </table>
          </div>
        </>,
      },
      {
        id: 'functional', heading: 'Preferences (functional)',
        body: <>
          <P>These remember choices you made so you do not have to repeat them. They stay on your device.</P>
          <div className="legal-table">
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr></thead>
              <tbody>
                <tr><td><code>mediigo.coords</code>, <code>mediigo.locationAsked</code></td><td>Local storage</td><td>Your chosen location for nearby doctors, and whether we already asked for it</td><td>Until you clear it</td></tr>
                <tr><td><code>mediigo:*</code></td><td>Local storage</td><td>Booking in progress and display preferences</td><td>Until you sign out or clear it</td></tr>
                <tr><td><code>mg-utm</code></td><td>Session storage</td><td>Which advertisement or link brought you to the clinic page, sent with an enquiry</td><td>Until you close the tab</td></tr>
                <tr><td><code>mg-onboard-draft-v2</code></td><td>Local storage</td><td>Mediigo field agents only: saves an onboarding form in progress</td><td>Until submitted</td></tr>
              </tbody>
            </table>
          </div>
        </>,
      },
      {
        id: 'analytics', heading: 'Analytics and advertising (only with your consent)',
        body: <>
          <P>If we turn on analytics or advertising tools — for example Google Analytics to understand which pages are used, or the Meta Pixel to measure our Instagram and Facebook ads — they load <strong>only after you choose “Accept all”</strong>. They are never used on pages that show your health information, and we do not send them your bookings, symptoms or prescriptions.</P>
          <P>If you choose “Only necessary”, they are not loaded.</P>
        </>,
      },
      {
        id: 'control', heading: 'Your choices',
        body: <P>You can change your choice at any time using “Cookie settings” at the bottom of any page, and you can delete cookies and site data in your browser’s settings. Blocking strictly necessary cookies will sign you out.</P>,
      },
      {
        id: 'contact', heading: 'Contact',
        body: <P>Questions: <Mail to={SITE.privacyEmail} />. See also our <L to="/privacy-policy">Privacy Policy</L>.</P>,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Clinic terms
  {
    slug: 'clinic-terms',
    title: 'Clinic & Doctor Terms',
    description: 'Terms for clinics, hospitals, doctors and staff who use Mediigo to manage their OPD, issue tokens and receive online bookings.',
    sections: [
      {
        id: 'scope', heading: 'Scope',
        body: <P>These terms apply to clinics, hospitals and doctors (“Clinic”) and their staff who use Mediigo’s clinic desk, in addition to our <L to="/terms">Terms of Use</L> and <L to="/privacy-policy">Privacy Policy</L>. A Clinic accepts them when its onboarding is submitted or when it first uses the clinic desk.</P>,
      },
      {
        id: 'onboarding', heading: 'Onboarding and verification',
        body: <UL items={[
          'The Clinic must give true and complete details: clinic licence, address, doctors’ names, medical council registration numbers, qualifications, fees and timings.',
          'Mediigo may verify these details and may decline or suspend a Clinic whose details cannot be verified.',
          'Each doctor must hold a valid registration with the National Medical Commission or a State Medical Council (or the relevant council for their system of medicine) and keep it valid.',
          'The Clinic must keep its listing accurate — timings, fees, leave and closures — so patients are not misled.',
        ]} />,
      },
      {
        id: 'accounts', heading: 'Logins and staff',
        body: <UL items={[
          'Each person gets their own login. The Clinic is responsible for everything done with its logins and must remove staff who leave.',
          'One doctor may be the clinic admin, with the whole clinic’s revenue and footfall; other doctors see their own queue; the front desk sees every queue.',
          'Report suspected unauthorised access to us immediately.',
        ]} />,
      },
      {
        id: 'care', heading: 'Medical responsibility',
        body: <P>The Clinic and its doctors are solely responsible for consultations, diagnosis, treatment, prescriptions and medical records, and for complying with medical laws and the professional conduct regulations that apply to them. Mediigo provides software and does not take part in clinical decisions.</P>,
      },
      {
        id: 'data', heading: 'Patient data',
        body: <>
          <P>For clinical records the Clinic creates on Mediigo, the Clinic is the data fiduciary and Mediigo acts as its data processor. The Clinic must have a lawful basis to record patients’ data, use it only for treatment and the clinic’s operations, and keep records for the period the law requires.</P>
          <P>Mediigo will process that data only to provide the Platform to the Clinic, keep it secure, help the Clinic respond to patients’ requests, and notify the Clinic of a personal data breach that affects it.</P>
        </>,
      },
      {
        id: 'fees', heading: 'Fees and billing',
        body: <UL items={[
          'New Clinics receive a free trial for the period agreed at approval.',
          'After the trial, the Clinic pays a usage-based charge per token issued — a different rate for bookings patients make online and for tokens issued at the front desk — at the rates shown on our pricing page or agreed in writing. Rates may change with 30 days’ notice.',
          'Charges are invoiced monthly, are exclusive of GST, and are payable within 15 days of the invoice.',
          'Consultation fees are collected by the Clinic from patients. Mediigo does not collect or hold them.',
          'Unpaid charges may lead to suspension of the clinic desk after notice.',
        ]} />,
      },
      {
        id: 'standee', heading: 'QR standees',
        body: <P>QR standees provided by Mediigo remain Mediigo’s property and must be kept at the registered clinic. Lost or damaged standees may be charged at cost.</P>,
      },
      {
        id: 'termination', heading: 'Ending the service',
        body: <P>The Clinic may stop using Mediigo at any time by writing to us. Mediigo may suspend or end the service for breach of these terms, non-payment, or where required by law. On termination the Clinic may request an export of its patient records within 30 days, after which they are retained only as the law requires.</P>,
      },
      {
        id: 'liability', heading: 'Liability',
        body: <P>Mediigo’s total liability to a Clinic is limited to the charges the Clinic paid in the three months before the claim. Mediigo is not liable for lost revenue, lost patients or indirect loss. The Clinic will indemnify Mediigo against claims arising from its medical services or from inaccurate information it provided.</P>,
      },
      {
        id: 'contact', heading: 'Contact',
        body: <P>Clinic support: <Mail to={SITE.supportEmail} />. New to Mediigo? <L to="/clinic#enquire">Ask for a demo</L>.</P>,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Refunds
  {
    slug: 'refund-policy',
    title: 'Cancellation & Refund Policy',
    description: 'How booking cancellations work on Mediigo and how refunds are handled for patients and clinics.',
    sections: [
      {
        id: 'patients', heading: 'For patients',
        body: <UL items={[
          'Mediigo does not charge patients for booking a token. You pay the consultation fee directly to the clinic at the visit.',
          'You can cancel a booking from My Bookings before your turn. There is no cancellation charge from Mediigo.',
          'If you already paid the clinic for a token, cancelling it does not automatically refund that fee. Any refund is at the clinic’s discretion under its own policy. If you need help reaching the clinic, contact us and we will help.',
          'If a clinic cancels a sitting, your token is cancelled and you can book another sitting or doctor.',
        ]} />,
      },
      {
        id: 'clinics', heading: 'For clinics',
        body: <UL items={[
          'Usage charges apply to each token issued on Mediigo, including tokens later cancelled or skipped, unless Mediigo waives them.',
          'If you believe an invoice is wrong, write to us within 30 days of the invoice. Confirmed billing errors are credited to your next invoice or refunded to your bank account within 7–10 working days.',
        ]} />,
      },
      {
        id: 'future', heading: 'If we introduce online payments',
        body: <P>If Mediigo starts collecting any payment online, this policy will be updated before that happens to set out the refund terms and timelines.</P>,
      },
      {
        id: 'contact', heading: 'Contact',
        body: <P><Mail to={SITE.supportEmail} /> · {SITE.supportHours}</P>,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Medical disclaimer
  {
    slug: 'medical-disclaimer',
    title: 'Medical Disclaimer',
    description: 'Mediigo is a booking and queue platform, not a healthcare provider. Read this before relying on information on the platform.',
    sections: [
      {
        id: 'emergency', heading: 'Not for emergencies',
        body: <div className="legal-card legal-card-alert"><p><strong>In a medical emergency, call 112 or 108 or go to the nearest hospital immediately.</strong> Do not wait for a token on Mediigo.</p></div>,
      },
      {
        id: 'advice', heading: 'No medical advice',
        body: <P>Mediigo helps you find doctors and book OPD tokens. Nothing on the Platform — including specialty descriptions, conditions listed on a doctor’s profile, wait estimates or FAQs — is medical advice, diagnosis or treatment, or a substitute for consulting a qualified doctor.</P>,
      },
      {
        id: 'doctors', heading: 'Doctors are independent',
        body: <P>Doctors and clinics listed on Mediigo are independent professionals. Mediigo does not employ them, does not recommend or endorse any of them, and is not responsible for their advice or treatment. Profile information is provided by the clinics; we check registration details at onboarding but cannot guarantee every detail.</P>,
      },
      {
        id: 'reviews', heading: 'Reviews',
        body: <P>Ratings and reviews are the personal opinions of patients and do not reflect Mediigo’s views.</P>,
      },
      {
        id: 'wait', heading: 'Waiting times',
        body: <P>Waiting times and “your turn is close” alerts are estimates from the live queue. Consultations can take longer than expected and emergencies may be seen first.</P>,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Grievance
  {
    slug: 'grievance-redressal',
    title: 'Grievance Redressal',
    description: 'How to raise a complaint with Mediigo, our Grievance Officer’s details and response timelines.',
    sections: [
      {
        id: 'officer', heading: 'Grievance Officer',
        body: <>
          <P>In accordance with the Information Technology Act, 2000, the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the Consumer Protection (E-Commerce) Rules, 2020 and the DPDP Act, 2023, our Grievance Officer is:</P>
          {grievanceBlock()}
        </>,
      },
      {
        id: 'how', heading: 'How to raise a grievance',
        body: <UL items={[
          'Email the Grievance Officer with your name, registered mobile number, a description of the issue, and any booking or token number.',
          'Complaints about a clinic’s medical services are shared with that clinic for its response; we will tell you when we do.',
        ]} />,
      },
      {
        id: 'timelines', heading: 'Timelines',
        body: <UL items={[
          'We acknowledge your complaint within 24 hours (48 hours at most).',
          'We resolve it within 15 days of receipt — sooner where the law requires, for example within 72 hours for requests to remove content that exposes a person’s private information.',
          'If you are not satisfied with our response on a data protection matter, you may complain to the Data Protection Board of India.',
        ]} />,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── About
  {
    slug: 'about',
    title: 'About Mediigo',
    description: 'Mediigo helps patients skip crowded waiting rooms and helps clinics run their OPD on time with digital tokens and a live queue.',
    sections: [
      {
        id: 'mission', heading: 'Less waiting, better OPDs',
        body: <>
          <P>Waiting rooms in Indian clinics are crowded because nobody knows when their turn will come. Mediigo fixes that. Patients find a doctor nearby, book a token from their phone and see the live queue, so they arrive just before their turn. Clinics get a simple desk to issue tokens, call patients, write prescriptions and close the day’s collection.</P>
        </>,
      },
      {
        id: 'patients', heading: 'For patients',
        body: <UL items={[
          'Find doctors and clinics near you by specialty, with real fees and timings.',
          'Book a token for today or later in the week — no booking charges.',
          'Track the live queue and get an alert when your turn is close.',
          'Keep your visits and prescriptions in one place, for your whole family.',
        ]} />,
      },
      {
        id: 'clinics', heading: 'For clinics',
        body: <P>Digital tokens, a live queue board, online bookings, QR standees for walk-ins, prescriptions and collections, priced per token with no setup fee. <L to="/clinic">See Mediigo for clinics</L>.</P>,
      },
      {
        id: 'company', heading: 'The company',
        body: <P>Mediigo is operated by {SITE.legalName}, {SITE.address}. CIN: {SITE.cin}.</P>,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Contact
  {
    slug: 'contact',
    title: 'Contact Us',
    description: 'Contact Mediigo for help with bookings, your account or getting your clinic on Mediigo.',
    sections: [
      {
        id: 'patients', heading: 'Patients',
        body: <P>Help with a booking or your account: <Mail to={SITE.supportEmail} /> · {SITE.supportPhone}. {SITE.supportHours}. For anything about your treatment, please contact your clinic directly.</P>,
      },
      {
        id: 'clinics', heading: 'Clinics and doctors',
        body: <P>Want Mediigo at your clinic? <L to="/clinic#enquire">Request a call back</L> and our team will reach you. Existing clinics can write to <Mail to={SITE.supportEmail} />.</P>,
      },
      {
        id: 'privacy', heading: 'Privacy and complaints',
        body: <P>Privacy requests: <Mail to={SITE.privacyEmail} />. Complaints: see <L to="/grievance-redressal">Grievance Redressal</L>.</P>,
      },
      {
        id: 'office', heading: 'Registered office',
        body: <P>{SITE.legalName}<br />{SITE.address}</P>,
      },
    ],
  },
];

export const legalDoc = (slug) => LEGAL_DOCS.find((d) => d.slug === slug) ?? null;

/** Footer groups. */
export const LEGAL_LINKS = [
  ['/privacy-policy', 'Privacy Policy'],
  ['/terms', 'Terms of Use'],
  ['/cookie-policy', 'Cookie Policy'],
  ['/refund-policy', 'Refund Policy'],
  ['/medical-disclaimer', 'Medical Disclaimer'],
  ['/clinic-terms', 'Clinic & Doctor Terms'],
  ['/grievance-redressal', 'Grievance Redressal'],
];
export const COMPANY_LINKS = [
  ['/about', 'About Mediigo'],
  ['/contact', 'Contact Us'],
  ['/clinic', 'For Clinics & Doctors'],
  ['/p/explore', 'Find a Doctor'],
];
