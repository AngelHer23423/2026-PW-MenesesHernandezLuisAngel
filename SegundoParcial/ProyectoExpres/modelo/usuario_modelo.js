const pool = require('../bd-local');

const COLUMNAS_PUBLICAS = 'id, nombre, correo, boleta, rol';

//logica de negocios, querys

//Consultar a todos
async function listar() {
    const[filas]= await pool.query(`SELECT ${COLUMNAS_PUBLICAS}FROM usuarios ORDER BY id`);
    return filas;
}

//Obtener por id
async function obtenerPorId() {
    const[filas]= await pool.query(`SELECT ${COLUMNAS_PUBLICAS}FROM usuarios WHERE ID = ?`);
    return filas[0];
}

//Registrar
async function crear({nombre, correo, contrasenaHash, boleta, rol}){
    const [info] = await pool.query(
        `INSERT INTO usuarios (nombre, correo, contrasena_hash, boleta, rol) VALUES (?, ?, ?, ?, ?)`, [nombre, correo, contrasenaHash, boleta, rol|| 'alumno']
    );
    return obtenerPorId(info.insertId);
}

//Update
async function actualizar(id, {nombre, correo, rol}) {
    const cambios = Object.entries({nombre, correo, rol}).filter(([, valor]) => valor !== undefined);
    if(cambios.length === 0) return obtenerPorId(id);

    const columnas = cambios.map(([columna]) => `${columna} = ?`).join(',');

    const [info] = await pool.query(`UPDATE usuarios SET ${columnas} WHERE id = ?`, [...cambios.map(([ , valor]) => valor), id]);

    if(info.affectedRows === 0) return undefined;
    return obtenerPorId(id);
}

//Eliminar 
async function eliminar(id) {
    const[filas]= await pool.query(`DELETE FROM usuarios WHERE ID = ?`, [id]);
    return info.affectedRows > 0;
}

//busca correo por hash
async function buscarPorCorreoConHash(params) {
    const[filas]= await pool.query('SELECT * FROM usuarios WHERE correo = ?' , [correo]);
    return filas[0];
}

module.exports={listar, obtenerPorId, crear, actualizar, eliminar, buscarPorCorreoConHash}

//Crear los modelos de las tablas talleres y asistencia
//Taller tiene registraralumno, consultar todos los talleres
//asistencia tiene registrarasistencia, consultarasistencia de talles
//talleres y asistencia_modelo