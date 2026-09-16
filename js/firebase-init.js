/* =========================================================
   CONEXIÓN A BASE DE DATOS (Firebase Firestore)
   =========================================================
   Este archivo conecta BitBloom a una base de datos real para
   que la tabla de clasificación, los códigos de clase y el
   progreso funcionen también cuando el juego esté publicado
   fuera de Claude (tu propia web, GitHub Pages, etc.).

   ¿CÓMO ACTIVARLO?
   1. Creá un proyecto gratis en https://console.firebase.google.com
   2. Activá "Firestore Database" (modo producción) y
      "Authentication" → método "Anónimo".
   3. Registrá una "app web" dentro del proyecto: te va a dar
      un objeto de configuración parecido al de abajo.
   4. Pegá TUS valores reemplazando el objeto FIREBASE_CONFIG
      de aquí abajo. Nada más — no hay que tocar ningún otro
      archivo del juego.

   Si dejás el objeto tal cual (con "TU_API_KEY_AQUI"), el
   juego sigue funcionando exactamente igual que antes: usa el
   almacenamiento de Claude cuando está disponible, y si no,
   simplemente no guarda datos compartidos (sin romperse).
   ========================================================= */

/* ============ 1) PEGÁ ACÁ TU CONFIGURACIÓN DE FIREBASE ============ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyATJhc4DuS7THZl5KIW45LJtClYQJ2AFv8",
  authDomain: "bitbloom-10c09.firebaseapp.com",
  projectId: "bitbloom-10c09",
  storageBucket: "bitbloom-10c09.firebasestorage.app",
  messagingSenderId: "784466339134",
  appId: "1:784466339134:web:da7b0e8e73389bc013786f",
};
/* =================================================================== */

const FIREBASE_ENABLED = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "TU_API_KEY_AQUI");

let _fbReady = null;
let _fbDb = null;
let _fbUid = null;
let _fb = null; // referencias a las funciones del SDK (doc, getDoc, setDoc, etc.)

function _initFirebase(){
  if (_fbReady) return _fbReady;
  _fbReady = (async () => {
    try {
      const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'),
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      const auth = authMod.getAuth(app);
      await authMod.signInAnonymously(auth);
      await new Promise(resolve => {
        const unsub = authMod.onAuthStateChanged(auth, user => {
          if (user){ _fbUid = user.uid; unsub(); resolve(); }
        });
      });
      _fbDb = firestoreMod.getFirestore(app);
      _fb = firestoreMod;
      console.log('BitBloom: conectado a Firebase ✔');
    } catch (err) {
      console.warn('BitBloom: no se pudo conectar a Firebase, se usa el modo sin base de datos.', err);
      _fbDb = null;
    }
  })();
  return _fbReady;
}

/* ============ 2bis) PRIMITIVAS CRUDAS DE FIRESTORE — para salas en vivo ============
   window.FbLive expone lo necesario para el multijugador en tiempo real
   (salas, jugadores, chat). Solo funciona si FIREBASE_ENABLED es true. */
window.FbLive = {
  enabled: FIREBASE_ENABLED,
  async ready(){
    if (!FIREBASE_ENABLED) return false;
    await _initFirebase();
    return !!_fbDb;
  },
  get uid(){ return _fbUid; },
  doc(...path){ return _fb.doc(_fbDb, ...path); },
  collection(...path){ return _fb.collection(_fbDb, ...path); },
  async getDoc(ref){ return _fb.getDoc(ref); },
  async setDoc(ref, data, opts){ return _fb.setDoc(ref, data, opts || {}); },
  async updateDoc(ref, data){ return _fb.updateDoc(ref, data); },
  async deleteDoc(ref){ return _fb.deleteDoc(ref); },
  async addDoc(colRef, data){ return _fb.addDoc(colRef, data); },
  onSnapshotDoc(ref, cb){ return _fb.onSnapshot(ref, cb); },
  onSnapshotQuery(q, cb){ return _fb.onSnapshot(q, cb); },
  query(colRef, ...clauses){ return _fb.query(colRef, ...clauses); },
  orderBy(field, dir){ return _fb.orderBy(field, dir || 'asc'); },
  limitTo(n){ return _fb.limit(n); },
  serverTimestamp(){ return _fb.serverTimestamp(); },
  fieldDelete(){ return _fb.deleteField(); },
};

/* ============ 2) API UNIFICADA — mismo formato que window.storage ============ */
window.AppStorage = {
  async get(key, shared){
    if (FIREBASE_ENABLED){
      await _initFirebase();
      if (_fbDb){
        try {
          const path = shared ? ['shared', key] : ['users', _fbUid, 'data', key];
          const ref = _fb.doc(_fbDb, ...path);
          const snap = await _fb.getDoc(ref);
          if (!snap.exists()) return null;
          return { key, value: snap.data().value, shared: !!shared };
        } catch (err) {
          console.warn('BitBloom (Firestore get):', err);
          return null;
        }
      }
    }
    if (window.storage && window.storage.get){
      try { return await window.storage.get(key, shared); }
      catch (err) { return null; }
    }
    return null;
  },

  async set(key, value, shared){
    if (FIREBASE_ENABLED){
      await _initFirebase();
      if (_fbDb){
        try {
          const path = shared ? ['shared', key] : ['users', _fbUid, 'data', key];
          const ref = _fb.doc(_fbDb, ...path);
          await _fb.setDoc(ref, { value, updatedAt: Date.now() });
          return { key, value, shared: !!shared };
        } catch (err) {
          console.warn('BitBloom (Firestore set):', err);
          return null;
        }
      }
    }
    if (window.storage && window.storage.set){
      try { return await window.storage.set(key, value, shared); }
      catch (err) { return null; }
    }
    return null;
  },
};

/* ============ 3) API DE BAJO NIVEL — para salas en vivo y chat ============
   A diferencia de AppStorage (get/set simples), las salas necesitan
   escuchas en tiempo real (onSnapshot) y subcolecciones (mensajes).
   window.FirebaseAPI expone eso directamente cuando Firebase está activo.
   ============================================================= */
window.FirebaseAPI = {
  isEnabled: () => FIREBASE_ENABLED,
  ready: () => _initFirebase(),
  db: () => _fbDb,
  fs: () => _fb,
  uid: () => _fbUid,
};
