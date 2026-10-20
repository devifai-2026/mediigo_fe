/**
 * Sample profile content for the doctor detail page, used in demos while the
 * backend has no about / conditions / memberships / awards / reviews fields.
 *
 * Only active when VITE_DEMO_PROFILES=true. It invents credentials and patient
 * reviews, so it must never reach a real patient: a fabricated award next to a
 * real, bookable doctor's name is a claim nobody made. Real fields from the API
 * always win over anything here, field by field.
 */
export const demoProfilesEnabled = () => import.meta.env.VITE_DEMO_PROFILES === 'true';

const BY_SPECIALTY = {
  'General Medicine': {
    conditions: ['Fever', 'Diabetes', 'Hypertension', 'Thyroid Disorders', 'Asthma', 'Typhoid', 'Dengue', 'Malaria', 'Acidity & GERD', 'Migraine', 'Anaemia', 'Urinary Tract Infection', 'Viral Infections', 'High Cholesterol', 'Vitamin Deficiency', 'Allergies', 'Jaundice', 'Chronic Fatigue', 'Respiratory Infections', 'Obesity'],
    procedures: ['Health Check-up', 'ECG', 'Nebulisation', 'IV Fluid Therapy', 'Vaccination (Adult)'],
    memberships: ['Association of Physicians of India (API), Life Member', 'Indian Medical Association (IMA), Member', 'Research Society for the Study of Diabetes in India (RSSDI), Member', 'Hypertension Society of India, Member'],
    trainings: ['ACLS — Advanced Cardiac Life Support', 'BLS — Basic Life Support', 'Certificate Course in Diabetes Management', 'Certificate in Evidence-Based Medicine'],
    awards: ['Best Physician Award, Pune Medical Forum', 'Excellence in Community Health Service, IMA Pune'],
  },
  Pediatrics: {
    conditions: ['Measles', 'Rotavirus', 'Pediatric Vaccinations', 'Newborn Jaundice', 'Mumps', 'Pertussis', 'Painful Teething', 'Polio', 'ADHD', 'Parent Counseling', 'Pre-term Growth & Development', 'RSV', 'Neonatal Hypoglycemia', 'Childhood Asthma', 'Malnutrition', 'Recurrent Cough & Cold', 'Diarrhoea', 'Ear Infections', 'Bedwetting', 'Food Allergies'],
    procedures: ['Childhood Immunisation', 'Newborn Screening', 'Growth & Development Assessment', 'Nebulisation'],
    memberships: ['Indian Academy of Paediatrics (IAP), Life Member', 'National Neonatology Forum (NNF), Member', 'Intensive Care Chapter — Indian Academy of Paediatrics, Life Member', 'Indian Medical Association (IMA), Member'],
    trainings: ['PALS — Paediatric Advanced Life Support', 'NRP — Neonatal Resuscitation Program', 'IAP Certificate Course in Developmental Paediatrics', 'Certificate in Infant & Young Child Feeding'],
    awards: ['Young Paediatrician Award, IAP Maharashtra', 'Best Paper Award, State Paediatrics Conference'],
  },
  Dermatology: {
    conditions: ['Acne', 'Eczema', 'Psoriasis', 'Hair Fall', 'Dandruff', 'Fungal Infections', 'Vitiligo', 'Pigmentation', 'Melasma', 'Urticaria', 'Warts', 'Skin Allergies', 'Rosacea', 'Nail Disorders', 'Scabies', 'Dark Circles', 'Acne Scars', 'Alopecia Areata'],
    procedures: ['Chemical Peel', 'Laser Hair Reduction', 'PRP for Hair Loss', 'Mole & Wart Removal', 'Microdermabrasion', 'Acne Scar Treatment'],
    memberships: ['Indian Association of Dermatologists, Venereologists and Leprologists (IADVL), Life Member', 'Association of Cutaneous Surgeons of India (ACSI), Member', 'Cosmetology Society of India, Member'],
    trainings: ['Fellowship in Aesthetic Dermatology', 'Certificate Course in Lasers in Dermatology', 'Hands-on Training in Dermatosurgery'],
    awards: ['Best Poster Award, DERMACON', 'Young Dermatologist Award, IADVL Maharashtra'],
  },
  Gynecology: {
    conditions: ['PCOS / PCOD', 'Irregular Periods', 'Pregnancy Care', 'Infertility', 'Endometriosis', 'Fibroids', 'Menopause', 'Ovarian Cysts', 'Vaginal Infections', 'Heavy Menstrual Bleeding', 'High-risk Pregnancy', 'Contraception Counselling', 'Pelvic Pain', 'Gestational Diabetes', 'Pre-pregnancy Counselling'],
    procedures: ['Normal Delivery', 'Caesarean Section', 'Laparoscopy', 'Hysteroscopy', 'Pap Smear', 'IUD Insertion'],
    memberships: ['Federation of Obstetric and Gynaecological Societies of India (FOGSI), Life Member', 'Pune Obstetric and Gynaecological Society (POGS), Member', 'Indian Society for Assisted Reproduction (ISAR), Member'],
    trainings: ['Certificate in Minimal Access Gynaecological Surgery', 'FOGSI Certificate in Infertility Management', 'Training in Colposcopy'],
    awards: ['Best Obstetrician Award, POGS', 'Excellence in Maternal Health, Pune Medical Forum'],
  },
  Cardiology: {
    conditions: ['Chest Pain', 'Hypertension', 'Coronary Artery Disease', 'Heart Failure', 'Arrhythmia', 'Palpitations', 'High Cholesterol', 'Valvular Heart Disease', 'Breathlessness', 'Post-MI Care'],
    procedures: ['ECG', '2D Echocardiography', 'Treadmill Test (TMT)', 'Holter Monitoring', 'Angiography', 'Angioplasty'],
    memberships: ['Cardiological Society of India (CSI), Life Member', 'Indian College of Cardiology, Member', 'Indian Medical Association (IMA), Member'],
    trainings: ['ACLS — Advanced Cardiac Life Support', 'Fellowship in Interventional Cardiology', 'Certificate in Echocardiography'],
    awards: ['Young Cardiologist Award, CSI Maharashtra'],
  },
  Dentistry: {
    conditions: ['Tooth Decay', 'Gum Disease', 'Tooth Sensitivity', 'Bad Breath', 'Misaligned Teeth', 'Wisdom Tooth Pain', 'Broken Tooth', 'Mouth Ulcers', 'Missing Teeth', 'Teeth Staining'],
    procedures: ['Root Canal Treatment', 'Dental Implants', 'Teeth Cleaning & Scaling', 'Braces & Aligners', 'Tooth Extraction', 'Crowns & Bridges', 'Teeth Whitening'],
    memberships: ['Indian Dental Association (IDA), Life Member', 'Indian Society of Periodontology, Member'],
    trainings: ['Certificate Course in Implantology', 'Advanced Endodontics Training', 'Clear Aligner Certification'],
    awards: ['Best Clinical Case Presentation, IDA Pune'],
  },
  ENT: {
    conditions: ['Sinusitis', 'Tonsillitis', 'Ear Infection', 'Hearing Loss', 'Vertigo', 'Nasal Allergy', 'Snoring', 'Deviated Septum', 'Tinnitus', 'Voice Disorders'],
    procedures: ['Tonsillectomy', 'Septoplasty', 'FESS (Sinus Surgery)', 'Ear Wax Removal', 'Audiometry', 'Tympanoplasty'],
    memberships: ['Association of Otolaryngologists of India (AOI), Life Member', 'Indian Medical Association (IMA), Member'],
    trainings: ['Fellowship in Endoscopic Sinus Surgery', 'Certificate Course in Otology'],
    awards: ['Best Paper Award, AOI Maharashtra'],
  },
  Orthopedics: {
    conditions: ['Back Pain', 'Knee Pain', 'Arthritis', 'Fractures', 'Frozen Shoulder', 'Sports Injuries', 'Slip Disc', 'Osteoporosis', 'Sciatica', 'Ligament Tear', 'Neck Pain', 'Gout'],
    procedures: ['Knee Replacement', 'Hip Replacement', 'Arthroscopy', 'Fracture Fixation', 'ACL Reconstruction', 'Joint Injections'],
    memberships: ['Indian Orthopaedic Association (IOA), Life Member', 'Maharashtra Orthopaedic Association, Member'],
    trainings: ['Fellowship in Joint Replacement', 'AO Trauma Course', 'Certificate in Arthroscopy'],
    awards: ['Best Orthopaedic Surgeon Award, Pune Medical Forum'],
  },
};

