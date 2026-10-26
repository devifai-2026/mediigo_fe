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
const OL = ({ items }) => <ol>{items.map((t, i) => <li key={i}>{t}</li>)}</ol>;
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
    description: 'How Mediigo collects, uses, stores, shares and protects your personal and medical information, and the privacy rights available to you.',
    effectiveDate: '25 October 2026',
    lastUpdated: '25 October 2026',
    sections: [
      {
        id: 'introduction', heading: 'Introduction',
        body: <>
          <P>Mediigo is a healthcare discovery and OPD token-booking platform designed to help patients find doctors and clinics, book OPD tokens, check queue updates, and access digital prescriptions and medical records where these services are available.</P>
          <P>This Privacy Policy explains how Mediigo collects, uses, stores, shares and protects your personal information when you use our website, application or related services.</P>
          <div className="legal-card">
            <p>Company Name: <strong>Mediigo</strong></p>
            <p>Contact Email: <Mail to={SITE.contactEmail} /></p>
          </div>
        </>,
      },
      {
        id: 'collect', heading: 'Information We Collect',
        body: <>
          <P>Depending on the services you use, Mediigo may collect the following information:</P>
          <h3>2.1 Personal Information</h3>
          <UL items={['Name', 'Age or date of birth, where required', 'Mobile number', 'Account and profile information']} />
          <h3>2.2 Booking Information</h3>
          <UL items={['Selected doctor and clinic', 'OPD token number', 'Booking status and visit details', 'Appointment or queue-related updates']} />
          <h3>2.3 Health Information</h3>
          <P>Depending on the services available, we may collect or store:</P>
          <UL items={['Medical history provided by you', 'Digital prescriptions', 'Medical reports and documents uploaded by you', 'Consultation-related information recorded through Mediigo']} />
          <h3>2.4 Payment Information</h3>
          <UL items={['Transaction reference numbers', 'Payment status', 'Refund details']} />
          <P>Payment credentials are handled by the relevant payment service provider where applicable.</P>
          <h3>2.5 Technical Information</h3>
          <UL items={['Device and application information', 'System logs and security-related information', 'Essential cookies and similar technologies, where applicable']} />
          <h3>2.6 Communications</h3>
          <P>We may collect information you provide when contacting customer support, submitting feedback or raising a complaint.</P>
          <P>We aim to collect only the information reasonably necessary to provide our services and fulfil applicable legal obligations.</P>
        </>,
      },
      {
        id: 'use', heading: 'How We Use Your Information',
        body: <>
          <P>Mediigo may use your information to:</P>
          <UL items={[
            'Create and manage your patient account.',
            'Help you discover doctors and clinics.',
            'Facilitate OPD token bookings.',
            'Provide booking confirmations, token updates, reminders and cancellation notifications.',
            'Process payments and eligible refunds.',
            'Store and provide access to digital prescriptions and medical records where these services are available.',
            'Share relevant consultation information with the doctor you consulted, as described in this policy.',
            'Respond to your queries and complaints.',
            'Protect accounts, prevent fraud and maintain platform security.',
            'Comply with applicable laws and regulatory requirements.',
            'Improve our services using appropriate safeguards.',
          ]} />
          <P>Marketing communications will be handled separately from essential service notifications, with applicable consent and opt-out options.</P>
        </>,
      },
      {
        id: 'share', heading: 'Sharing of Personal and Medical Information',
        body: <>
          <P>Your medical privacy is important to Mediigo.</P>
          <h3>4.1 Sharing Information With Your Consulting Doctor</h3>
          <P>Mediigo may share relevant booking information, prescription details and other necessary consultation-related information with the doctor you consulted through Mediigo, where required to provide the service and permitted by applicable law.</P>
          <h3>4.2 No Sharing of Medical Records With Other Doctors</h3>
          <P>Mediigo does not routinely share your medical records or prescription details with other doctors.</P>
          <P>Your medical records and prescription details will not be made available to another doctor merely because that doctor is registered on Mediigo.</P>
          <P>Access is restricted to the doctor you consulted, subject to the applicable service arrangements, your permissions where required, and legal obligations.</P>
          <P>If you choose to consult another doctor, your information will not automatically be shared with that doctor. Any sharing will be subject to the applicable privacy requirements and permissions.</P>
          <h3>4.3 Service Providers</h3>
          <P>We may share the minimum information necessary with authorised service providers that help us operate Mediigo, including providers of:</P>
          <UL items={['Secure hosting and data storage', 'Payment processing', 'SMS and booking notifications', 'Customer support', 'Information security and technical maintenance']} />
          <P>These providers may process information only for authorised purposes and subject to applicable contractual and legal safeguards.</P>
          <h3>4.4 Legal Requirements</h3>
          <P>We may disclose information when required by applicable law, a valid legal process or a lawful direction from a competent authority.</P>
          <P>We do not sell your medical records to third parties for advertising.</P>
        </>,
      },
      {
        id: 'records', heading: 'Medical Records and Digital Prescriptions',
        body: <>
          <P>Where Mediigo provides digital prescriptions or medical record storage, we aim to protect the confidentiality and integrity of this information.</P>
          <UL items={[
            'Your records are intended to be accessible only to you and appropriately authorised persons.',
            'The doctor you consulted may access relevant consultation information for legitimate healthcare purposes.',
            'Other doctors will not automatically receive access to your records.',
            'You should check your personal and medical information for accuracy and report any errors.',
            'Doctors remain responsible for their clinical assessments, diagnoses, treatment decisions and prescriptions.',
          ]} />
          <P>Access to medical information will be governed by applicable privacy requirements, the services you use and any legally required permissions.</P>
        </>,
      },
      {
        id: 'security', heading: 'Data Security and Retention',
        body: <>
          <P>Mediigo will implement reasonable technical and organisational safeguards to protect personal information against unauthorised access, alteration, disclosure, destruction or loss.</P>
          <P>These measures may include access controls, authentication, secure storage and appropriate monitoring.</P>
          <P>We retain personal information only for as long as reasonably necessary for the purposes described in this policy, subject to applicable legal, regulatory, medical-record and dispute-resolution requirements.</P>
          <P>Where information is no longer required, it will be deleted or handled in accordance with applicable law and our retention procedures.</P>
          <P>No electronic system can be guaranteed to be completely secure.</P>
        </>,
      },
      {
        id: 'rights', heading: 'Your Privacy Rights',
        body: <>
          <P>Subject to applicable law, you may have the right to:</P>
          <UL items={[
            'Request information about the personal data we process.',
            'Request correction or updating of inaccurate information.',
            'Request deletion of personal data where legally permitted.',
            'Withdraw consent where processing relies on your consent.',
            'Raise concerns about the handling of your personal information.',
            'Submit a privacy complaint or grievance.',
            'Exercise applicable rights through an authorised representative.',
          ]} />
          <P>Withdrawing consent may affect services that depend on that consent. It does not invalidate processing that was lawful before the withdrawal.</P>
          <P>To submit a privacy request, contact:</P>
          <P>Email: <Mail to={SITE.contactEmail} /></P>
          <P>We will review and respond to requests in accordance with applicable law.</P>
        </>,
      },
      {
        id: 'children', heading: 'Children and Authorised Representatives',
        body: <>
          <P>Where our services involve children or individuals who require a lawful representative, Mediigo will apply the consent, verification and other requirements applicable under Indian law.</P>
          <P>Additional safeguards will be implemented where legally required.</P>
        </>,
      },
      {
        id: 'cookies', heading: 'Cookies and Similar Technologies',
        body: <>
          <P>Mediigo may use essential cookies or similar technologies to maintain sessions, support account security and enable core website functionality.</P>
          <P>If analytics, advertising or other non-essential tracking technologies are introduced, we will provide the notices and consent mechanisms required by applicable law.</P>
          <P>You may also manage cookies through your browser settings, although disabling essential cookies may affect certain features.</P>
        </>,
      },
      {
        id: 'changes', heading: 'Changes to This Privacy Policy',
        body: <>
          <P>We may update this Privacy Policy to reflect changes in our services, technology or legal obligations.</P>
          <P>The latest version will be published on the Mediigo website or application with an updated revision date. Material changes will be communicated through appropriate channels where required.</P>
        </>,
      },
      {
        id: 'contact', heading: 'Contact Us',
        body: <>
          <P>For privacy-related questions, requests or complaints, contact:</P>
          <div className="legal-card">
            <p>Company Name: <strong>Mediigo</strong></p>
            <p>Email: <Mail to={SITE.contactEmail} /></p>
          </div>
          <P>Please include a brief description of your request. Avoid sending passwords, payment PINs or unnecessary sensitive medical information by email.</P>
        </>,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Terms
  {
    slug: 'terms',
    title: 'Terms of Use',
    description: 'The terms that apply when patients use Mediigo to find doctors and clinics, book OPD tokens, follow the queue and access digital prescriptions.',
    effectiveDate: '25 October 2026',
    lastUpdated: '25 October 2026',
    sections: [
      {
        id: 'acceptance', heading: 'Acceptance of Terms',
        body: <>
          <P>Welcome to Mediigo.</P>
          <P>These Terms of Use (“Terms”) govern your access to and use of Mediigo’s website, mobile application and related patient services.</P>
          <P>Mediigo is a healthcare discovery and OPD token-booking platform that helps patients find doctors and clinics, book OPD tokens, check queue updates and access supported digital prescriptions and medical records.</P>
          <P>By creating an account, booking a token or using our services, you acknowledge that you have read and understood these Terms and agree to the provisions applicable to your use of Mediigo.</P>
          <P>If you do not agree with these Terms, please do not use the relevant services.</P>
          <div className="legal-card">
            <p>Platform operator: <strong>Mediigo</strong></p>
            <p>Contact email: <Mail to={SITE.contactEmail} /></p>
          </div>
        </>,
      },
      {
        id: 'services', heading: 'Services Provided by Mediigo',
        body: <>
          <P>Mediigo provides technology-based services intended to help patients connect with participating doctors and clinics.</P>
          <P>Depending on the features available, our services may include:</P>
          <UL items={[
            'Discovering doctors and clinics.',
            'Viewing doctor profiles, specialities, clinic locations and consultation fees.',
            'Booking OPD tokens online.',
            'Viewing token status and estimated waiting times.',
            'Receiving booking confirmations and queue notifications.',
            'Making payments for eligible bookings.',
            'Accessing digital prescriptions and medical records where supported.',
            'Contacting customer support for booking-related assistance.',
          ]} />
          <P>The availability of individual features may vary by doctor, clinic and location.</P>
          <P>Mediigo facilitates access to participating healthcare providers. Unless a particular service is expressly stated to be provided by Mediigo, the platform does not itself provide medical diagnosis, treatment or consultations.</P>
        </>,
      },
      {
        id: 'account', heading: 'Patient Account and Responsibilities',
        body: <>
          <P>When using Mediigo, you agree to:</P>
          <OL items={[
            'Provide accurate and current information when creating an account or making a booking.',
            'Provide a valid mobile number and complete the required verification process.',
            'Keep your login credentials and verification codes confidential.',
            'Use your account responsibly and promptly report suspected unauthorised access.',
            'Book tokens only for genuine healthcare visits.',
            'Review the selected doctor, clinic, consultation fee, platform fee and booking details before confirming a booking.',
            'Follow the applicable booking, cancellation and clinic instructions.',
            'Avoid submitting false information, impersonating another person or misusing another patient’s information.',
          ]} />
          <P>You may make a booking for another person where you have the appropriate authority to do so. You must provide accurate information and comply with applicable consent and privacy requirements.</P>
          <P>Mediigo may request additional information when reasonably necessary to verify an account or prevent fraud.</P>
        </>,
      },
      {
        id: 'tokens', heading: 'OPD Token Booking and Queue Management',
        body: <>
          <h3>4.1 Token Booking</h3>
          <P>An OPD token is a digital record of your place in the applicable clinic queue, subject to the clinic’s queue-management process.</P>
          <P>A token does not necessarily represent a fixed appointment time.</P>
          <P>The booking confirmation will indicate the booking status and other relevant details available for that service.</P>
          <h3>4.2 Waiting Times and Queue Updates</h3>
          <P>Mediigo may display your token number, current queue position or estimated waiting time where the clinic supports these features.</P>
          <P>Queue positions and waiting-time estimates are indicative and may change due to:</P>
          <UL items={[
            'Consultation duration.',
            'Emergency or priority cases.',
            'Walk-in patients.',
            'Doctor availability.',
            'Changes in clinic operations.',
            'Technical delays or incomplete queue updates.',
          ]} />
          <P>Mediigo does not guarantee consultation at an exact time based on an estimated waiting time.</P>
          <h3>4.3 Online and Walk-in Patients</h3>
          <P>Some participating clinics may accept both online token bookings and walk-in patients.</P>
          <P>The clinic manages its actual OPD queue according to its applicable process. Your position may be affected by the clinic’s queue rules and clinical priorities.</P>
          <P>Please follow the clinic’s instructions when you arrive.</P>
          <h3>4.4 Doctor or Clinic Unavailability</h3>
          <P>If a doctor becomes unavailable or a clinic changes its operating arrangements, Mediigo or the clinic will take reasonable steps to communicate relevant changes where contact information and system functionality permit.</P>
          <P>Rescheduling and refund options will be handled according to the applicable booking conditions and <L to="/refund-policy">Refund Policy</L>.</P>
        </>,
      },
      {
        id: 'info', heading: 'Doctor and Clinic Information',
        body: <>
          <P>Mediigo may display information such as:</P>
          <UL items={[
            'Doctor’s name and speciality.',
            'Qualifications and professional registration details, where available.',
            'Clinic address and operating information.',
            'Consultation fees.',
            'Available booking services.',
            'Other information supplied by the doctor or clinic.',
          ]} />
          <P>Information may be provided by participating healthcare providers and may change over time.</P>
          <P>Mediigo may perform identity, registration or clinic verification checks where applicable. Any claim that a doctor or clinic has been verified will reflect the checks actually completed.</P>
          <P>Patients should review available information and contact the clinic when clarification is necessary.</P>
          <P>Mediigo will take reasonable steps to address reports of inaccurate listings or suspected impersonation.</P>
        </>,
      },
      {
        id: 'fees', heading: 'Consultation Fees, Platform Fees and Payments',
        body: <>
          <h3>6.1 Fee Disclosure</h3>
          <P>Before you confirm a paid booking, Mediigo will display the applicable charges, including the consultation fee and any separate platform or service fee.</P>
          <P>The amount payable should be reviewed before payment is authorised.</P>
          <h3>6.2 Consultation Fees</h3>
          <P>The consultation fee is set by the relevant doctor or clinic, subject to applicable law and the terms of the service.</P>
          <P>Payment of a consultation fee does not guarantee a particular diagnosis, treatment outcome or prescription.</P>
          <h3>6.3 Platform Fees</h3>
          <P>Mediigo may charge a separate platform or booking fee for eligible services.</P>
          <P>Any applicable platform fee will be disclosed before you complete the booking.</P>
          <h3>6.4 Payment Processing</h3>
          <P>Payments may be processed through third-party payment service providers.</P>
          <P>You must provide accurate payment information and must not share your payment PIN, password or one-time verification code with anyone claiming to represent Mediigo.</P>
          <P>A successful payment does not necessarily mean that a booking has been confirmed. Please check the booking status displayed by Mediigo.</P>
          <P>If payment is deducted but the booking is not confirmed, contact customer support with your booking reference and transaction details.</P>
          <h3>6.5 Refunds</h3>
          <P>Refund eligibility depends on the circumstances and the terms disclosed at booking.</P>
          <P>Cancellations, doctor or clinic unavailability, duplicate payments and failed bookings will be handled in accordance with Mediigo’s <L to="/refund-policy">Refund Policy</L> and applicable law.</P>
          <P>Nothing in this section removes any refund or consumer right available to you under applicable law.</P>
        </>,
      },
      {
        id: 'records', heading: 'Medical Information, Prescriptions and Records',
        body: <>
          <h3>7.1 Digital Prescriptions</h3>
          <P>Where supported, Mediigo may enable patients to access digital prescriptions issued by their consulting doctor.</P>
          <P>The doctor is responsible for the clinical content of the prescription and the medical decisions associated with it.</P>
          <P>Patients should contact the prescribing doctor or clinic if a prescription appears incorrect, incomplete or unclear.</P>
          <P>Patients must not alter prescriptions or use another person’s prescription as their own.</P>
          <h3>7.2 Medical Records and Privacy</h3>
          <P>Mediigo may store or display medical information where the relevant service is available and applicable privacy requirements are satisfied.</P>
          <P>Access to medical information is subject to Mediigo’s <L to="/privacy-policy">Privacy Policy</L> and the permissions and safeguards applicable to the service.</P>
          <P>Mediigo does not routinely share your medical records or prescription details with other doctors merely because they are registered on the platform.</P>
          <P>Relevant information may be made available to the doctor you consulted for legitimate consultation-related purposes, subject to applicable law and the relevant privacy arrangements.</P>
          <P>Information may also be processed by authorised service providers where necessary to operate Mediigo, subject to appropriate safeguards.</P>
          <h3>7.3 Patient Responsibility</h3>
          <P>You are responsible for providing accurate information about yourself when using the platform.</P>
          <P>You should review your records and notify the relevant doctor, clinic or Mediigo support team if you identify an error.</P>
          <P>You should not use Mediigo as a substitute for professional medical advice or urgent medical care.</P>
        </>,
      },
      {
        id: 'emergencies', heading: 'Medical Emergencies and Clinical Responsibility',
        body: <>
          <P><strong>Mediigo is not an emergency medical service.</strong></P>
          <P>If you experience a medical emergency, call India’s emergency number <strong>112</strong> or seek immediate emergency medical care. Do not wait for a token, queue update or response from customer support.</P>
          <P>Doctors and other healthcare professionals are responsible for their clinical assessments, diagnoses, prescriptions and treatment decisions.</P>
          <P>Mediigo facilitates access to participating providers but does not independently determine the medical treatment appropriate for an individual patient.</P>
          <P>This provision does not exclude any responsibility Mediigo may have for its own services under applicable law.</P>
        </>,
      },
      {
        id: 'availability', heading: 'Service Availability and Technical Issues',
        body: <>
          <P>Mediigo aims to provide reliable access to its services but does not guarantee that the platform will always be available, uninterrupted or error-free.</P>
          <P>Services may occasionally be unavailable because of maintenance, technical failures, connectivity issues, security incidents or circumstances beyond our reasonable control.</P>
          <P>Mediigo may update, modify, suspend or discontinue features where reasonably necessary, subject to applicable law and any obligations relating to existing bookings or payments.</P>
          <P>Where a technical issue affects a confirmed booking or payment, patients may contact support for assistance.</P>
        </>,
      },
      {
        id: 'cancellations', heading: 'Cancellations and Changes',
        body: <>
          <P>Patients should follow the cancellation process displayed in Mediigo or communicated by the clinic.</P>
          <P>Cancellation eligibility, refund amounts and processing arrangements are governed by the applicable <L to="/refund-policy">Refund Policy</L> and booking conditions.</P>
          <P>If a doctor or clinic cancels a confirmed booking or cannot provide the booked service, Mediigo will communicate available options where reasonably possible.</P>
          <P>Depending on the circumstances, these may include rescheduling or a refund in accordance with the applicable terms and law.</P>
        </>,
      },
      {
        id: 'prohibited', heading: 'Prohibited Activities',
        body: <>
          <P>You must not:</P>
          <UL items={[
            'Create fraudulent or abusive bookings.',
            'Impersonate a patient, doctor or clinic.',
            'Access another person’s account or medical records without authority.',
            'Upload unlawful, misleading or malicious content.',
            'Attempt to bypass platform security or access controls.',
            'Interfere with the operation or security of Mediigo.',
            'Use Mediigo for unlawful activities or to violate another person’s privacy.',
          ]} />
          <P>Where reasonably necessary, Mediigo may investigate suspected misuse and take proportionate action, subject to applicable law.</P>
        </>,
      },
      {
        id: 'termination', heading: 'Account Suspension and Termination',
        body: <>
          <P>You may stop using Mediigo and request account closure through the available account settings or by contacting customer support.</P>
          <P>Mediigo may restrict, suspend or terminate access where reasonably necessary to address fraud, security risks, unlawful activity or material violations of these Terms.</P>
          <P>Where appropriate and legally permitted, we will notify the affected user and provide information about available review or complaint channels.</P>
          <P>Account closure does not automatically mean that all associated information will be deleted immediately. Certain information may need to be retained in accordance with applicable law, legitimate retention requirements and the <L to="/privacy-policy">Privacy Policy</L>.</P>
        </>,
      },
      {
        id: 'liability', heading: 'Limitation of Liability',
        body: <>
          <P>Mediigo will provide its services subject to applicable law and the terms described in these policies.</P>
          <P>To the extent permitted by law, Mediigo is not responsible for independent clinical decisions made by doctors or for outcomes resulting solely from such decisions.</P>
          <P>Mediigo does not guarantee that every doctor listing, queue estimate or item of third-party information will always be complete, current or error-free.</P>
          <P>Nothing in these Terms excludes or restricts liability that cannot lawfully be excluded or restricted, or limits your statutory consumer rights.</P>
          <P>Mediigo remains responsible for its own obligations and conduct as required under applicable law.</P>
        </>,
      },
      {
        id: 'privacy', heading: 'Privacy and Personal Data',
        body: <>
          <P>Your use of Mediigo is also governed by the Mediigo <L to="/privacy-policy">Privacy Policy</L>.</P>
          <P>That policy explains how personal information is collected, used, stored, protected and shared, including the handling of prescriptions and medical records.</P>
          <P>By using a feature that requires personal information, you acknowledge the applicable privacy notice. Where consent is legally required, Mediigo will seek that consent through the appropriate process.</P>
          <P>For privacy-related questions, contact <Mail to={SITE.contactEmail} />.</P>
        </>,
      },
      {
        id: 'grievance', heading: 'Complaints and Grievance Redressal',
        body: <>
          <P>If you experience a booking issue, payment problem, inaccurate listing, privacy concern or other platform-related problem, you may contact Mediigo through the support and grievance channels published on our website or application.</P>
          <div className="legal-card">
            <p>Company: <strong>Mediigo</strong></p>
            <p>Email: <Mail to={SITE.contactEmail} /></p>
          </div>
          <P>Please include your booking reference, if applicable, and a clear description of your complaint. Avoid sending passwords, payment PINs or unnecessary medical details.</P>
          <P>Mediigo will acknowledge and address complaints within the timelines required by applicable law.</P>
          <P>If the matter remains unresolved, you may pursue any remedies available under Indian law.</P>
        </>,
      },
      {
        id: 'changes', heading: 'Changes to These Terms',
        body: <>
          <P>Mediigo may update these Terms to reflect changes in the platform, its services or applicable legal requirements.</P>
          <P>The updated version will be published on the website or application with a revised date.</P>
          <P>Where required by law, we will provide notice of material changes or obtain any necessary consent.</P>
          <P>Continued use of the relevant services after an update will be subject to applicable law and any acceptance requirements presented to you.</P>
        </>,
      },
      {
        id: 'law', heading: 'Governing Law and Disputes',
        body: <>
          <P>These Terms are governed by the laws of India.</P>
          <P>Any dispute will be handled by a court or other competent forum having jurisdiction under applicable law.</P>
          <P>Nothing in these Terms prevents you from exercising statutory consumer rights or approaching an appropriate consumer dispute-resolution authority.</P>
        </>,
      },
      {
        id: 'contact', heading: 'Contact Information',
        body: <>
          <P>For questions regarding these Terms, bookings or patient services, contact:</P>
          <div className="legal-card">
            <p><strong>Mediigo</strong></p>
            <p>Email: <Mail to={SITE.contactEmail} /></p>
          </div>
        </>,
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
