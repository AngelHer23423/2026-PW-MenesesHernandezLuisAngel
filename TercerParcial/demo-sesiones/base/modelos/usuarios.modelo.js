// Consultas a la tabla usuarios. Siempre con ? (consulta parametrizada), nunca pegando texto en el SQL.
const bcrypt = require('bcryptjs');

function crearModeloUsuarios(pool) {
  // Regresa el usuario (sin el hash) si la contraseña es correcta, o null si no.
  async function verificar(usuario, contrasena) {
    if (!usuario || !contrasena) return null;

    const [filas] = await pool.query(
      'SELECT id, usuario, nombre, rol, contrasena_hash FROM usuarios WHERE usuario = ?',
      [usuario]
    );

    const encontrado = filas[0];
    if (!encontrado) return null;

    const coincide = await bcrypt.compare(contrasena, encontrado.contrasena_hash);
    if (!coincide) return null;

    // Devolvemos los datos del usuario omitiendo el hash de la contraseña
    const { contrasena_hash, ...datosUsuario } = encontrado;
    return datosUsuario;
  }

  return { verificar };
}

module.exports = { crearModeloUsuarios };