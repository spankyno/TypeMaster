/**
 * Vocabulario frecuente en español (con tildes correctas) para generación de tests.
 * Incluye palabras de uso general y términos técnicos ligeros.
 */
export const SPANISH_WORDS = [
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a",
  "en", "con", "por", "para", "sin", "sobre", "entre", "hacia", "hasta", "desde", "durante", "mediante",
  "según", "contra", "bajo", "y", "o", "pero", "sino", "aunque", "porque", "pues", "si", "como",
  "cuando", "donde", "mientras", "que", "qué", "quien", "quién", "cual", "cuál", "cuyo", "esto", "esta",
  "estos", "estas", "eso", "esa", "aquel", "aquella", "ello", "yo", "tú", "él", "ella", "nosotros",
  "vosotros", "ellos", "ellas", "me", "te", "se", "nos", "os", "le", "les", "lo", "mi",
  "tu", "su", "nuestro", "vuestro", "mío", "tuyo", "ser", "estar", "haber", "tener", "hacer", "poder",
  "decir", "ir", "ver", "dar", "saber", "querer", "llegar", "pasar", "deber", "poner", "parecer", "quedar",
  "creer", "hablar", "llevar", "dejar", "seguir", "encontrar", "llamar", "venir", "pensar", "salir", "volver", "tomar",
  "conocer", "vivir", "sentir", "tratar", "mirar", "contar", "empezar", "esperar", "buscar", "existir", "entrar", "trabajar",
  "escribir", "perder", "producir", "ocurrir", "entender", "pedir", "recibir", "recordar", "terminar", "permitir", "aparecer", "conseguir",
  "comenzar", "servir", "sacar", "necesitar", "mantener", "resultar", "leer", "caer", "cambiar", "presentar", "crear", "abrir",
  "considerar", "oír", "acabar", "convertir", "ganar", "formar", "traer", "partir", "morir", "aceptar", "realizar", "suponer",
  "comprender", "lograr", "explicar", "preguntar", "tocar", "reconocer", "estudiar", "alcanzar", "nacer", "dirigir", "correr", "utilizar",
  "pagar", "ayudar", "gustar", "jugar", "escuchar", "cumplir", "ofrecer", "descubrir", "levantar", "intentar", "usar", "decidir",
  "responder", "aprender", "surgir", "repetir", "olvidar", "comprar", "tiempo", "año", "día", "vez", "hombre", "mujer",
  "vida", "mundo", "país", "casa", "parte", "lugar", "caso", "cosa", "persona", "hora", "mano", "agua",
  "niño", "niña", "trabajo", "forma", "gobierno", "empresa", "grupo", "problema", "estado", "sistema", "lado", "medio",
  "nombre", "número", "pueblo", "punto", "tipo", "fin", "historia", "guerra", "paz", "fuerza", "ciudad", "camino",
  "manera", "sentido", "momento", "palabra", "derecho", "verdad", "motivo", "razón", "ejemplo", "resultado", "cambio", "orden",
  "nivel", "valor", "calidad", "cantidad", "espacio", "cuerpo", "cabeza", "ojo", "cara", "voz", "luz", "noche",
  "mañana", "tarde", "semana", "mes", "siglo", "minuto", "segundo", "libro", "papel", "carta", "mesa", "puerta",
  "ventana", "calle", "plaza", "campo", "mar", "río", "monte", "sol", "aire", "fuego", "tierra", "árbol",
  "flor", "animal", "perro", "gato", "comida", "pan", "leche", "carne", "fruta", "color", "blanco", "negro",
  "rojo", "verde", "azul", "amarillo", "grande", "pequeño", "nuevo", "viejo", "bueno", "malo", "mejor", "peor",
  "alto", "largo", "corto", "joven", "mayor", "menor", "mismo", "otro", "todo", "poco", "mucho", "varios",
  "alguno", "ninguno", "primero", "último", "único", "posible", "necesario", "importante", "diferente", "igual", "fácil", "difícil",
  "rápido", "lento", "claro", "oscuro", "fuerte", "débil", "rico", "pobre", "feliz", "triste", "libre", "cierto",
  "falso", "próximo", "lejano", "simple", "complejo", "completo", "vacío", "lleno", "abierto", "cerrado", "público", "privado",
  "social", "político", "económico", "cultural", "natural", "humano", "personal", "general", "especial", "principal", "más", "menos",
  "muy", "tan", "tanto", "también", "tampoco", "solo", "sólo", "aún", "todavía", "ya", "siempre", "nunca",
  "jamás", "ahora", "antes", "después", "luego", "entonces", "aquí", "allí", "ahí", "cerca", "lejos", "dentro",
  "fuera", "arriba", "abajo", "adelante", "atrás", "bien", "mal", "así", "cómo", "cuándo", "dónde", "cuánto",
  "además", "incluso", "quizá", "acaso", "apenas", "casi", "bastante", "teclado", "pantalla", "programa", "código", "desarrollo",
  "ingeniería", "diseño", "interfaz", "usuario", "experiencia", "rendimiento", "velocidad", "precisión", "exactitud", "práctica", "entrenamiento", "progreso",
  "constancia", "esfuerzo", "memoria", "cerebro", "enfoque", "latencia", "servidor", "cliente", "datos", "consulta", "seguridad", "sesión",
  "token", "nube", "despliegue", "versión", "rama", "algoritmo", "estructura", "método", "función", "variable", "objeto", "clase",
  "proceso", "proyecto", "equipo", "fluido", "ágil", "dinámico", "eficiente", "óptimo", "limpio", "elegante", "creativo", "inteligente",
  "escritura", "lectura", "mecanografía", "pulsación", "dedo", "postura", "ritmo", "error", "acierto", "métrica", "estadística", "gráfico",
  "historial", "objetivo", "meta", "reto", "logro", "racha", "amigo", "familia", "padre", "madre", "hijo", "hermano",
  "escuela", "universidad", "profesor", "estudiante", "examen", "nota", "curso", "idea", "sueño", "miedo", "amor", "odio",
  "alegría", "dolor", "salud", "enfermedad", "médico", "hospital", "dinero", "precio", "compra", "venta", "mercado", "tienda",
  "viaje", "avión", "tren", "coche", "bicicleta", "destino", "origen", "mapa", "ruta", "música", "canción", "película",
  "teatro", "deporte", "juego", "partido", "victoria", "derrota", "noticia", "periódico", "radio", "televisión", "internet", "red",
  "mensaje", "correo", "teléfono", "foto", "imagen", "vídeo", "archivo", "documento", "informe", "reunión", "charla", "debate",
  "opinión", "voto", "ley", "justicia", "libertad", "obligación", "permiso", "regla", "norma", "costumbre",
];