const COLLEGES = [
  'B.J. Government Medical College, Pune',
  'Seth G.S. Medical College & KEM Hospital, Mumbai',
  'Armed Forces Medical College, Pune',
  'Grant Government Medical College, Mumbai',
  'Bharati Vidyapeeth Medical College, Pune',
];

const REVIEWERS = ['Nisar Ahmad', 'Peter Fernandes', 'Saroj Bhalerao', 'Rachel Cardoz', 'Vinay Thakur', 'Pooja Kulkarni', 'Amit Deshpande', 'Sneha Patil', 'Rahul Joshi', 'Kavita Pawar'];

const REVIEWS = [
  ['It was very nice and excellent, beyond our expectations. A very humble, kind and experienced doctor.', 'A doctor who truly cares', 5],
  ['The experience was good. The diagnosis and the medication prescribed show real excellence in the work.', 'Doctor was friendly', 5],
  ['Very helpful and supportive. Explained everything patiently and the clinic staff treated us well. Really grateful.', 'Gratitude for compassionate care', 5],
  ['Listens to your worries and gives treatment on the spot along with clear advice for the future. Very happy we found the right doctor.', 'Amazing experience with the doctor', 4],
  ['Explains the cause of the illness very well and prescribes only the medicines that are needed.', 'Tailored treatment, smooth recovery', 5],
  ['The token system meant we hardly waited. The doctor was thorough and unhurried.', 'Minimal waiting time', 4],
];

