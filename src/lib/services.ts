// Config-driven service engine: every service (fields, documents, eligibility,
// workflow, SLA) is data. Adding a service = adding an entry here.

export type Bi = { en: string; hi: string };

export type FieldDef = {
  key: string;
  label: Bi;
  type: "text" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: Bi }[];
  // Pre-fill from the citizen's DigiLocker profile
  prefill?: keyof ProfileLike;
  required?: boolean;
};

export type DocType =
  | "aadhaar"
  | "ration_card"
  | "b1_land_record"
  | "school_certificate"
  | "father_caste_certificate"
  | "salary_slip";

export type DocRequirement = {
  type: DocType;
  required: boolean;
  why: Bi;
  // extracted field -> form field it must agree with
  verify: { extracted: string; formField: string; label: Bi }[];
};

export type Rule =
  | { field: "age"; op: ">=" | "<="; value: number }
  | { field: "annualIncome"; op: "<=" | ">="; value: number }
  | { field: "category"; op: "in"; value: string[] }
  | { field: "occupation"; op: "in"; value: string[] }
  | { field: "gender"; op: "in"; value: string[] }
  | { field: "maritalStatus"; op: "in"; value: string[] };

export type ProfileLike = {
  name: string;
  nameHi: string;
  fatherName: string;
  dob: string;
  gender: string;
  address: string;
  village: string;
  tehsil: string;
  district: string;
  category: string;
  occupation: string;
  maritalStatus: string;
  annualIncome: number;
  phone: string;
};

export type Service = {
  slug: string;
  code: string; // used in reference numbers
  name: Bi;
  department: Bi;
  summary: Bi;
  slaDays: number;
  fee: number;
  fullFlow: boolean; // end-to-end AI flow implemented
  popular?: boolean;
  keywords: string[]; // helps discovery (en + hi + transliterated)
  eligibility: Rule[];
  eligibilityText: Bi;
  fields: FieldDef[];
  documents: DocRequirement[];
  stages: ("ai" | "patwari" | "tehsildar")[];
  certificateTitle?: Bi;
};

export const DOC_TYPES: Record<DocType, { label: Bi; keywords: string[] }> = {
  aadhaar: {
    label: { en: "Aadhaar Card", hi: "आधार कार्ड" },
    keywords: ["aadhaar", "आधार", "unique identification", "भारत सरकार", "government of india", "vid"],
  },
  ration_card: {
    label: { en: "Ration Card", hi: "राशन कार्ड" },
    keywords: ["ration", "राशन", "खाद्य", "food", "pds", "परिवार", "मुखिया"],
  },
  b1_land_record: {
    label: { en: "B-1 Land Record (Khasra)", hi: "बी-1 / खसरा" },
    keywords: ["b-1", "b1", "बी-1", "खसरा", "khasra", "भू-अभिलेख", "land record", "रकबा"],
  },
  school_certificate: {
    label: { en: "School / Education Certificate", hi: "शैक्षणिक प्रमाण पत्र" },
    keywords: ["school", "विद्यालय", "marksheet", "अंकसूची", "board", "मंडल", "class", "कक्षा"],
  },
  father_caste_certificate: {
    label: { en: "Father's Caste Certificate", hi: "पिता का जाति प्रमाण पत्र" },
    keywords: ["caste", "जाति", "tribe", "जनजाति", "प्रमाण"],
  },
  salary_slip: {
    label: { en: "Salary Slip / Income Proof", hi: "वेतन पर्ची / आय प्रमाण" },
    keywords: ["salary", "वेतन", "pay slip", "gross", "income"],
  },
};

const DISTRICTS = [
  "Raipur", "Durg", "Bilaspur", "Dhamtari", "Rajnandgaon", "Korba", "Raigarh",
  "Jagdalpur (Bastar)", "Surguja", "Mahasamund", "Kanker", "Janjgir-Champa",
];

export const CG_DISTRICTS = DISTRICTS;