export const SPANISH_QUOTES = [
  "La simplicidad es la máxima sofisticación.",
  "El éxito consiste en ir de fracaso en fracaso sin perder el entusiasmo.",
  "No hay viento favorable para el que no sabe dónde va.",
  "La práctica hace al maestro y la constancia supera al talento.",
  "Escribe código como si el tipo que va a mantenerlo fuera un psicópata violento que sabe dónde vives.",
  "El arte de la programación es el arte de organizar la complejidad.",
  "La única forma de hacer un gran trabajo es amar lo que haces.",
  "Piensa dos veces, programa una vez.",
  "La velocidad sin precisión no sirve de nada en el teclado.",
  "Cada pulsación te acerca un paso más al dominio absoluto de la mecanografía.",
  "El conocimiento se multiplica cuando se comparte.",
  "No cuentes los días, haz que los días cuenten.",
  "La disciplina es el puente entre metas y logros.",
  "Un viaje de mil millas comienza con un solo paso.",
  "La paciencia es amarga, pero su fruto es dulce.",
  "Quien no arriesga no gana, pero quien no practica no mejora.",
  "El hábito no hace al monje, pero sí al mecanógrafo veloz.",
  "Aprender sin pensar es vano; pensar sin aprender es peligroso.",
  "La excelencia no es un acto, sino un hábito.",
  "Haz de cada error una lección y de cada lección un avance.",
  "El teclado es el pincel del pensador moderno.",
  "Primero la precisión, después la velocidad: ese es el orden natural.",
  "Lo que se practica con atención se convierte en segunda naturaleza.",
  "No busques la perfección; busca el progreso constante.",
  "La mente clara y los dedos firmes escriben el futuro.",
  "En la repetición consciente nace el dominio.",
  "Cada día un poco mejor que el anterior.",
  "El silencio del error corregido es el sonido del aprendizaje.",
  "La constancia vence a la inspiración cuando esta falta.",
  "Escribe despacio para pensar, y deprisa para crear.",
];

