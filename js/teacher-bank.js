/* =========================================================
   BANCO DE ACTIVIDADES PARA PROFESORES
   Temas predeterminados con preguntas listas para usar, así el
   profesor arma una actividad en segundos. Cada tema mezcla
   distintos TIPOS de ejercicio:
     mc        Opción múltiple (4 opciones)
     vf        Verdadero o falso
     classify  Clasificar un elemento en una categoría
     order     Ordenar pasos de un proceso
     match     Unir parejas (término ↔ definición)
   Todo lo que está aquí puede elegirse tal cual o editarse; el
   profesor también puede crear sus propias preguntas.
   ========================================================= */
const T_KINDS = {
  mc:       { label:'Opción múltiple', icon:'🔘' },
  vf:       { label:'Verdadero / Falso', icon:'✔️' },
  classify: { label:'Clasificar', icon:'🗂️' },
  order:    { label:'Ordenar pasos', icon:'🔢' },
  match:    { label:'Unir parejas', icon:'🔗' },
};

/* ---------- Constructores cortos ---------- */
function tMC(q, right, wrongs, explain){ return { kind:'mc', q, options:[right].concat(wrongs), correct:0, explain: explain || '' }; }
function tVF(q, isTrue, explain){ return { kind:'vf', q, options:['Verdadero', 'Falso'], correct: isTrue ? 0 : 1, explain: explain || '' }; }
function tCL(prompt, cats, terms){ return terms.map(([term, c]) => ({ kind:'classify', prompt, term, q: prompt + ': ' + term, options: cats.slice(), correct: c, explain: term + ' → ' + cats[c] + '.' })); }
function tOR(q, steps, explain){ return { kind:'order', q, steps, explain: explain || '' }; }
function tMT(q, pairs, explain){ return { kind:'match', q, pairs, explain: explain || '' }; }

