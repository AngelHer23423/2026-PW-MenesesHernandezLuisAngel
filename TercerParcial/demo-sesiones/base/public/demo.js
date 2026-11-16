// Atajo para seleccionar elementos del HTML sin repetir document.getElementById constantemente.
const $ = (id) => document.getElementById(id);

// Centraliza todas las peticiones a la API para manejar encabezados y errores en un solo lugar.
async function llamar(metodo, url, cuerpo) {
  const opciones = { method: metodo, headers: {} };

  // Solo se agrega el encabezado JSON cuando se envían datos, para que express.json() los procese bien.
  if (cuerpo) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(url, opciones);
  let datos = null;

  // Evita que la página se trabe si el servidor responde algo que no sea JSON válido.
  try { datos = await respuesta.json(); } catch { datos = null; }

  // Devuelve el status aparte porque fetch no lanza error en respuestas 401 o 403.
  return { status: respuesta.status, datos };
}

// Registra el historial de peticiones y respuestas en la tarjeta 3.
function anotar(metodo, url, status, datos) {
  const li = document.createElement('li');
  const clase = status < 300 ? 'ok' : status === 401 ? 'e401' : status === 403 ? 'e403' : 'error';
  li.innerHTML = `<span class="codigo ${clase}">${status}</span> <code>${metodo} ${url}</code>`;

  const cuerpo = document.createElement('pre');
  // Se usa textContent en lugar de innerHTML para prevenir ataques XSS con texto que venga del servidor.
  cuerpo.textContent = JSON.stringify(datos, null, 2);
  li.appendChild(cuerpo);

  // Inserta el elemento arriba para que la petición más reciente quede siempre visible primero.
  $('bitacora').prepend(li);
}

// Consulta si hay una sesión activa en el servidor para actualizar el estado en la tarjeta 1.
async function refrescarEstado() {
  const { status, datos } = await llamar('GET', '/api/sesion');
  const estado = $('estado');

  if (status === 200) {
    estado.textContent = `${datos.usuario.nombre} · rol ${datos.usuario.rol} · sesión ${datos.sesion} · vence en ${datos.expiraEnSegundos} s`;
    estado.className = 'estado con-sesion';
  } else {
    estado.textContent = 'Sin sesión (el servidor responde 401)';
    estado.className = 'estado sin-sesion';
  }

  // Comprueba si JavaScript puede leer la cookie (si httpOnly está en true, aparecerá vacío).
  $('cookie-js').textContent = document.cookie || '(vacío)';
}

// Obtiene las sesiones activas y reconstruye la tabla de diagnóstico en la tarjeta 4.
async function refrescarSesiones() {
  const { datos: respuesta } = await llamar('GET', '/api/diagnostico/sesiones');
  const datos = respuesta ? respuesta.sesiones : [];

  if (respuesta) {
    $('donde').textContent = respuesta.almacen === 'memoria'
      ? 'En la MEMORIA del servidor: se borra al reiniciarlo.'
      : 'En MySQL, tabla sessions. En Workbench: SELECT * FROM demo_sesiones.sessions;';
  }

  const cuerpo = $('tabla-sesiones');
  // Limpia la tabla antes de volverla a llenar para evitar que se dupliquen las filas.
  cuerpo.innerHTML = '';

  if (!datos || datos.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="4">(sin sesiones)</td></tr>';
    return;
  }

  for (const s of datos) {
    const fila = document.createElement('tr');
    if (s.esLaTuya) fila.className = 'tuya';
    const vence = s.expira ? new Date(s.expira).toLocaleTimeString() : '—';

    for (const valor of [s.sesion + (s.esLaTuya ? ' (la tuya)' : ''), s.usuario, s.visitas, vence]) {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    }
    cuerpo.appendChild(fila);
  }
}

// Agrupa ambas actualizaciones porque cada acción modifica tanto el estado como la tabla.
async function refrescarTodo() {
  await refrescarEstado();
  await refrescarSesiones();
}

// Rellena automáticamente la contraseña de prueba al seleccionar otro usuario.
$('usuario').addEventListener('change', () => {
  $('contrasena').value = `${$('usuario').value}12345`;
});

// Envía el formulario de login por fetch evitando que el navegador recargue la página.
$('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const cuerpo = { usuario: $('usuario').value, contrasena: $('contrasena').value };
  const { status, datos } = await llamar('POST', '/api/login', cuerpo);
  anotar('POST', '/api/login', status, datos);
  await refrescarTodo();
});

// Asigna el evento click a todos los botones de prueba leyendo su método y ruta desde dataset.
for (const boton of document.querySelectorAll('[data-url]')) {
  boton.addEventListener('click', async () => {
    const { metodo, url } = boton.dataset;
    const { status, datos } = await llamar(metodo, url);
    anotar(metodo, url, status, datos);
    await refrescarTodo();
  });
}

$('btn-refrescar').addEventListener('click', refrescarTodo);
$('btn-sesiones').addEventListener('click', refrescarSesiones);

// Carga inicial: pide la configuración y refresca los datos porque el script está al final del body.
llamar('GET', '/api/config').then(({ datos }) => {
  $('config').textContent = JSON.stringify(datos, null, 2);
});
refrescarTodo();