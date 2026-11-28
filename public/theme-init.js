// Aplica el tema antes del primer pintado (evita el parpadeo claro→oscuro).
// Archivo externo (no inline) para poder usar una CSP sin 'unsafe-inline' en script-src.
try {
  var d = localStorage.getItem('typemaster_darkmode');
  if (d === null || d === 'true') document.documentElement.classList.add('dark');
} catch (e) {
  document.documentElement.classList.add('dark');
}