/**
 * Generic clinic photos for demos, from Wikimedia Commons under CC0 / CC BY /
 * CC BY-SA. Chosen to carry no other business's name or signage — a real
 * clinic's branding on a Mediigo clinic's page would mislead. The licences
 * require credit, which the gallery shows in its viewer.
 */
const WM = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';
const credit = (author, license, file) => ({ author, license, sourceUrl: `https://commons.wikimedia.org/wiki/File:${file}` });
export const DEMO_CLINIC_PHOTOS = [
  { kind: 'OUTSIDE', caption: 'Clinic building', url: `${WM}/7/77/Academic_City_University_health_clinic_exterior_building.jpg/1280px-Academic_City_University_health_clinic_exterior_building.jpg`, credit: credit('Afrank4436', 'CC BY-SA 4.0', 'Academic_City_University_health_clinic_exterior_building.jpg') },
  { kind: 'INSIDE', caption: 'Consultation room', url: `${WM}/3/3a/Modern_medical_examination_room.jpg/1280px-Modern_medical_examination_room.jpg`, credit: credit('Shixart1985', 'CC BY 2.0', 'Modern_medical_examination_room.jpg') },
  { kind: 'INSIDE', caption: 'Waiting area', url: `${WM}/f/f9/A_waiting_room_at_a_medical_healthcare_clinic%2C_doctor%27s_office%2C_hospital.jpg/1280px-A_waiting_room_at_a_medical_healthcare_clinic%2C_doctor%27s_office%2C_hospital.jpg`, credit: credit('Harrison Keely', 'CC BY 4.0', 'A_waiting_room_at_a_medical_healthcare_clinic,_doctor%27s_office,_hospital.jpg') },
  { kind: 'OUTSIDE', caption: 'Main entrance', url: `${WM}/f/f5/Clinic_Entrance_PC010056.jpg/1280px-Clinic_Entrance_PC010056.jpg`, credit: credit('Chris Light', 'CC BY-SA 4.0', 'Clinic_Entrance_PC010056.jpg') },
  { kind: 'INSIDE', caption: 'Examination room', url: `${WM}/8/83/A_typical_examination_room_and_exam_table_in_a_doctor%27s_office._01.jpg/1280px-A_typical_examination_room_and_exam_table_in_a_doctor%27s_office._01.jpg`, credit: credit('Harrison Keely', 'CC BY 4.0', 'A_typical_examination_room_and_exam_table_in_a_doctor%27s_office._01.jpg') },
  { kind: 'INSIDE', caption: 'Corridor to the chambers', url: `${WM}/6/6d/Corridor_on_the_second_level_-_N%C3%84L_hospital_1.jpg/1280px-Corridor_on_the_second_level_-_N%C3%84L_hospital_1.jpg`, credit: credit('W.carter', 'CC0', 'Corridor_on_the_second_level_-_N%C3%84L_hospital_1.jpg') },
  { kind: 'OUTSIDE', caption: 'Covered walkway to the OPD', url: `${WM}/a/af/Outpatient_clinics_of_Edith_Wolfson_Medical_Center%2C_February_2024_01.jpg/1280px-Outpatient_clinics_of_Edith_Wolfson_Medical_Center%2C_February_2024_01.jpg`, credit: credit('Chenspec', 'CC BY-SA 4.0', 'Outpatient_clinics_of_Edith_Wolfson_Medical_Center,_February_2024_01.jpg') },
  { kind: 'INSIDE', caption: 'Consulting room', url: `${WM}/f/f6/Hospital_Consulting_room.jpg/1280px-Hospital_Consulting_room.jpg`, credit: credit('Beendy234', 'CC0', 'Hospital_Consulting_room.jpg') },
];

