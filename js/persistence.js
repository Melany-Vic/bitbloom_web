/* =========================================================
   PERSISTENCIA — guarda el progreso en la base de datos
   del artifact o de Firebase (AppStorage) cuando está disponible.
   Si el juego se abre fuera de Claude (archivo local), el
   progreso simplemente queda solo en la sesión actual.
   ========================================================= */
const PROGRESS_KEY = 'bitbloom-progress';

async function saveProgress(){
  try {
    if (!AppStorage || !AppStorage.set) return;
    const data = {
      score: State.score,
      coins: State.coins,
      unlocked: State.unlocked,
      stars: State.stars,
      shopOwned: Array.from(State.shopOwned),
      sideQuests: Array.from(State.sideQuests),
      profile: State.profile,
      timeBonus: State.timeBonus,
      onboardingDone: State.onboardingDone,
      preQuizScore: State.preQuizScore,
      postQuizScore: State.postQuizScore,
    };
    await AppStorage.set(PROGRESS_KEY, JSON.stringify(data), false);
  } catch (e) {
    // Sin conexión a la base de datos: el progreso queda solo en esta sesión.
  }
}

async function loadProgress(){
  try {
    if (!AppStorage || !AppStorage.get) return;
    const result = await AppStorage.get(PROGRESS_KEY, false);
    if (!result || !result.value) return;
    const data = JSON.parse(result.value);
    State.score = data.score || 0;
    State.coins = data.coins || 0;
    State.unlocked = data.unlocked || 1;
    State.stars = data.stars || State.stars;
    State.shopOwned = new Set(data.shopOwned || []);
    State.sideQuests = new Set(data.sideQuests || []);
    State.profile = data.profile || null;
    State.timeBonus = data.timeBonus || 1;
    State.onboardingDone = !!data.onboardingDone;
    State.preQuizScore = (data.preQuizScore != null) ? data.preQuizScore : null;
    State.postQuizScore = (data.postQuizScore != null) ? data.postQuizScore : null;
    if (State.shopOwned.has('accessory')){
      const acc = document.getElementById('bitAccessory');
      if (acc) acc.classList.remove('hidden');
    }
  } catch (e) {
    // No hay progreso guardado todavía, o el almacenamiento no está disponible.
  }
}
