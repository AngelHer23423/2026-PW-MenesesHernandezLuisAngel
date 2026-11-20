function crearModeloTokens(pool){

    //Necesitamos una funcion que se encargue de order insertar dentro de la bd los tokens que estaran revocados para que no se vuelvan a

    async function  revocar (jti, usuario, exp){
        await pool.query(
            'INSERT INTO tokens_revocados (jti, usuario, expira) VALUES (?,?,FROM_UNIXtIME(?))', [jti, usuario, exp]
        );
    }
//Funcion para saber si un token esta revocado
    async function estaRevocado(jti) {
        const [filas] = await pool.query(
            'SELECT 1 FROM tokens_revocados WHERE jti=?', [String(jti||'')]
        );
        return filas.length >0;
    }
//Funcion para consultar todos los tokens revocados
    async function listar() {
        const [filas] = await pool.query(
            'SELECT jti, usuario, expira, revocado_en FROM tokens_revocados ORDER BY revocado_en DESC, jti'
        );
        return filas;
    };
    return {revocar, estaRevocado, listar}
}
module.exports = { crearModeloTokens};