// Stable per doctor, so a refresh does not reshuffle their "profile".
const seedOf = (id) => {
  let h = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export function demoProfileFor(doctor, doctorId) {
  const seed = seedOf(doctorId);
  const spec = BY_SPECIALTY[doctor.specialty] || BY_SPECIALTY['General Medicine'];
  const years = 6 + (seed % 17);
  const graduated = 2026 - years - 2;
  const college = COLLEGES[seed % COLLEGES.length];
  const pg = COLLEGES[(seed + 2) % COLLEGES.length];
  const quals = doctor.qualifications?.length ? doctor.qualifications : ['MBBS'];

  const education = quals.map((q, i) => ({
    degree: q,
    institution: i === 0 ? college : pg,
    year: graduated + i * 3,
  }));

  const reviewCount = 4 + (seed % 3);
  const reviews = Array.from({ length: reviewCount }, (_, i) => {
    const [comment, tag, rating] = REVIEWS[(seed + i) % REVIEWS.length];
    return {
      id: `demo-${i}`,
      patientName: REVIEWERS[(seed + i * 3) % REVIEWERS.length],
      rating,
      comment,
      tag,
      createdAt: new Date(Date.now() - (60 + ((seed >> i) % 900)) * 86400000).toISOString(),
    };
  });
  const average = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;

  return {
    experienceYears: years,
    clinicPhotos: DEMO_CLINIC_PHOTOS,
    conditionsTreated: spec.conditions,
    proceduresPerformed: spec.procedures,
    education,
    memberships: spec.memberships,
    trainings: spec.trainings,
    awards: spec.awards.map((a, i) => `${a} ${2016 + ((seed + i) % 9)}`),
    publications: [
      `Clinical profile and outcomes of common ${doctor.specialty?.toLowerCase() || 'outpatient'} presentations in an urban OPD — ${doctor.name?.replace(/^Dr\.?\s*/, '')} et al. Indian Journal of Clinical Practice, ${2018 + (seed % 6)}.`,
      `Patient adherence to follow-up in a token-based OPD: an observational study — ${doctor.name?.replace(/^Dr\.?\s*/, '')} et al. Journal of Community Health, ${2017 + (seed % 7)}.`,
    ],
    reviews: {
      summary: { average, count: 40 + (seed % 160), recommendPct: 90 + (seed % 9) },
      items: reviews,
    },
  };
}
