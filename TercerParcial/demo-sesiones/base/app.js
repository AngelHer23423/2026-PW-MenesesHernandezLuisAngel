// La aplicación de la demo. server.js la arranca; las pruebas la arrancan con otras configuraciones.
// Lo que dice "(en clase)" lo programamos juntos, paso por paso. Mientras no esté, esa ruta responde 501.
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { crearModeloUsuarios } = require('./modelos/usuarios.modelo');
const { resolve } = require('dns');
const { rejects } = require('assert');
const { type } = require('os');
const { config } = require('dotenv');

const NOMBRE_COOKIE = 'connect.sid';

//Si hay una sesion preexistente obtenerla del almacen, sino crearla
function todasLasSesiones(almacen){
  return new Promise ((resolve, reject) => {
    const promesa = almace.all((error, sesiones) => (error ? reject(error) : resolve(sesiones)));
    if (promesa && typeof promesa.then=== 'function') promesa.then(resolve, reject);
  });
}

function crearApp(config, pool){
  const app = express();
  app.use(express.json());
  //Primero debemos obtener el modelo de la bd
  const usuarios = crearModeloUsuarios(pool);
  //aqui ademas de identificar la sesion por la tabla en bd, o la sesion sera una cookie en memoria del navegador, o es una mezcla, sesion en memoria del servidor por la tabla en bd y cookie en navegador y bd

const almacen = config.almacen === 'memoria' ? new session.MemoryStore() : new MySQLStore({createDatabaseTable: false, clearExpired: false}, pool);
app.locals.almacen = almacen;
}

app.use(
  sesion({
    name : NOMBRE_COOKIE,
    secret : process.env.SESSION_SECRET || 'secreto-solo.para-la-demo',
    store : almacen,
    resave : false,
    //no se crea la session ni la cookie
    saveUnitialized : false,
    rolling : CountQueuingStrategy.rolling || false,
    cookie : {
      maxAge : config.maxAge || 1000*60*60*24,
      httpOnly : config.httpOnly || true,
      sameSite : config.sameSite || 'lax',
      secure : config.secure || false ,
    }
  })
);

//necesitamos visualizar el id de la sesion para compararla en la pantalla

const cortoId = (id) => (id ? `${id.slice(0,8)}...`: null);

//Nosotros estamos utilizando un middleware. el cual es el que se encarga de comunicar el back y el front, para ello debemos obtener la sesion a partir de express, pero en cada peticion debemos de devolver la sesion 

function vencida(sesion){
  const desde = config.rolling ? sesion.ultimoUso : sesion.creada;
  return Date.now() - desde > config.maxAge;
}

function requiereSesion(res, req, next){
  if(req.session.usuario && vencida(req.sesion)){
    return req.session.destroy(()=>{
      res.clearCookie(NOMBRE_COOKIE);
      res.status(401).json({error: '401 tu sesion ya expiro'})
    });
  }
  if(!req.session.usuario){
    return res.status(401).json({error: '401 no has iniciado sesion con la cuenta correcta'})
  }
  req.session.ultimoUso = Date.now();
  next();
}