/**
 * System/Cluster Pre-Classification
 * Classifies symptoms into clusters and determines dominant cluster
 */

export type ClusterType = 
  | 'autoimmune'
  | 'endocrine'
  | 'neurologic'
  | 'infectious'
  | 'malignancy/hematologic'
  | 'autonomic dysfunction'
  | 'metabolic/nutritional';

export interface ClusterScore {
  cluster: ClusterType;
  score: number;
}

/**
 * Symptom to cluster mapping
 */
const SYMPTOM_CLUSTER_MAP: Record<string, ClusterType[]> = {
  // Autoimmune indicators
  'joint pain': ['autoimmune'],
  'migratory joint pain': ['autoimmune'],
  'rash': ['autoimmune'],
  'transient rash': ['autoimmune'],
  'swollen joints': ['autoimmune'],
  'dry eyes': ['autoimmune'],
  'dry mouth': ['autoimmune'],
  
  // Neurologic indicators
  'numbness': ['neurologic'],
  'tingling': ['neurologic'],
  'vision problems': ['neurologic'],
  'blurred vision': ['neurologic'],
  'double vision': ['neurologic'],
  'weakness': ['neurologic'],
  'memory problems': ['neurologic'],
  'confusion': ['neurologic'],
  'seizures': ['neurologic'],
  'balance problems': ['neurologic'],
  
  // Endocrine indicators
  'weight loss': ['endocrine', 'malignancy/hematologic'],
  'weight gain': ['endocrine'],
  'sweating': ['endocrine'],
  'cold intolerance': ['endocrine'],
  'heat intolerance': ['endocrine'],
  
  // Infectious indicators
  'fever': ['infectious', 'autoimmune', 'malignancy/hematologic'],
  'night sweats': ['infectious', 'malignancy/hematologic'],
  'swollen glands': ['infectious', 'malignancy/hematologic'],
  'cough': ['infectious'],
  
  // Malignancy indicators
  'night sweats': ['malignancy/hematologic', 'infectious'],
  'weight loss': ['malignancy/hematologic', 'endocrine'],
  'swollen glands': ['malignancy/hematologic', 'infectious'],
  
  // Autonomic dysfunction indicators
  'orthostatic dizziness': ['autonomic dysfunction', 'endocrine'],
  'dizziness': ['autonomic dysfunction', 'neurologic', 'endocrine'],
  'heart palpitations': ['autonomic dysfunction', 'endocrine'],
  
  // Metabolic indicators
  'fatigue': ['metabolic/nutritional', 'endocrine', 'autoimmune'],
  'weakness': ['metabolic/nutritional', 'neurologic', 'endocrine'],
};

/**
 * Classify symptoms into clusters and calculate dominant cluster
 */
export function classifySymptomClusters(
  symptoms: string[],
  symptomWeights: Map<string, number>
): ClusterScore[] {
  const clusterScores = new Map<ClusterType, number>();
  
  // Initialize all clusters
  const allClusters: ClusterType[] = [
    'autoimmune',
    'endocrine',
    'neurologic',
    'infectious',
    'malignancy/hematologic',
    'autonomic dysfunction',
    'metabolic/nutritional',
  ];
  
  allClusters.forEach(cluster => {
    clusterScores.set(cluster, 0);
  });
  
  // Score each symptom against clusters
  symptoms.forEach(symptom => {
    const normalizedSymptom = symptom.toLowerCase().trim();
    const symptomScore = symptomWeights.get(normalizedSymptom) || 0.5;
    
    // Find which clusters this symptom belongs to
    let clusters: ClusterType[] = [];
    
    // Check exact match
    if (SYMPTOM_CLUSTER_MAP[normalizedSymptom]) {
      clusters = SYMPTOM_CLUSTER_MAP[normalizedSymptom];
    } else {
      // Try partial match
      for (const [key, clusterList] of Object.entries(SYMPTOM_CLUSTER_MAP)) {
        if (normalizedSymptom.includes(key) || key.includes(normalizedSymptom)) {
          clusters = clusterList;
          break;
        }
      }
    }
    
    // If no match, assign to metabolic/nutritional as default
    if (clusters.length === 0) {
      clusters = ['metabolic/nutritional'];
    }
    
    // Distribute score across matched clusters
    const scorePerCluster = symptomScore / clusters.length;
    clusters.forEach(cluster => {
      const currentScore = clusterScores.get(cluster) || 0;
      clusterScores.set(cluster, currentScore + scorePerCluster);
    });
  });
  
  // Convert to array and sort by score
  const results: ClusterScore[] = Array.from(clusterScores.entries())
    .map(([cluster, score]) => ({ cluster, score }))
    .sort((a, b) => b.score - a.score);
  
  return results;
}

/**
 * Get dominant cluster(s) - top clusters that together represent majority
 */
export function getDominantClusters(clusterScores: ClusterScore[]): ClusterType[] {
  if (clusterScores.length === 0) return ['metabolic/nutritional'];
  
  const totalScore = clusterScores.reduce((sum, cs) => sum + cs.score, 0);
  if (totalScore === 0) return ['metabolic/nutritional'];
  
  // Get top clusters that represent at least 60% of total score
  const dominant: ClusterType[] = [];
  let cumulativeScore = 0;
  const threshold = totalScore * 0.6;
  
  for (const clusterScore of clusterScores) {
    if (clusterScore.score > 0) {
      dominant.push(clusterScore.cluster);
      cumulativeScore += clusterScore.score;
      if (cumulativeScore >= threshold) break;
    }
  }
  
  // Always return at least the top cluster
  if (dominant.length === 0 && clusterScores.length > 0) {
    return [clusterScores[0].cluster];
  }
  
  return dominant;
}