const TEACHER_TOPICS = [
  { id:'hardware', icon:'🖥️', name:'Hardware y componentes', desc:'CPU, RAM, almacenamiento, GPU, placa madre y periféricos.',
    items:[
      tMC('¿Qué pieza es el "cerebro" del computador y ejecuta las instrucciones?', 'La CPU (procesador)', ['La memoria RAM', 'El SSD', 'La fuente de poder'], 'La CPU ejecuta las instrucciones de los programas y hace los cálculos.'),
      tMC('¿Qué memoria guarda datos de forma temporal mientras el equipo está encendido?', 'La memoria RAM', ['El disco duro', 'La tarjeta de red', 'El monitor'], 'La RAM es rápida y temporal: se borra al apagar el equipo.'),
      tMC('¿Qué componente conecta a todos los demás para que se comuniquen entre sí?', 'La placa madre', ['La fuente de poder', 'La tarjeta gráfica', 'El ventilador'], 'La placa madre es la base donde se conectan las piezas.'),
      tMC('¿Qué pieza convierte la electricidad de la pared en energía para los componentes?', 'La fuente de poder', ['La CPU', 'El SSD', 'El mouse'], 'Sin fuente de poder el equipo no recibe energía.'),
      tMC('¿Qué pieza procesa las imágenes y el video que ves en pantalla?', 'La tarjeta gráfica (GPU)', ['La RAM', 'El teclado', 'El router'], 'La GPU se especializa en gráficos.'),
      tMC('¿Cuál de estos es un dispositivo de ENTRADA?', 'El micrófono', ['El altavoz', 'El monitor', 'La impresora'], 'Los dispositivos de entrada envían datos al computador.'),
      tMC('¿Qué ventaja suele tener un SSD frente a un disco duro (HDD)?', 'Es más rápido y no tiene partes móviles', ['Siempre es más barato', 'Funciona sin electricidad', 'Guarda menos archivos'], 'Los SSD usan memoria flash, sin piezas giratorias.'),
      tVF('El SSD pierde todos los archivos cuando se apaga el computador.', false, 'El SSD guarda los datos de forma permanente.'),
      tVF('El monitor es un dispositivo de salida.', true, 'Muestra la información que el computador procesa.'),
      tMT('Une cada componente con su función.', [['CPU', 'Ejecuta instrucciones y cálculos'], ['RAM', 'Memoria temporal de trabajo'], ['SSD', 'Guarda archivos de forma permanente'], ['GPU', 'Procesa imágenes y video']]),
    ] },

  { id:'software', icon:'💿', name:'Software y sistema operativo', desc:'Programas, aplicaciones y funciones del sistema operativo.',
    items:[
      tMC('¿Qué es un sistema operativo?', 'El programa principal que administra los recursos y permite usar el equipo', ['Una pieza de la placa madre', 'Un tipo de memoria', 'Un cable de red'], 'Windows, Linux, macOS y Android son sistemas operativos.'),
      tMC('¿Cuál de estos es un sistema operativo?', 'Linux', ['Word', 'Google Chrome', 'Zoom'], 'Los otros son programas que se ejecutan sobre un sistema operativo.'),
      tMC('¿Qué hace el núcleo (kernel) del sistema operativo?', 'Comunica el hardware con el software y controla el sistema', ['Dibuja las imágenes en pantalla', 'Protege contra virus', 'Conecta a Internet'], 'El kernel es el corazón del sistema operativo.'),
      tMC('¿Para qué sirven los controladores (drivers)?', 'Para que el sistema se comunique con dispositivos como impresoras o mouse', ['Para enfriar el procesador', 'Para guardar contraseñas', 'Para ampliar la RAM'], 'Cada dispositivo necesita su driver.'),
      tMC('¿Qué hace una hoja de cálculo?', 'Organiza datos y hace cálculos en tablas', ['Edita videos', 'Navega por Internet', 'Protege el equipo'], 'Excel o Calc son ejemplos.'),
      tVF('Un navegador web es un programa (software).', true, 'No se puede tocar: son instrucciones que ejecuta el equipo.'),
      tVF('Un archivo se puede tocar físicamente.', false, 'Un archivo es información guardada digitalmente; lo físico es el dispositivo donde está guardado.'),
      tMT('Une cada función del sistema operativo con su definición.', [['Gestión de memoria', 'Decide qué programas usan la RAM'], ['Sistema de archivos', 'Organiza documentos en carpetas'], ['Interfaz de usuario', 'Ventanas e íconos con los que interactúas'], ['Gestión de procesos', 'Decide qué programa usa el procesador']]),
      tMC('Un antivirus es un tipo de…', 'Software de protección', ['Hardware de red', 'Memoria externa', 'Dispositivo de salida'], 'Detecta y elimina software malicioso.'),
    ] },

  { id:'hwsw', icon:'⚡', name:'¿Hardware o software?', desc:'Clasificar elementos tecnológicos: lo que se toca y lo que se ejecuta.',
    items:[].concat(
      tCL('¿Hardware o software?', ['Hardware', 'Software'], [['Mouse', 0], ['Procesador de texto', 1], ['Memoria RAM', 0], ['Navegador web', 1], ['Placa madre', 0], ['Antivirus', 1], ['Monitor', 0], ['Sistema operativo', 1], ['Cable Ethernet', 0], ['Videojuego', 1]]),
      [
        tMC('Regla práctica: si lo puedes tocar, es…', 'Hardware', ['Software', 'Un virus', 'Un protocolo'], 'Hardware es lo físico; software son los programas y archivos.'),
        tVF('Un documento de Word es hardware.', false, 'Es un archivo: software.'),
      ]) },

  { id:'ensamblaje', icon:'🧩', name:'Ensamblaje de la PC', desc:'Orden de armado, piezas clave y cuidados al ensamblar.',
    items:[
      tOR('Ordena los pasos para armar una computadora.', ['Instalar la CPU y la RAM en la placa madre', 'Fijar la placa madre dentro del gabinete', 'Instalar la fuente de poder', 'Conectar el almacenamiento y la tarjeta gráfica', 'Cerrar el gabinete y encender el equipo'], 'Primero se prepara la placa madre; al final se prueba el equipo.'),
      tMC('¿Dónde se instala el procesador?', 'En el zócalo (socket) de la placa madre', ['En la fuente de poder', 'Dentro del monitor', 'En el teclado'], 'El socket es la base donde encaja la CPU.'),
      tMC('Si falta la fuente de poder, ¿qué pasa?', 'El equipo no enciende porque no recibe energía', ['Solo se ve peor la imagen', 'Funciona más lento', 'Solo falla el Wi-Fi'], 'Todos los componentes dependen de la energía.'),
      tMC('¿Para qué sirve la pasta térmica?', 'Para pasar el calor del procesador al disipador', ['Para pegar la CPU', 'Para limpiar la placa', 'Para guardar datos'], 'Mejora el contacto y la refrigeración.'),
      tMC('¿Por qué es importante la refrigeración?', 'Evita que los componentes se sobrecalienten', ['Aumenta la memoria', 'Mejora la señal de Wi-Fi', 'Hace más brillante la pantalla'], 'El calor excesivo apaga o daña el equipo.'),
      tMC('¿Qué 4 piezas clave recoges en el juego de ensamblaje?', 'CPU, RAM, GPU y SSD', ['Mouse, teclado, monitor y router', 'Fuente, cable, ventilador y gabinete', 'Antivirus, navegador, correo y Word'], 'Son procesador, memoria, tarjeta gráfica y almacenamiento.'),
      tVF('Antes de tocar piezas internas conviene desconectar el equipo de la corriente.', true, 'Es una medida básica de seguridad.'),
      tVF('La RAM se instala en la ranura de la tarjeta gráfica.', false, 'La RAM va en sus propias ranuras de la placa madre.'),
      tMT('Une cada pieza con lo que aporta.', [['Fuente de poder', 'Da energía a los componentes'], ['Placa madre', 'Conecta todas las piezas'], ['Ventilador', 'Enfría los componentes'], ['Gabinete', 'Protege y aloja las piezas']]),
    ] },

  { id:'diagnostico', icon:'🩺', name:'Análisis de problemas (diagnóstico)', desc:'Leer un síntoma y encontrar la causa probable.',
    items:[].concat(
      [
        tMC('La PC no enciende y no hay luces ni sonidos. ¿Qué revisas primero?', 'La fuente de poder', ['El monitor', 'El teclado', 'Los altavoces'], 'Sin energía nada funciona.'),
        tMC('La PC enciende, los ventiladores suenan, pero el monitor no muestra imagen.', 'Tarjeta gráfica o cable de video', ['El mouse', 'La impresora', 'El micrófono'], 'Hay energía pero no llega la señal de video.'),
        tMC('El equipo se reinicia solo al abrir varios programas pesados.', 'Memoria RAM insuficiente o dañada', ['El teclado', 'Los parlantes', 'La cámara web'], 'La RAM no alcanza para todo lo que se está usando.'),
        tMC('Los archivos tardan mucho en abrir y todo va muy lento.', 'Disco dañado o casi lleno', ['El mouse', 'El router', 'El micrófono'], 'Un almacenamiento lleno o dañado reduce la velocidad.'),
        tMC('El equipo se apaga solo y está muy caliente.', 'Falla en la refrigeración', ['El teclado', 'Los parlantes', 'La cámara web'], 'Se apaga para protegerse del calor.'),
        tMC('Aparecen ventanas de publicidad todo el tiempo y el navegador se abre solo.', 'Software malicioso (malware)', ['La fuente de poder', 'La placa madre', 'El disco duro'], 'No es una falla física.'),
        tMC('El router está encendido pero ningún dispositivo se conecta a Internet.', 'Problema de red o del router', ['La tarjeta gráfica', 'La RAM', 'El teclado'], 'Si fallan todos a la vez, suele ser la red.'),
      ],
      tCL('¿De qué tipo es el problema?', ['Hardware', 'Software', 'Red'], [['Ventilador roto', 0], ['Un programa se cierra con un error', 1], ['El router no da señal', 2], ['Hay un virus en el equipo', 1], ['No hay Wi-Fi en toda la casa', 2]]),
      [tOR('Ordena los pasos para diagnosticar una falla.', ['Observar el síntoma', 'Pensar en las causas posibles', 'Hacer una prueba para confirmar la causa', 'Aplicar la solución', 'Verificar que el problema desapareció'], 'Diagnosticar es un proceso ordenado, no adivinar.')]) },

  { id:'programacion', icon:'💻', name:'Programación y lógica', desc:'Algoritmos, variables, condiciones, bucles y lenguajes.',
    items:[
      tMC('¿Qué es un algoritmo?', 'Una serie ordenada de pasos para resolver un problema', ['Un tipo de virus', 'Una pieza del computador', 'Un archivo de imagen'], 'Todo programa sigue uno o más algoritmos.'),
      tMC('¿Qué es un bug?', 'Un error en un programa', ['Una pieza del PC', 'Un cable', 'Un lenguaje'], 'Buscar y corregir bugs se llama depurar.'),
      tMC('¿Qué es una variable?', 'Un espacio con nombre donde se guarda un dato', ['Una orden para imprimir', 'Un error', 'Un tipo de cable'], 'Por ejemplo, edad = 12.'),
      tMC('¿Para qué sirve una condición (si… entonces…)?', 'Para ejecutar instrucciones solo si algo se cumple', ['Para repetir sin fin', 'Para apagar el equipo', 'Para guardar archivos'], 'Permite que el programa tome decisiones.'),
      tMC('¿Para qué sirve un bucle (ciclo)?', 'Para repetir instrucciones varias veces', ['Para borrar variables', 'Para conectar a Internet', 'Para cambiar el color'], 'Evita escribir lo mismo muchas veces.'),
      tMC('¿Qué lenguaje da estructura a una página web?', 'HTML', ['CSS', 'Python', 'SQL'], 'HTML define títulos, párrafos, imágenes y enlaces.'),
      tMC('¿Qué lenguaje da estilo y colores a una página web?', 'CSS', ['HTML', 'SQL', 'FTP'], 'CSS controla el diseño.'),
      tVF('El orden de las instrucciones no importa en un programa.', false, 'Cada paso depende del anterior.'),
      tVF('Python es un lenguaje de programación.', true, 'Y es muy usado para aprender a programar.'),
      tOR('Ordena los pasos de un programa que suma dos números.', ['Pedir el primer número', 'Pedir el segundo número', 'Sumar los dos números', 'Mostrar el resultado']),
      tMT('Une cada lenguaje con su uso.', [['HTML', 'Estructura de páginas web'], ['CSS', 'Estilo y colores'], ['JavaScript', 'Interactividad en la web'], ['SQL', 'Consultar bases de datos']]),
    ] },

  { id:'bd', icon:'🗄️', name:'Bases de datos', desc:'Tablas, registros, SQL, seguridad, copias de seguridad y nube.',
    items:[
      tMC('¿Qué es una base de datos?', 'Información organizada para encontrarla y usarla fácilmente', ['Un tipo de cable', 'Un juego de video', 'Una pieza del PC'], 'Guarda datos de alumnos, productos, contactos, etc.'),
      tMC('En una tabla, cada fila representa…', 'Un registro', ['Una contraseña', 'Un cable', 'Un programa'], 'Cada columna es un campo (nombre, edad…).'),
      tMC('¿Qué instrucción de SQL se usa para consultar datos?', 'SELECT', ['DELETE', 'INSERT', 'UPDATE'], 'SELECT consulta, INSERT agrega, UPDATE modifica y DELETE borra.'),
      tMC('¿Qué hace WHERE en una consulta?', 'Filtra los registros que cumplen una condición', ['Borra la tabla', 'Crea una copia', 'Cambia la contraseña'], 'Por ejemplo: WHERE grado = 5.'),
      tMC('¿Qué es una clave primaria (id)?', 'Un identificador único de cada registro', ['Una contraseña', 'Un tipo de copia', 'Un gráfico'], 'Evita confundir un registro con otro.'),
      tMC('¿Para qué sirve una copia de seguridad (backup)?', 'Para recuperar los datos si algo falla', ['Para hacer más lento el sistema', 'Para cambiar el color', 'Para borrar la base'], 'Permite restaurar información perdida.'),
      tMC('Los usuarios, contraseñas y permisos sirven para…', 'Proteger el acceso a los datos', ['Ordenar las tablas', 'Dibujar gráficos', 'Hacer copias'], 'Controlan quién puede ver o modificar cada dato.'),
      tMC('¿Qué ventaja tiene una base de datos en la nube?', 'Se puede usar desde cualquier lugar con Internet', ['No necesita seguridad', 'Funciona sin servidores', 'No puede compartirse'], 'Está guardada en servidores accesibles por Internet.'),
      tVF('Una columna representa un campo, como nombre o edad.', true),
      tVF('Una base de datos importante no necesita copias de seguridad.', false, 'Siempre debe respaldarse.'),
      tMT('Une cada instrucción de SQL con lo que hace.', [['SELECT', 'Consultar datos'], ['INSERT', 'Agregar un registro'], ['UPDATE', 'Modificar datos'], ['DELETE', 'Borrar datos']]),
    ] },

  { id:'graficos', icon:'🎨', name:'Gráficos y píxeles', desc:'Píxel, resolución, colores RGB y formatos de imagen.',
    items:[
      tMC('¿Qué significan las siglas RGB?', 'Rojo, verde y azul', ['Rápido, grande y brillante', 'Rojo, gris y blanco', 'Registro, gráfico y bit'], 'Las pantallas mezclan luz roja, verde y azul.'),
      tMC('¿Qué es un píxel?', 'El punto más pequeño de una imagen', ['Un tipo de cable', 'Un programa de dibujo', 'Un formato de audio'], 'Una imagen digital está hecha de miles de píxeles.'),
      tMC('¿Qué es la resolución de una imagen?', 'La cantidad de píxeles que tiene', ['El peso del archivo en papel', 'Su color favorito', 'El nombre del autor'], 'Más píxeles significa más detalle.'),
      tMC('Luz roja + luz verde da…', 'Amarillo', ['Azul', 'Negro', 'Violeta'], 'Mezcla aditiva de luz.'),
      tMC('Luz verde + luz azul da…', 'Cian', ['Magenta', 'Amarillo', 'Blanco'], 'Verde y azul forman cian.'),
      tMC('¿Qué formato permite fondo transparente?', 'PNG', ['JPG', 'MP3', 'DOC'], 'PNG admite transparencia; JPG no.'),
      tMC('¿Qué ventaja tiene una imagen vectorial (SVG)?', 'Se agranda sin perder calidad', ['Siempre pesa más', 'Solo sirve en blanco y negro', 'No se puede editar'], 'Usa fórmulas en lugar de píxeles.'),
      tVF('La luz roja, verde y azul juntas forman el color blanco.', true),
      tVF('Un archivo JPG permite fondo transparente.', false),
      tMT('Une cada formato con su característica.', [['JPG', 'Fotos livianas'], ['PNG', 'Fondo transparente'], ['GIF', 'Animaciones cortas'], ['SVG', 'Imagen vectorial escalable']]),
      tMT('Une cada mezcla de luz con su resultado.', [['Rojo + Verde', 'Amarillo'], ['Verde + Azul', 'Cian'], ['Rojo + Azul', 'Magenta'], ['Rojo + Verde + Azul', 'Blanco']]),
    ] },

  { id:'binario', icon:'🔢', name:'Bits, bytes y binario', desc:'La unidad de información, unidades de medida y el sistema binario.',
    items:[
      tMC('¿Cuántos bits forman un byte?', '8 bits', ['2 bits', '16 bits', '10 bits'], '1 byte = 8 bits.'),
      tMC('El sistema binario usa solo los dígitos…', '0 y 1', ['1 al 9', '0 al 7', 'A y B'], 'Los computadores solo entienden dos estados: apagado y encendido.'),
      tMC('¿Qué número es 101 en binario?', '5', ['3', '7', '101'], '101 = 4 + 0 + 1 = 5.'),
      tMC('¿Qué número es 11 en binario?', '3', ['2', '4', '11'], '11 = 2 + 1 = 3.'),
      tMC('¿Cuál es la unidad más pequeña de información?', 'El bit', ['El byte', 'El megabyte', 'El gigabyte'], 'Un bit vale 0 o 1.'),
      tMC('Aproximadamente, 1 KB equivale a…', '1.000 bytes', ['10 bytes', '1 bit', '1.000.000 de bytes'], 'Un kilobyte son unos mil bytes.'),
      tMC('¿Cuántos valores distintos puede tener un bit?', '2', ['1', '8', '10'], 'Solo 0 o 1.'),
      tVF('Con un byte se puede guardar una letra.', true),
      tVF('1 GB es más pequeño que 1 MB.', false, 'Un gigabyte es mucho mayor que un megabyte.'),
      tOR('Ordena de la unidad más pequeña a la más grande.', ['Bit', 'Byte', 'Kilobyte (KB)', 'Megabyte (MB)', 'Gigabyte (GB)']),
      tMT('Une cada número binario con su valor decimal.', [['1', '1'], ['10', '2'], ['100', '4'], ['101', '5']]),
    ] },

  { id:'redes', icon:'🌐', name:'Redes e Internet', desc:'Paquetes, IP, router, Wi-Fi y protocolos como HTTP, FTP y SSH.',
    items:[
      tMC('¿Qué es un paquete en una red?', 'Un trocito de datos con su destino', ['Una caja con cables', 'Un tipo de virus', 'Un programa de dibujo'], 'Los datos viajan divididos en paquetes.'),
      tMC('¿Para qué sirve una red de computadores?', 'Para conectar equipos y compartir información', ['Para apagar el equipo', 'Para dibujar imágenes', 'Para enfriar los componentes'], 'Internet es la red de redes.'),
      tMC('¿Qué es una dirección IP?', 'El número que identifica a un dispositivo en la red', ['Un antivirus', 'Una pieza del PC', 'Un tipo de cable'], 'Funciona como la dirección de una casa.'),
      tMC('¿Qué hace un router?', 'Dirige los datos entre tu red e Internet', ['Guarda archivos en la nube', 'Enfría la computadora', 'Edita videos'], 'Reparte la conexión a los dispositivos.'),
      tMC('¿En qué se diferencia HTTPS de HTTP?', 'Protege los datos con cifrado', ['Es más lento a propósito', 'No usa Internet', 'Solo sirve para correo'], 'La S significa seguro.'),
      tVF('El Wi-Fi es una red inalámbrica.', true),
      tVF('Un servidor atiende pedidos de otros dispositivos.', true),
      tMT('Une cada protocolo con su uso.', [['HTTP', 'Ver páginas web'], ['FTP', 'Enviar y recibir archivos'], ['SSH', 'Controlar un equipo a distancia de forma segura'], ['HTTPS', 'Navegar con comunicación cifrada']]),
      tOR('Ordena cómo viaja un archivo por la red.', ['El archivo se divide en paquetes', 'Cada paquete recibe la dirección IP de destino', 'Los paquetes viajan por la red', 'El equipo destino reúne los paquetes y reconstruye el archivo']),
    ].concat(tCL('¿Qué protocolo usarías?', ['HTTP', 'FTP', 'SSH'], [['Abrir una página web', 0], ['Subir fotos a un servidor', 1], ['Administrar un servidor de forma segura', 2], ['Descargar un archivo de un servidor', 1]])) },

  { id:'seguridad', icon:'🛡️', name:'Ciberseguridad', desc:'Malware, phishing, contraseñas seguras y buenas prácticas.',
    items:[
      tMC('¿Qué es el malware?', 'Software diseñado para dañar o robar información', ['Un cable de red', 'Una pieza de la placa madre', 'Un programa de dibujo'], 'Incluye virus, troyanos y programas espía.'),
      tMC('¿Qué es el phishing?', 'Un engaño con mensajes o enlaces falsos para robar datos', ['Un tipo de memoria', 'Un antivirus', 'Un protocolo de archivos'], 'Nunca des tus datos desde un enlace sospechoso.'),
      tMC('¿Qué hace un antivirus?', 'Detecta y elimina software malicioso', ['Aumenta la RAM', 'Enfría el equipo', 'Crea contraseñas'], 'Debe mantenerse actualizado.'),
      tMC('¿Cuál es una contraseña más segura?', 'Una larga, con letras, números y símbolos', ['Tu nombre', '123456', 'La palabra "contraseña"'], 'Mientras más larga y variada, más difícil de adivinar.'),
      tMC('¿Qué es la verificación en 2 pasos?', 'Pedir un segundo comprobante además de la contraseña', ['Escribir la contraseña dos veces', 'Tener dos cuentas', 'Usar dos antivirus'], 'Protege la cuenta aunque roben la contraseña.'),
      tMC('¿Qué indica el candado en la barra del navegador?', 'Que la conexión está cifrada (HTTPS)', ['Que la página es gratis', 'Que no tiene publicidad', 'Que es del gobierno'], 'No garantiza que el sitio sea confiable, solo que la conexión es segura.'),
      tVF('Es seguro usar la misma contraseña en todas tus cuentas.', false, 'Si la roban, acceden a todo.'),
      tVF('Un enlace desconocido en un mensaje puede ser phishing.', true),
    ].concat(tCL('¿Buena o mala práctica?', ['Buena práctica', 'Mala práctica'], [['Activar la verificación en 2 pasos', 0], ['Compartir tu contraseña con amigos', 1], ['Mantener el antivirus actualizado', 0], ['Abrir archivos de desconocidos', 1], ['Hacer clic en "premios sorpresa"', 1]])) },

  { id:'energia', icon:'🔋', name:'Energía y electricidad', desc:'Fuentes renovables, baterías, circuitos y ahorro de energía.',
    items:[
      tMC('¿Cuál es una fuente de energía renovable?', 'La solar', ['El petróleo', 'El carbón', 'El gas natural'], 'El Sol no se agota.'),
      tMC('¿Qué energía se obtiene del viento?', 'Eólica', ['Solar', 'Nuclear', 'Hidráulica'], 'Los aerogeneradores la producen.'),
      tMC('Una batería sirve para…', 'Guardar energía para usarla después', ['Enfriar el computador', 'Conectarse a Internet', 'Dibujar imágenes'], 'Almacena energía eléctrica.'),
      tMC('En un circuito cerrado…', 'La corriente fluye y el aparato funciona', ['No pasa corriente', 'Se apaga todo', 'Solo funciona con pilas'], 'Cerrado significa camino completo.'),
      tMC('¿Qué ayuda a ahorrar energía?', 'Apagar lo que no usas', ['Dejar las luces prendidas', 'Cargar el celular todo el día', 'Usar todos los aparatos a la vez'], 'Lo que no se usa no debería gastar energía.'),
      tVF('El petróleo es una fuente de energía renovable.', false, 'Se agota y contamina.'),
      tVF('Un circuito abierto interrumpe el paso de la corriente.', true),
      tMT('Une cada energía con su origen.', [['Solar', 'El Sol'], ['Eólica', 'El viento'], ['Hidráulica', 'El agua en movimiento'], ['Geotérmica', 'El calor del interior de la Tierra']]),
    ].concat(tCL('¿Renovable o no renovable?', ['Renovable', 'No renovable'], [['Energía solar', 0], ['Petróleo', 1], ['Energía eólica', 0], ['Carbón', 1], ['Energía hidráulica', 0]])) },
];

/* Cada pregunta del banco recibe un id único (para marcarla y no repetirla) */
TEACHER_TOPICS.forEach(t => t.items.forEach((it, i) => { it.id = t.id + '-' + (i + 1); it.topic = t.id; }));

function teacherTopicById(id){ return TEACHER_TOPICS.find(t => t.id === id) || null; }
function teacherCloneItem(it){ return JSON.parse(JSON.stringify(it)); }