const commonIdentityFields: FieldDef[] = [
  { key: "name", label: { en: "Applicant name", hi: "आवेदक का नाम" }, type: "text", prefill: "name", required: true },
  { key: "fatherName", label: { en: "Father's / Husband's name", hi: "पिता / पति का नाम" }, type: "text", prefill: "fatherName", required: true },
  { key: "dob", label: { en: "Date of birth", hi: "जन्म तिथि" }, type: "date", prefill: "dob", required: true },
  { key: "gender", label: { en: "Gender", hi: "लिंग" }, type: "select", prefill: "gender", required: true, options: [
    { value: "male", label: { en: "Male", hi: "पुरुष" } },
    { value: "female", label: { en: "Female", hi: "महिला" } },
    { value: "other", label: { en: "Other", hi: "अन्य" } },
  ] },
  { key: "mobile", label: { en: "Mobile number", hi: "मोबाइल नंबर" }, type: "text", prefill: "phone", required: true },
  { key: "address", label: { en: "Full address", hi: "पूरा पता" }, type: "textarea", prefill: "address", required: true },
  { key: "village", label: { en: "Village / Ward", hi: "ग्राम / वार्ड" }, type: "text", prefill: "village", required: true },
  { key: "tehsil", label: { en: "Tehsil", hi: "तहसील" }, type: "text", prefill: "tehsil", required: true },
  { key: "district", label: { en: "District", hi: "जिला" }, type: "select", prefill: "district", required: true,
    options: DISTRICTS.map((d) => ({ value: d, label: { en: d, hi: d } })) },
];

const aadhaarDoc: DocRequirement = {
  type: "aadhaar",
  required: true,
  why: { en: "Identity and date of birth proof", hi: "पहचान और जन्म तिथि का प्रमाण" },
  verify: [
    { extracted: "name", formField: "name", label: { en: "Name", hi: "नाम" } },
    { extracted: "dob", formField: "dob", label: { en: "Date of birth", hi: "जन्म तिथि" } },
  ],
};

