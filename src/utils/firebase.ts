import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  writeBatch, Firestore, getDocFromServer 
} from 'firebase/firestore';
import { 
  Project, Activity, CostDirect, CostIndirect, Certification, 
  DateCorteProgress, KnowledgeBaseItem 
} from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Explicit debug logs to trace configuration on build/Vercel environments
console.log('============= DEBUG: FIREBASE CONFIGURATION =============');
console.log('VITE_FIREBASE_API_KEY:', firebaseConfig.apiKey ? `DETECTED (${firebaseConfig.apiKey.substring(0, 8)}...)` : 'NOT DETECTED (EMPTY)');
console.log('VITE_FIREBASE_PROJECT_ID:', firebaseConfig.projectId ? `DETECTED (${firebaseConfig.projectId})` : 'NOT DETECTED (EMPTY)');
console.log('VITE_FIREBASE_APP_ID:', firebaseConfig.appId ? `DETECTED (${firebaseConfig.appId})` : 'NOT DETECTED (EMPTY)');
console.log('=========================================================');

const hasFirebaseConfig = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.appId
);

let app;
let db: Firestore | null = null;

if (hasFirebaseConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log('Firebase initialized successfully for cloud synchronization.');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
} else {
  console.warn(
    'Firebase environment variables not set. Falling back to local storage only.\n' +
    'Please verify your Vercel deployment variables or local .env file settings.'
  );
}

export { db };

export const isFirebaseActive = (): boolean => {
  return db !== null;
};

/**
 * Diagnostic function that performs a single write and read operation
 * to the 'test_connection' collection to verify credential configurations and security rules.
 */
export async function testFirestoreReadWrite(): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: 'Firebase is not initialized (missing environment variables).' };
  }
  try {
    const testDocRef = doc(db, 'test_connection', 'write_read_test');
    const timestamp = new Date().toISOString();
    
    console.log('Testing Firestore WRITE...');
    await setDoc(testDocRef, { 
      status: 'success', 
      timestamp, 
      message: 'Connection test from Taging application' 
    });
    
    console.log('Testing Firestore READ...');
    const snap = await getDocFromServer(testDocRef);
    
    if (snap.exists() && snap.data().status === 'success') {
      console.log('Firestore WRITE & READ test succeeded!');
      return { 
        success: true, 
        message: `Successfully wrote and read from Firestore test_connection at ${timestamp}!` 
      };
    } else {
      throw new Error('Document was written but read returned invalid or missing data.');
    }
  } catch (error: any) {
    console.error('Firestore WRITE & READ test failed:', error);
    return { 
      success: false, 
      message: `Firestore test failed: ${error?.message || error}` 
    };
  }
}

// --- GENERIC SYNC HELPERS ---

/**
 * Pushes an array of items to a Firestore collection, overwriting existing items.
 * Uses batch writes to optimize speed.
 */
async function syncCollectionToCloud<T extends Record<string, any>>(
  collectionName: string, 
  items: T[], 
  idFieldName: keyof T
) {
  if (!db) return;
  try {
    const colRef = collection(db, collectionName);

    // Limit to 500 documents per batch (Firestore limit)
    const chunks = [];
    for (let i = 0; i < items.length; i += 500) {
      chunks.push(items.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const chunkBatch = writeBatch(db);
      chunk.forEach(item => {
        const docId = String(item[idFieldName] || item.id || Math.random().toString());
        const docRef = doc(colRef, docId);
        chunkBatch.set(docRef, item, { merge: true });
      });
      await chunkBatch.commit();
    }
  } catch (error) {
    console.error(`Error syncing collection ${collectionName} to cloud:`, error);
  }
}

/**
 * Pulls all documents from a Firestore collection.
 */
async function pullCollectionFromCloud<T>(collectionName: string): Promise<T[]> {
  if (!db) return [];
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const items: T[] = [];
    snapshot.forEach(doc => {
      items.push(doc.data() as T);
    });
    return items;
  } catch (error) {
    console.error(`Error pulling collection ${collectionName} from cloud:`, error);
    return [];
  }
}

// --- ENTITY SPECIFIC CLOUD API ---

