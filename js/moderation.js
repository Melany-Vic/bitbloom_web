/* =========================================================
   MODERACIÓN — filtro de lenguaje inapropiado y datos personales
   Se usa en el chat de las salas, los nombres de los dúos,
   las opiniones y los nombres de usuario.
   Detecta también trucos como "p u t a", "pvta", "mi3rda" o "puuuta".
   ========================================================= */
const BAD_WORDS = [
  // español
  'puta','puto','putas','putos','putear','putada','mierda','carajo','coño','joder','jodete','jodido','jodida',
  'pendejo','pendeja','cabron','cabrona','chingar','chinga','chingada','chingado','verga','vergon','pinga','pija',
  'culo','culero','culera','imbecil','idiota','estupido','estupida','tarado','tarada','retrasado','retrasada',
  'mongolico','subnormal','maricon','marica','marico','zorra','hijueputa','hijoputa','hijodeputa','hdp','malparido','malparida',
  'gonorrea','pajero','pajera','mamon','mamada','conchudo','conchatumadre','ctm','csm','boludo','pelotudo','cagar','cagada','cagon',
  'muerete','matate','violar','violador','pedofilo','porno','pornografia','sexo','sexual','tetas','nalgas','pene','vagina','desnudo','desnuda',
  'nazi','hitler','basura humana','lacra',
  // inglés
  'fuck','fucking','fucker','shit','bitch','asshole','dick','cunt','bastard','slut','whore','porn','nude','nigger','nigga','faggot','retard','stupid','idiot','dumb',
];
const BAD_SHORT_EXACT = new Set(['hdp','ctm','csm','hp','ptm','wtf','stfu']);

function _normText(s){
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[@4]/g, 'a').replace(/[3]/g, 'e').replace(/[1!|]/g, 'i').replace(/[0]/g, 'o').replace(/[$5]/g, 's').replace(/7/g, 't')
    .replace(/v/g, 'b')                        // "pvta" ~ "pbta"
    ;
}
function _collapse(s){ return s.replace(/(.)\1+/g, '$1'); }

const _BAD_COLLAPSED = BAD_WORDS.map(w => _collapse(_normText(w).replace(/\s+/g, '')));
const _BAD_SET = new Set(_BAD_COLLAPSED);

/* Devuelve { ok:true } o { ok:false, reason:'...' } */
function checkText(text){
  const raw = String(text || '');
  // Datos personales y enlaces (seguridad de niñas y niños)
  if (/https?:\/\/|www\.|\.(com|net|org|io|xyz|me|tk|gg)\b/i.test(raw)) return { ok:false, reason:'No se pueden compartir enlaces.' };
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(raw))                          return { ok:false, reason:'No compartas correos electrónicos.' };
  if (/(\d[\s.\-]?){7,}/.test(raw))                                  return { ok:false, reason:'No compartas números de teléfono ni datos personales.' };

  const norm = _normText(raw);
  // tokens (palabras)
  let tokens = norm.split(/[^a-zñ]+/).filter(Boolean);
  // letras sueltas separadas ("p u t a") se juntan
  const joined = [];
  let run = '';
  tokens.forEach(t => {
    if (t.length === 1){ run += t; }
    else { if (run){ joined.push(run); run = ''; } joined.push(t); }
  });
  if (run) joined.push(run);
  tokens = joined;

  for (const t of tokens){
    if (BAD_SHORT_EXACT.has(t)) return { ok:false, reason:'Usa un lenguaje respetuoso.' };
    const c = _collapse(t);
    if (_BAD_SET.has(c)) return { ok:false, reason:'Usa un lenguaje respetuoso.' };
    // variantes con terminaciones cortas (putas, culeros, pendejadas…)
    for (const w of _BAD_COLLAPSED){
      if (w.length >= 4 && c.startsWith(w) && c.length <= w.length + 4) return { ok:false, reason:'Usa un lenguaje respetuoso.' };
    }
  }
  // palabras largas pegadas ("hijodeputa", "mamamierda")
  const compact = _collapse(norm.replace(/[^a-zñ]/g, ''));
  for (const w of _BAD_COLLAPSED){
    if (w.length >= 6 && compact.includes(w)) return { ok:false, reason:'Usa un lenguaje respetuoso.' };
  }
  return { ok:true };
}