export const SERVICES: Service[] = [
  {
    slug: "income-certificate",
    code: "INC",
    name: { en: "Income Certificate", hi: "आय प्रमाण पत्र" },
    department: { en: "Revenue & Disaster Management", hi: "राजस्व एवं आपदा प्रबंधन विभाग" },
    summary: {
      en: "Official proof of annual family income, needed for scholarships, fee concessions, pensions and welfare schemes.",
      hi: "वार्षिक पारिवारिक आय का आधिकारिक प्रमाण — छात्रवृत्ति, शुल्क छूट, पेंशन और कल्याण योजनाओं के लिए आवश्यक।",
    },
    slaDays: 7,
    fee: 30,
    fullFlow: true,
    popular: true,
    keywords: ["income", "aay", "aay praman patra", "आय", "आमदनी", "कमाई", "income certificate", "salary", "आय प्रमाण पत्र"],
    eligibility: [],
    eligibilityText: {
      en: "Any resident of Chhattisgarh can apply.",
      hi: "छत्तीसगढ़ का कोई भी निवासी आवेदन कर सकता है।",
    },
    fields: [
      ...commonIdentityFields,
      { key: "occupation", label: { en: "Occupation", hi: "व्यवसाय" }, type: "select", prefill: "occupation", required: true, options: [
        { value: "farmer", label: { en: "Farmer", hi: "किसान" } },
        { value: "labourer", label: { en: "Labourer", hi: "मजदूर" } },
        { value: "salaried", label: { en: "Salaried", hi: "वेतनभोगी" } },
        { value: "business", label: { en: "Business", hi: "व्यवसाय" } },
        { value: "student", label: { en: "Student", hi: "छात्र" } },
        { value: "homemaker", label: { en: "Homemaker", hi: "गृहिणी" } },
      ] },
      { key: "annualIncome", label: { en: "Annual family income (₹)", hi: "वार्षिक पारिवारिक आय (₹)" }, type: "number", prefill: "annualIncome", required: true },
      { key: "purpose", label: { en: "Purpose", hi: "उद्देश्य" }, type: "select", required: true, options: [
        { value: "scholarship", label: { en: "Scholarship", hi: "छात्रवृत्ति" } },
        { value: "scheme", label: { en: "Government scheme", hi: "सरकारी योजना" } },
        { value: "education", label: { en: "School/College admission", hi: "स्कूल/कॉलेज प्रवेश" } },
        { value: "loan", label: { en: "Bank loan", hi: "बैंक ऋण" } },
        { value: "other", label: { en: "Other", hi: "अन्य" } },
      ] },
    ],
    documents: [
      aadhaarDoc,
      {
        type: "ration_card",
        required: true,
        why: { en: "Family and residence proof", hi: "परिवार और निवास का प्रमाण" },
        verify: [
          { extracted: "name", formField: "name", label: { en: "Name", hi: "नाम" } },
          { extracted: "village", formField: "village", label: { en: "Village", hi: "ग्राम" } },
        ],
      },
      {
        type: "b1_land_record",
        required: false,
        why: { en: "Needed if income is from agriculture", hi: "कृषि आय होने पर आवश्यक" },
        verify: [{ extracted: "name", formField: "name", label: { en: "Land owner", hi: "भू-स्वामी" } }],
      },
    ],
    stages: ["ai", "patwari", "tehsildar"],
    certificateTitle: { en: "Income Certificate", hi: "आय प्रमाण पत्र" },
  },
  {
    slug: "caste-certificate",
    code: "CST",
    name: { en: "Caste Certificate (SC/ST/OBC)", hi: "जाति प्रमाण पत्र" },
    department: { en: "Revenue & Disaster Management", hi: "राजस्व एवं आपदा प्रबंधन विभाग" },
    summary: {
      en: "Permanent certificate of SC/ST/OBC status for reservation in education, jobs and welfare schemes.",
      hi: "शिक्षा, नौकरी और कल्याण योजनाओं में आरक्षण हेतु अनुसूचित जाति/जनजाति/पिछड़ा वर्ग का स्थायी प्रमाण पत्र।",
    },
    slaDays: 15,
    fee: 30,
    fullFlow: true,
    popular: true,
    keywords: ["caste", "jati", "जाति", "sc", "st", "obc", "reservation", "आरक्षण", "जनजाति", "jati praman patra"],
    eligibility: [{ field: "category", op: "in", value: ["SC", "ST", "OBC"] }],
    eligibilityText: {
      en: "Residents belonging to a notified SC, ST or OBC community of Chhattisgarh.",
      hi: "छत्तीसगढ़ के अधिसूचित अनुसूचित जाति, जनजाति या पिछड़ा वर्ग समुदाय के निवासी।",
    },
    fields: [
      ...commonIdentityFields,
      { key: "category", label: { en: "Category", hi: "वर्ग" }, type: "select", prefill: "category", required: true, options: [
        { value: "SC", label: { en: "Scheduled Caste (SC)", hi: "अनुसूचित जाति" } },
        { value: "ST", label: { en: "Scheduled Tribe (ST)", hi: "अनुसूचित जनजाति" } },
        { value: "OBC", label: { en: "Other Backward Class (OBC)", hi: "अन्य पिछड़ा वर्ग" } },
      ] },
      { key: "casteName", label: { en: "Caste / Tribe name", hi: "जाति / जनजाति का नाम" }, type: "text", required: true },
    ],
    documents: [
      aadhaarDoc,
      {
        type: "father_caste_certificate",
        required: true,
        why: { en: "Proof of caste lineage", hi: "जाति वंशावली का प्रमाण" },
        verify: [{ extracted: "caste", formField: "casteName", label: { en: "Caste", hi: "जाति" } }],
      },
      {
        type: "school_certificate",
        required: false,
        why: { en: "Supports residence and caste record", hi: "निवास और जाति अभिलेख का समर्थन" },
        verify: [{ extracted: "name", formField: "name", label: { en: "Name", hi: "नाम" } }],
      },
    ],
    stages: ["ai", "patwari", "tehsildar"],
    certificateTitle: { en: "Caste Certificate", hi: "जाति प्रमाण पत्र" },
  },
  {
    slug: "domicile-certificate",
    code: "DOM",
    name: { en: "Domicile Certificate (Mool Niwas)", hi: "मूल निवास प्रमाण पत्र" },
    department: { en: "Revenue & Disaster Management", hi: "राजस्व एवं आपदा प्रबंधन विभाग" },
    summary: {
      en: "Proof that you are a permanent resident of Chhattisgarh — needed for state jobs, admissions and domicile quotas.",
      hi: "छत्तीसगढ़ के स्थायी निवासी होने का प्रमाण — राज्य की नौकरियों, प्रवेश और स्थानीय कोटे के लिए आवश्यक।",
    },
    slaDays: 7,
    fee: 30,
    fullFlow: true,
    popular: true,
    keywords: ["domicile", "mool niwas", "residence", "niwas", "निवास", "मूल निवास", "resident", "local"],
    eligibility: [],
    eligibilityText: {
      en: "Residents living in Chhattisgarh for 15+ years, or born in the state.",
      hi: "15 वर्ष या अधिक से छत्तीसगढ़ में निवासरत, या राज्य में जन्मे निवासी।",
    },
    fields: [
      ...commonIdentityFields,
      { key: "yearsResident", label: { en: "Years living in Chhattisgarh", hi: "छत्तीसगढ़ में निवास के वर्ष" }, type: "number", required: true },
    ],
    documents: [
      aadhaarDoc,
      {
        type: "school_certificate",
        required: true,
        why: { en: "Education in the state (Class 5/8 or higher)", hi: "राज्य में शिक्षा (कक्षा 5/8 या उच्च)" },
        verify: [{ extracted: "name", formField: "name", label: { en: "Name", hi: "नाम" } }],
      },
      {
        type: "b1_land_record",
        required: false,
        why: { en: "Current year B-1 as residence proof", hi: "निवास प्रमाण हेतु चालू वर्ष का बी-1" },
        verify: [{ extracted: "name", formField: "name", label: { en: "Land owner", hi: "भू-स्वामी" } }],
      },
    ],
    stages: ["ai", "patwari", "tehsildar"],
    certificateTitle: { en: "Domicile Certificate", hi: "मूल निवास प्रमाण पत्र" },
  },
  // ---- Catalog services (discovery, eligibility & recommendations) ----
  catalog("post-matric-scholarship", "SCH", { en: "Post-Matric Scholarship", hi: "पोस्ट मैट्रिक छात्रवृत्ति" },
    { en: "Tribal & Scheduled Caste Development", hi: "आदिम जाति एवं अनुसूचित जाति विकास विभाग" },
    { en: "Scholarship for SC/ST/OBC students studying beyond Class 10 with family income up to ₹2.5 lakh.", hi: "कक्षा 10 के बाद पढ़ रहे अनुसूचित जाति/जनजाति/पिछड़ा वर्ग के छात्रों हेतु छात्रवृत्ति, पारिवारिक आय ₹2.5 लाख तक।" },
    30, 0, ["scholarship", "छात्रवृत्ति", "chhatravritti", "student", "fees", "पढ़ाई"],
    [{ field: "category", op: "in", value: ["SC", "ST", "OBC"] }, { field: "annualIncome", op: "<=", value: 250000 }, { field: "occupation", op: "in", value: ["student"] }],
    { en: "SC/ST/OBC students, family income ≤ ₹2.5 lakh.", hi: "अनु.जाति/जनजाति/पि.वर्ग छात्र, पारिवारिक आय ≤ ₹2.5 लाख।" }, true),
  catalog("old-age-pension", "OAP", { en: "Old Age Pension (Indira Gandhi NOAPS)", hi: "वृद्धावस्था पेंशन" },
    { en: "Social Welfare", hi: "समाज कल्याण विभाग" },
    { en: "Monthly pension for citizens aged 60+ from BPL households.", hi: "गरीबी रेखा से नीचे के परिवारों के 60+ आयु के नागरिकों हेतु मासिक पेंशन।" },
    30, 0, ["pension", "पेंशन", "old age", "वृद्धावस्था", "buzurg", "बुजुर्ग"],
    [{ field: "age", op: ">=", value: 60 }, { field: "annualIncome", op: "<=", value: 100000 }],
    { en: "Age 60+, BPL household.", hi: "आयु 60+, बीपीएल परिवार।" }, true),
  catalog("widow-pension", "WDP", { en: "Widow Pension", hi: "विधवा पेंशन" },
    { en: "Social Welfare", hi: "समाज कल्याण विभाग" },
    { en: "Monthly pension for widows aged 18+ from BPL households.", hi: "बीपीएल परिवारों की 18+ आयु की विधवाओं हेतु मासिक पेंशन।" },
    30, 0, ["widow", "विधवा", "pension", "पेंशन"],
    [{ field: "gender", op: "in", value: ["female"] }, { field: "maritalStatus", op: "in", value: ["widowed"] }, { field: "age", op: ">=", value: 18 }, { field: "annualIncome", op: "<=", value: 100000 }],
    { en: "Widowed women 18+, BPL household.", hi: "18+ आयु की विधवा महिलाएं, बीपीएल परिवार।" }),
  catalog("kisan-registration", "KSN", { en: "Farmer Registration (Paddy Procurement)", hi: "किसान पंजीयन (धान खरीदी)" },
    { en: "Food, Civil Supplies & Agriculture", hi: "खाद्य, नागरिक आपूर्ति एवं कृषि विभाग" },
    { en: "Register to sell paddy at MSP at cooperative societies and get input assistance.", hi: "सहकारी समितियों में समर्थन मूल्य पर धान बेचने और आदान सहायता हेतु पंजीयन।" },
    15, 0, ["kisan", "किसान", "farmer", "paddy", "धान", "dhan", "MSP", "खेती"],
    [{ field: "occupation", op: "in", value: ["farmer"] }],
    { en: "Farmers owning or cultivating land in Chhattisgarh.", hi: "छत्तीसगढ़ में भूमि धारक या खेती करने वाले किसान।" }, true),
  catalog("labour-card", "LBR", { en: "Construction Worker Registration (Labour Card)", hi: "श्रमिक पंजीयन (श्रम कार्ड)" },
    { en: "Labour", hi: "श्रम विभाग" },
    { en: "Register as a construction/unorganised worker to access welfare, insurance and education aid.", hi: "कल्याण, बीमा और शिक्षा सहायता के लिए निर्माण/असंगठित श्रमिक पंजीयन।" },
    15, 0, ["labour", "श्रमिक", "mazdoor", "मजदूर", "shramik", "labour card"],
    [{ field: "occupation", op: "in", value: ["labourer"] }, { field: "age", op: ">=", value: 18 }],
    { en: "Workers aged 18–60 in construction/unorganised sector.", hi: "निर्माण/असंगठित क्षेत्र के 18–60 आयु के श्रमिक।" }),
  catalog("ration-card", "RTN", { en: "New Ration Card", hi: "नया राशन कार्ड" },
    { en: "Food, Civil Supplies & Consumer Protection", hi: "खाद्य, नागरिक आपूर्ति एवं उपभोक्ता संरक्षण विभाग" },
    { en: "Apply for a new household ration card under the Chhattisgarh Food Security Act.", hi: "छत्तीसगढ़ खाद्य सुरक्षा अधिनियम के अंतर्गत नए राशन कार्ड हेतु आवेदन।" },
    30, 0, ["ration", "राशन", "food", "अनाज", "chawal", "चावल"], [],
    { en: "Households without an existing ration card.", hi: "जिन परिवारों के पास राशन कार्ड नहीं है।" }),
  catalog("birth-certificate", "BRT", { en: "Birth Certificate", hi: "जन्म प्रमाण पत्र" },
    { en: "Health & Urban Administration", hi: "स्वास्थ्य एवं नगरीय प्रशासन विभाग" },
    { en: "Registration and certificate of birth.", hi: "जन्म का पंजीयन और प्रमाण पत्र।" },
    7, 0, ["birth", "जन्म", "janm", "baby", "बच्चा"], [],
    { en: "Births in Chhattisgarh.", hi: "छत्तीसगढ़ में हुए जन्म।" }),
  catalog("death-certificate", "DTH", { en: "Death Certificate", hi: "मृत्यु प्रमाण पत्र" },
    { en: "Health & Urban Administration", hi: "स्वास्थ्य एवं नगरीय प्रशासन विभाग" },
    { en: "Registration and certificate of death.", hi: "मृत्यु का पंजीयन और प्रमाण पत्र।" },
    7, 0, ["death", "मृत्यु", "mrityu"], [],
    { en: "Deaths in Chhattisgarh.", hi: "छत्तीसगढ़ में हुई मृत्यु।" }),
  catalog("marriage-registration", "MRG", { en: "Marriage Registration", hi: "विवाह पंजीयन" },
    { en: "Revenue & Disaster Management", hi: "राजस्व एवं आपदा प्रबंधन विभाग" },
    { en: "Register a marriage and get a marriage certificate.", hi: "विवाह पंजीयन और विवाह प्रमाण पत्र।" },
    15, 50, ["marriage", "विवाह", "shaadi", "शादी"], [{ field: "age", op: ">=", value: 18 }],
    { en: "Married couples (bride 18+, groom 21+).", hi: "विवाहित दंपति (वधु 18+, वर 21+)।" }),
  catalog("land-record-copy", "LRC", { en: "B-1 / Khasra Copy", hi: "बी-1 / खसरा नकल" },
    { en: "Revenue & Disaster Management", hi: "राजस्व एवं आपदा प्रबंधन विभाग" },
    { en: "Certified copy of land records (B-1, Khasra, map).", hi: "भू-अभिलेख (बी-1, खसरा, नक्शा) की प्रमाणित प्रति।" },
    3, 30, ["khasra", "खसरा", "b1", "बी-1", "land", "जमीन", "zameen", "bhuiyan", "भुइयां"], [],
    { en: "Land owners and interested parties.", hi: "भू-स्वामी एवं संबंधित पक्ष।" }),
  catalog("ews-certificate", "EWS", { en: "EWS Certificate", hi: "ईडब्ल्यूएस प्रमाण पत्र" },
    { en: "Revenue & Disaster Management", hi: "राजस्व एवं आपदा प्रबंधन विभाग" },
    { en: "Economically Weaker Section certificate for 10% reservation (General category, income < ₹8 lakh).", hi: "10% आरक्षण हेतु आर्थिक रूप से कमजोर वर्ग प्रमाण पत्र (सामान्य वर्ग, आय < ₹8 लाख)।" },
    15, 30, ["ews", "economically weaker", "आर्थिक", "गरीब", "general"],
    [{ field: "category", op: "in", value: ["GEN"] }, { field: "annualIncome", op: "<=", value: 800000 }],
    { en: "General category, family income < ₹8 lakh.", hi: "सामान्य वर्ग, पारिवारिक आय < ₹8 लाख।" }, true),
  catalog("disability-certificate", "DIS", { en: "Disability Certificate (UDID)", hi: "दिव्यांग प्रमाण पत्र (UDID)" },
    { en: "Social Welfare & Health", hi: "समाज कल्याण एवं स्वास्थ्य विभाग" },
    { en: "Certificate and UDID card for persons with disabilities.", hi: "दिव्यांगजनों हेतु प्रमाण पत्र और UDID कार्ड।" },
    30, 0, ["disability", "दिव्यांग", "viklang", "udid", "handicap"], [],
    { en: "Persons with 40%+ benchmark disability.", hi: "40%+ दिव्यांगता वाले व्यक्ति।" }),
  catalog("mahtari-vandan", "MVY", { en: "Mahtari Vandan Yojana", hi: "महतारी वंदन योजना" },
    { en: "Women & Child Development", hi: "महिला एवं बाल विकास विभाग" },
    { en: "Monthly financial assistance for married women aged 21+.", hi: "21+ आयु की विवाहित महिलाओं को मासिक आर्थिक सहायता।" },
    30, 0, ["mahtari", "महतारी", "women", "महिला", "vandan", "वंदन"],
    [{ field: "gender", op: "in", value: ["female"] }, { field: "maritalStatus", op: "in", value: ["married", "widowed", "divorced"] }, { field: "age", op: ">=", value: 21 }],
    { en: "Married/widowed/divorced women aged 21+ resident in Chhattisgarh.", hi: "छत्तीसगढ़ की 21+ आयु की विवाहित/विधवा/परित्यक्ता महिलाएं।" }, true),
  catalog("trade-licence", "TRD", { en: "Trade Licence", hi: "व्यापार अनुज्ञप्ति" },
    { en: "Urban Administration", hi: "नगरीय प्रशासन विभाग" },
    { en: "Licence to run a shop or business within municipal limits.", hi: "नगरीय सीमा में दुकान या व्यवसाय हेतु अनुज्ञप्ति।" },
    15, 200, ["trade", "licence", "license", "shop", "दुकान", "व्यापार", "business"],
    [{ field: "age", op: ">=", value: 18 }],
    { en: "Business owners in urban areas.", hi: "नगरीय क्षेत्र के व्यवसायी।" }),
];