export const cloudSync = {
  // Projects
  async projects(items: Project[]) {
    await syncCollectionToCloud<Project>('projects', items, 'idProyecto');
  },
  async pullProjects(): Promise<Project[]> {
    return pullCollectionFromCloud<Project>('projects');
  },

  // Activities
  async activities(items: Activity[]) {
    await syncCollectionToCloud<Activity>('activities', items, 'id');
  },
  async pullActivities(): Promise<Activity[]> {
    return pullCollectionFromCloud<Activity>('activities');
  },

  // Costs Direct
  async costsDirect(items: CostDirect[]) {
    await syncCollectionToCloud<CostDirect>('costs_direct', items, 'idCosto');
  },
  async pullCostsDirect(): Promise<CostDirect[]> {
    return pullCollectionFromCloud<CostDirect>('costs_direct');
  },

  // Costs Indirect
  async costsIndirect(items: CostIndirect[]) {
    await syncCollectionToCloud<CostIndirect>('costs_indirect', items, 'idCostoIndirecto');
  },
  async pullCostsIndirect(): Promise<CostIndirect[]> {
    return pullCollectionFromCloud<CostIndirect>('costs_indirect');
  },

  // Certifications
  async certifications(items: Certification[]) {
    await syncCollectionToCloud<Certification>('certifications', items, 'idCertificacion');
  },
  async pullCertifications(): Promise<Certification[]> {
    return pullCollectionFromCloud<Certification>('certifications');
  },

  // Progress S-Curve
  async progress(items: DateCorteProgress[]) {
    await syncCollectionToCloud<DateCorteProgress>('progress', items, 'idProgreso');
  },
  async pullProgress(): Promise<DateCorteProgress[]> {
    return pullCollectionFromCloud<DateCorteProgress>('progress');
  },

  // Knowledge Base
  async knowledgeBase(items: KnowledgeBaseItem[]) {
    await syncCollectionToCloud<KnowledgeBaseItem>('knowledge_base', items, 'id');
  },
  async pullKnowledgeBase(): Promise<KnowledgeBaseItem[]> {
    return pullCollectionFromCloud<KnowledgeBaseItem>('knowledge_base');
  }
};

/**
 * Pulls all data from Firestore and updates localStorage.
 * Useful at app startup.
 */
export async function pullAllFromCloud(): Promise<boolean> {
  if (!db) return false;
  try {
    console.log('Sincronizando estado desde Cloud Firestore...');
    const [
      projects, 
      activities, 
      costsDirect, 
      costsIndirect, 
      certifications, 
      progress, 
      knowledgeBase
    ] = await Promise.all([
      cloudSync.pullProjects(),
      cloudSync.pullActivities(),
      cloudSync.pullCostsDirect(),
      cloudSync.pullCostsIndirect(),
      cloudSync.pullCertifications(),
      cloudSync.pullProgress(),
      cloudSync.pullKnowledgeBase()
    ]);

    let loadedAny = false;

    if (projects.length > 0) {
      localStorage.setItem('taging_projects', JSON.stringify(projects));
      loadedAny = true;
    }
    if (activities.length > 0) {
      localStorage.setItem('taging_activities', JSON.stringify(activities));
      loadedAny = true;
    }
    if (costsDirect.length > 0) {
      localStorage.setItem('taging_costs_direct', JSON.stringify(costsDirect));
      loadedAny = true;
    }
    if (costsIndirect.length > 0) {
      localStorage.setItem('taging_costs_indirect', JSON.stringify(costsIndirect));
      loadedAny = true;
    }
    if (certifications.length > 0) {
      localStorage.setItem('taging_certifications', JSON.stringify(certifications));
      loadedAny = true;
    }
    if (progress.length > 0) {
      localStorage.setItem('taging_progress', JSON.stringify(progress));
      loadedAny = true;
    }
    if (knowledgeBase.length > 0) {
      localStorage.setItem('taging_knowledge_base', JSON.stringify(knowledgeBase));
      loadedAny = true;
    }

    if (loadedAny) {
      console.log('La caché local se ha sincronizado completamente con Cloud Firestore.');
    } else {
      console.log('No se encontraron datos en la nube. Inicializando Cloud Firestore con datos locales predeterminados...');
      await pushAllToCloud();
    }
    return true;
  } catch (error) {
    console.error('Error al descargar datos de Firebase Firestore:', error);
    return false;
  }
}

/**
 * Pushes all current local storage data to Firestore.
 * Useful for initial migration.
 */
export async function pushAllToCloud(): Promise<boolean> {
  if (!db) return false;
  try {
    console.log('Exportando todos los datos locales a Cloud Firestore...');
    const projects = JSON.parse(localStorage.getItem('taging_projects') || '[]');
    const activities = JSON.parse(localStorage.getItem('taging_activities') || '[]');
    const costsDirect = JSON.parse(localStorage.getItem('taging_costs_direct') || '[]');
    const costsIndirect = JSON.parse(localStorage.getItem('taging_costs_indirect') || '[]');
    const certifications = JSON.parse(localStorage.getItem('taging_certifications') || '[]');
    const progress = JSON.parse(localStorage.getItem('taging_progress') || '[]');
    const knowledgeBase = JSON.parse(localStorage.getItem('taging_knowledge_base') || '[]');

    await Promise.all([
      projects.length > 0 ? cloudSync.projects(projects) : Promise.resolve(),
      activities.length > 0 ? cloudSync.activities(activities) : Promise.resolve(),
      costsDirect.length > 0 ? cloudSync.costsDirect(costsDirect) : Promise.resolve(),
      costsIndirect.length > 0 ? cloudSync.costsIndirect(costsIndirect) : Promise.resolve(),
      certifications.length > 0 ? cloudSync.certifications(certifications) : Promise.resolve(),
      progress.length > 0 ? cloudSync.progress(progress) : Promise.resolve(),
      knowledgeBase.length > 0 ? cloudSync.knowledgeBase(knowledgeBase) : Promise.resolve()
    ]);

    console.log('Todos los datos locales se han subido con éxito a Cloud Firestore.');
    return true;
  } catch (error) {
    console.error('Error al exportar datos a Firebase Firestore:', error);
    return false;
  }
}
