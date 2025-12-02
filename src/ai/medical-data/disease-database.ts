/**
 * Disease Database with Symptom Relevance Maps
 * Each disease has symptom_relevance_map: { symptom_name: relevance_factor (0-1) }
 */

export interface DiseaseData {
  name: string;
  cluster: string[];
  symptom_relevance_map: Record<string, number>; // symptom -> relevance (0-1)
  description: string;
  webmd_search_term: string;
}

export const DISEASE_DATABASE: DiseaseData[] = [
  // Autoimmune Diseases
  {
    name: "Systemic Lupus Erythematosus (SLE)",
    cluster: ["autoimmune"],
    symptom_relevance_map: {
      "fever": 0.7,
      "fatigue": 0.8,
      "joint pain": 0.8,
      "rash": 0.7,
      "chest pain": 0.6,
      "hair loss": 0.6,
      "mouth sores": 0.5,
    },
    description: "Autoimmune disease causing inflammation throughout the body, often with joint pain, skin rashes, and fatigue.",
    webmd_search_term: "lupus",
  },
  {
    name: "Rheumatoid Arthritis",
    cluster: ["autoimmune"],
    symptom_relevance_map: {
      "joint pain": 0.9,
      "morning stiffness": 0.8,
      "fatigue": 0.7,
      "swollen joints": 0.9,
      "fever": 0.4,
    },
    description: "Chronic autoimmune condition causing joint inflammation, pain, and stiffness, especially in the morning.",
    webmd_search_term: "rheumatoid arthritis",
  },
  {
    name: "Adult-Onset Still's Disease (AOSD)",
    cluster: ["autoimmune"],
    symptom_relevance_map: {
      "fever": 0.9,
      "joint pain": 0.8,
      "rash": 0.7,
      "sore throat": 0.6,
      "fatigue": 0.8,
      "muscle pain": 0.7,
      "migratory joint pain": 0.8,
      "transient rash": 0.7,
    },
    description: "Rare inflammatory condition with high fevers, joint pain, and a characteristic salmon-colored rash.",
    webmd_search_term: "adult still disease",
  },
  {
    name: "Sjögren's Syndrome",
    cluster: ["autoimmune"],
    symptom_relevance_map: {
      "dry eyes": 0.9,
      "dry mouth": 0.9,
      "fatigue": 0.7,
      "joint pain": 0.6,
      "numbness": 0.5,
      "vision problems": 0.6,
    },
    description: "Autoimmune disorder causing dry eyes and mouth, often with fatigue and joint pain.",
    webmd_search_term: "sjogren syndrome",
  },
  {
    name: "Systemic Vasculitis",
    cluster: ["autoimmune"],
    symptom_relevance_map: {
      "fever": 0.7,
      "fatigue": 0.7,
      "joint pain": 0.6,
      "rash": 0.7,
      "weight loss": 0.6,
      "night sweats": 0.5,
      "numbness": 0.5,
    },
    description: "Inflammation of blood vessels causing various symptoms depending on affected organs.",
    webmd_search_term: "vasculitis",
  },
  {
    name: "Sarcoidosis",
    cluster: ["autoimmune"],
    symptom_relevance_map: {
      "shortness of breath": 0.7,
      "cough": 0.6,
      "fatigue": 0.7,
      "swollen glands": 0.6,
      "rash": 0.5,
      "joint pain": 0.5,
      "vision problems": 0.4,
    },
    description: "Inflammatory disease causing small clusters of inflammatory cells in various organs.",
    webmd_search_term: "sarcoidosis",
  },
  
  // Neurologic Diseases
  {
    name: "Multiple Sclerosis (MS)",
    cluster: ["neurologic"],
    symptom_relevance_map: {
      "numbness": 0.8,
      "tingling": 0.8,
      "vision problems": 0.8,
      "blurred vision": 0.7,
      "double vision": 0.7,
      "weakness": 0.7,
      "dizziness": 0.6,
      "fatigue": 0.7,
      "balance problems": 0.7,
    },
    description: "Autoimmune disease affecting the central nervous system, causing various neurological symptoms.",
    webmd_search_term: "multiple sclerosis",
  },
  {
    name: "Guillain-Barré Syndrome (GBS)",
    cluster: ["neurologic", "infectious"],
    symptom_relevance_map: {
      "weakness": 0.9,
      "numbness": 0.8,
      "tingling": 0.8,
      "difficulty breathing": 0.7,
      "pain": 0.6,
    },
    description: "Rare autoimmune disorder causing rapid-onset muscle weakness, often after an infection.",
    webmd_search_term: "guillain barre syndrome",
  },
  
  // Endocrine Diseases
  {
    name: "Adrenal Insufficiency",
    cluster: ["endocrine"],
    symptom_relevance_map: {
      "fatigue": 0.8,
      "weakness": 0.7,
      "weight loss": 0.6,
      "dizziness": 0.7,
      "orthostatic dizziness": 0.8,
      "nausea": 0.5,
      "abdominal pain": 0.5,
    },
    description: "Condition where adrenal glands don't produce enough hormones, causing fatigue and weakness.",
    webmd_search_term: "adrenal insufficiency",
  },
  {
    name: "Hyperthyroidism",
    cluster: ["endocrine"],
    symptom_relevance_map: {
      "weight loss": 0.7,
      "fatigue": 0.6,
      "anxiety": 0.6,
      "sweating": 0.6,
      "heart palpitations": 0.7,
    },
    description: "Overactive thyroid gland causing increased metabolism, weight loss, and anxiety.",
    webmd_search_term: "hyperthyroidism",
  },
  {
    name: "Hypothyroidism",
    cluster: ["endocrine"],
    symptom_relevance_map: {
      "fatigue": 0.8,
      "weight gain": 0.7,
      "weakness": 0.6,
      "depression": 0.6,
      "cold intolerance": 0.6,
    },
    description: "Underactive thyroid gland causing fatigue, weight gain, and slowed metabolism.",
    webmd_search_term: "hypothyroidism",
  },
  {
    name: "Pheochromocytoma",
    cluster: ["endocrine"],
    symptom_relevance_map: {
      "heart palpitations": 0.9,
      "sweating": 0.8,
      "anxiety": 0.7,
      "tremor": 0.7,
      "headache": 0.6,
      "high blood pressure": 0.8,
    },
    description: "Rare tumor of adrenal glands causing episodic high blood pressure, palpitations, and sweating.",
    webmd_search_term: "pheochromocytoma",
  },
  {
    name: "Diabetes Mellitus Type 2",
    cluster: ["endocrine", "metabolic/nutritional"],
    symptom_relevance_map: {
      "weight loss": 0.7,
      "fatigue": 0.7,
      "frequent urination": 0.9,
      "excessive thirst": 0.9,
      "blurred vision": 0.6,
    },
    description: "Metabolic disorder causing high blood sugar, often with increased urination, thirst, and weight loss.",
    webmd_search_term: "diabetes type 2",
  },
  {
    name: "Hyperparathyroidism",
    cluster: ["endocrine"],
    symptom_relevance_map: {
      "fatigue": 0.7,
      "weakness": 0.6,
      "depression": 0.5,
      "bone pain": 0.6,
      "kidney stones": 0.7,
    },
    description: "Overactive parathyroid glands causing high calcium levels, fatigue, and weakness.",
    webmd_search_term: "hyperparathyroidism",
  },
  {
    name: "Graves' Disease",
    cluster: ["endocrine"],
    symptom_relevance_map: {
      "weight loss": 0.8,
      "heart palpitations": 0.9,
      "anxiety": 0.8,
      "tremor": 0.8,
      "heat intolerance": 0.8,
      "sweating": 0.7,
      "fatigue": 0.6,
    },
    description: "Autoimmune cause of hyperthyroidism with weight loss, rapid heartbeat, and anxiety.",
    webmd_search_term: "graves disease",
  },
  
  // Autonomic Dysfunction
  {
    name: "POTS (Postural Orthostatic Tachycardia Syndrome)",
    cluster: ["autonomic dysfunction"],
    symptom_relevance_map: {
      "dizziness": 0.8,
      "orthostatic dizziness": 0.9,
      "fatigue": 0.7,
      "heart palpitations": 0.7,
      "numbness": 0.5,
      "brain fog": 0.6,
    },
    description: "Condition causing rapid heart rate and dizziness when standing, often with fatigue.",
    webmd_search_term: "pots syndrome",
  },
  {
    name: "Autonomic Dysfunction",
    cluster: ["autonomic dysfunction"],
    symptom_relevance_map: {
      "orthostatic dizziness": 0.8,
      "dizziness": 0.7,
      "numbness": 0.6,
      "fatigue": 0.6,
      "heart palpitations": 0.6,
    },
    description: "Dysfunction of the autonomic nervous system affecting heart rate, blood pressure, and other automatic functions.",
    webmd_search_term: "autonomic dysfunction",
  },
  
  // Malignancy/Hematologic
  {
    name: "Lymphoma",
    cluster: ["malignancy/hematologic"],
    symptom_relevance_map: {
      "swollen glands": 0.8,
      "weight loss": 0.8,
      "night sweats": 0.8,
      "fever": 0.7,
      "fatigue": 0.7,
      "itching": 0.5,
    },
    description: "Cancer of the lymphatic system, often presenting with swollen lymph nodes, weight loss, and night sweats.",
    webmd_search_term: "lymphoma",
  },
  
  // Infectious Diseases
  {
    name: "Chronic EBV Infection",
    cluster: ["infectious"],
    symptom_relevance_map: {
      "fatigue": 0.8,
      "fever": 0.6,
      "swollen glands": 0.7,
      "sore throat": 0.6,
      "night sweats": 0.5,
    },
    description: "Persistent Epstein-Barr virus infection causing chronic fatigue and other symptoms.",
    webmd_search_term: "epstein barr virus",
  },
  {
    name: "Chronic CMV Infection",
    cluster: ["infectious"],
    symptom_relevance_map: {
      "fatigue": 0.7,
      "fever": 0.6,
      "swollen glands": 0.6,
      "night sweats": 0.5,
    },
    description: "Persistent cytomegalovirus infection causing fatigue and flu-like symptoms.",
    webmd_search_term: "cmv infection",
  },
  {
    name: "Tuberculosis (TB)",
    cluster: ["infectious"],
    symptom_relevance_map: {
      "cough": 0.8,
      "weight loss": 0.7,
      "night sweats": 0.8,
      "fever": 0.7,
      "fatigue": 0.7,
      "chest pain": 0.6,
    },
    description: "Bacterial infection primarily affecting the lungs, causing persistent cough, weight loss, and night sweats.",
    webmd_search_term: "tuberculosis",
  },
  
  // Metabolic/Nutritional
  {
    name: "Vitamin B12 Deficiency",
    cluster: ["metabolic/nutritional"],
    symptom_relevance_map: {
      "fatigue": 0.7,
      "weakness": 0.6,
      "numbness": 0.7,
      "tingling": 0.7,
      "memory problems": 0.5,
    },
    description: "Deficiency causing fatigue, neurological symptoms, and anemia.",
    webmd_search_term: "b12 deficiency",
  },
  {
    name: "Iron Deficiency Anemia",
    cluster: ["metabolic/nutritional"],
    symptom_relevance_map: {
      "fatigue": 0.8,
      "weakness": 0.7,
      "shortness of breath": 0.6,
      "dizziness": 0.6,
    },
    description: "Low iron levels causing fatigue, weakness, and shortness of breath.",
    webmd_search_term: "iron deficiency anemia",
  },
];

/**
 * Get disease relevance factor for a symptom
 */
export function getDiseaseRelevanceFactor(diseaseName: string, symptom: string): number {
  const disease = DISEASE_DATABASE.find(d => d.name === diseaseName);
  if (!disease) return 0;
  
  const normalizedSymptom = symptom.toLowerCase().trim();
  
  // Try exact match
  if (disease.symptom_relevance_map[normalizedSymptom]) {
    return disease.symptom_relevance_map[normalizedSymptom];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(disease.symptom_relevance_map)) {
    if (normalizedSymptom.includes(key) || key.includes(normalizedSymptom)) {
      return value;
    }
  }
  
  return 0; // No relevance
}