export const QWERTY_ES_KEYS = [
  [
    { key: 'º', shift: 'ª', finger: 'l5' }, { key: '1', shift: '!', finger: 'l5' }, { key: '2', shift: '"', finger: 'l4' }, { key: '3', shift: '·', finger: 'l3' }, { key: '4', shift: '$', finger: 'l2' }, { key: '5', shift: '%', finger: 'l2' }, { key: '6', shift: '&', finger: 'r2' }, { key: '7', shift: '/', finger: 'r2' }, { key: '8', shift: '(', finger: 'r3' }, { key: '9', shift: ')', finger: 'r4' }, { key: '0', shift: '=', finger: 'r5' }, { key: "'", shift: '?', finger: 'r5' }, { key: '¡', shift: '¿', finger: 'r5' }
  ],
  [
    { key: 'q', shift: 'Q', finger: 'l5' }, { key: 'w', shift: 'W', finger: 'l4' }, { key: 'e', shift: 'E', finger: 'l3' }, { key: 'r', shift: 'R', finger: 'l2' }, { key: 't', shift: 'T', finger: 'l2' }, { key: 'y', shift: 'Y', finger: 'r2' }, { key: 'u', shift: 'U', finger: 'r2' }, { key: 'i', shift: 'I', finger: 'r3' }, { key: 'o', shift: 'O', finger: 'r4' }, { key: 'p', shift: 'P', finger: 'r5' }, { key: '`', shift: '^', finger: 'r5' }, { key: '+', shift: '*', finger: 'r5' }
  ],
  [
    { key: 'a', shift: 'A', finger: 'l5' }, { key: 's', shift: 'S', finger: 'l4' }, { key: 'd', shift: 'D', finger: 'l3' }, { key: 'f', shift: 'F', finger: 'l2' }, { key: 'g', shift: 'G', finger: 'l2' }, { key: 'h', shift: 'H', finger: 'r2' }, { key: 'j', shift: 'J', finger: 'r2' }, { key: 'k', shift: 'K', finger: 'r3' }, { key: 'l', shift: 'L', finger: 'r4' }, { key: 'ñ', shift: 'Ñ', finger: 'r5' }, { key: 'á', shift: 'Á', finger: 'r5' }, { key: 'ç', shift: 'Ç', finger: 'r5' }
  ],
  [
    { key: '<', shift: '>', finger: 'l5' }, { key: 'z', shift: 'Z', finger: 'l5' }, { key: 'x', shift: 'X', finger: 'l4' }, { key: 'c', shift: 'C', finger: 'l3' }, { key: 'v', shift: 'V', finger: 'l2' }, { key: 'b', shift: 'B', finger: 'l2' }, { key: 'n', shift: 'N', finger: 'r2' }, { key: 'm', shift: 'M', finger: 'r2' }, { key: ',', shift: ';', finger: 'r3' }, { key: '.', shift: ':', finger: 'r4' }, { key: '-', shift: '_', finger: 'r5' }
  ],
  [
    { key: ' ', shift: ' ', finger: 'thumbs' }
  ]
];