function catalog(
  slug: string, code: string, name: Bi, department: Bi, summary: Bi, slaDays: number, fee: number,
  keywords: string[], eligibility: Rule[], eligibilityText: Bi, popular = false,
): Service {
  return {
    slug, code, name, department, summary, slaDays, fee, keywords, eligibility, eligibilityText,
    popular, fullFlow: false, fields: [], documents: [], stages: ["tehsildar"],
  };
}

export function getService(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}

export function ageFromDob(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export type EligibilityResult = { eligible: boolean; reasons: Bi[] };

export function checkEligibility(service: Service, p: ProfileLike): EligibilityResult {
  const reasons: Bi[] = [];
  let eligible = true;
  const age = ageFromDob(p.dob);
  for (const r of service.eligibility) {
    let ok = true;
    let reason: Bi;
    switch (r.field) {
      case "age":
        ok = r.op === ">=" ? age >= r.value : age <= r.value;
        reason = { en: `Age ${age} (needs ${r.op} ${r.value})`, hi: `आयु ${age} (आवश्यक ${r.op} ${r.value})` };
        break;
      case "annualIncome":
        ok = r.op === "<=" ? p.annualIncome <= r.value : p.annualIncome >= r.value;
        reason = {
          en: `Income ₹${p.annualIncome.toLocaleString("en-IN")} (limit ${r.op} ₹${r.value.toLocaleString("en-IN")})`,
          hi: `आय ₹${p.annualIncome.toLocaleString("en-IN")} (सीमा ${r.op} ₹${r.value.toLocaleString("en-IN")})`,
        };
        break;
      case "category":
        ok = r.value.includes(p.category);
        reason = { en: `Category ${p.category} (allowed: ${r.value.join("/")})`, hi: `वर्ग ${p.category} (पात्र: ${r.value.join("/")})` };
        break;
      case "occupation":
        ok = r.value.includes(p.occupation);
        reason = { en: `Occupation: ${p.occupation} (needs ${r.value.join("/")})`, hi: `व्यवसाय: ${p.occupation} (आवश्यक ${r.value.join("/")})` };
        break;
      case "gender":
        ok = r.value.includes(p.gender);
        reason = { en: `Gender: ${p.gender}`, hi: `लिंग: ${p.gender}` };
        break;
      case "maritalStatus":
        ok = r.value.includes(p.maritalStatus);
        reason = { en: `Marital status: ${p.maritalStatus}`, hi: `वैवाहिक स्थिति: ${p.maritalStatus}` };
        break;
    }
    if (!ok) eligible = false;
    reasons.push({ en: `${ok ? "✓" : "✗"} ${reason.en}`, hi: `${ok ? "✓" : "✗"} ${reason.hi}` });
  }
  return { eligible, reasons };
}

/** Services the citizen is eligible for (with at least one targeting rule) but hasn't applied to. */
export function recommendFor(p: ProfileLike, appliedSlugs: string[]) {
  return SERVICES.filter(
    (s) => s.eligibility.length > 0 && !appliedSlugs.includes(s.slug) && checkEligibility(s, p).eligible,
  );
}
