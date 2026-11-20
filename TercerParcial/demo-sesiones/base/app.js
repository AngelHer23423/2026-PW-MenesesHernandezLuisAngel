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
const crypto = require('crypto')
const jwt = require ('jsonwebtoken')
const {crearModeloTokens} = require ('.modelo/tokens.modelo');
const { error } = require('console');

const NOMBRE_COOKIE = 'connect.sid';

//Si hay una sesion preexistente obtenerla del almacen, sino crearla
function todasLasSesiones(almacen){
  return new Promise ((resolve, reject) => {
    const promesa = almacen.all((error, sesiones) => (error ? reject(error) : resolve(sesiones)));
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


app.use(
  session({
    name : NOMBRE_COOKIE,
    secret : process.env.SESSION_SECRET || 'secreto-solo.para-la-demo',
    store : almacen,
    resave : false,
    //no se crea la session ni la cookie
    saveUninitialized : false,
    rolling : config.rolling || false,
    cookie : {
      maxAge : config.maxAgeMs || 10*1000*60,
      httpOnly : config.httpOnly !== undefined ? config.httpOnly : true,
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
  return Date.now() - desde > config.maxAgeMs;
}

function requiereSesion(req, res, next){
  if(req.session.usuario && vencida(req.session)){
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

function requiereRol(rol){
  return (req, res, next)=>{
    if(req.session.usuario.rol !==rol){
      return res.status(403).json({error: `Eres ${req.session.usuario.usuario}, pero esta ruta es para ${rol}`});
    }
    next();
  };
}
  //vamos a definir las rutas de acceso
  app.get('/api/config', (req, res)=>{
    res.json(config);
  });
  //Vamos a crear una ruta para un usuario visitante, sin que inicie sesion
  app.post('/api/visita', (req, res)=>{
    if(!req.session) return res.json({error: 'no tiene acceso'});
    req.session.visitas = (req.session.visitas || 0 ) + 1;
    res.json({visitas : req.session.visitas, sesion : cortoId(req.sessionID)});
  });

  app.post('/api/login', async(req, res, next)=>{
    try{
      const {usuario, contrasena} = req.body || {};
      const datos = await usuarios.verificar(usuario, contrasena);
      if (!datos) return res.status(401).json({
        error: 'Usuario o contraseña incorrectos'
      });
      const antes = req.session.visitas !== undefined ? cortoId(req.sessionID) : null;
      const visitas = req.session.visitas || 0 ;

      //Tenemos que guardar los datos de la sesion
      const guardar = () => {
        req.session.usuario = datos;
        req.session.visitas = visitas;
        req.session.creada = Date.now();
        req.session.ultimoUso = Date.now();
        req.session.save((error)=>{
          if (error) return next(error);
          res.json({usuario:datos, sesionAntes: antes, sesionDespues:cortoId(req.sessionID)});
        });
      }
      if(config.regenerarAlEntrar){
        req.session.regenerate((error)=>(error ? next(error) : guardar() ));
      } else{
        guardar();
      }
    }catch(error){
      next(error);
    }
  });

  app.post('/api/logout', (req, res, next)=>{
    req.session.destroy((error)=>{
      if (error) return next(error);
      res.clearCookie(NOMBRE_COOKIE);
      res.json({mensaje: 'Sesion cerrada'})
    });
  });

  app.get('/api/sesion', requiereSesion, (req, res,)=>{
    const desde = config.rolling ? req.session.ultimoUso : req.session.creada;
    res.json({
      usuario : req.session.usuario,
      sesion : cortoId(req.sessionID),
      expiraEnSegundos : Math.max(0,Math.round((desde + config.maxAgeMs - Date.now())/1000))
    });

  })

  app.get('/api/perfil', requiereSesion, (req, res,)=>{
    req.session.visitas = (req.session.visitas || 0)+1;
    res.json({
      mensaje : `Hola, ${req.session.usuario.nombre}`,
      rol :  req.session.usuario.rol,
      visitas : req.session.visitas
    });
  });

  app.get('/api/admin/reporte', requiereSesion, requiereRol('admin'), (req, res)=>{
    res.json({ reporte: 'Talleres: 3 · Inscritos: 57 · Cupo libre: 18' });
  });
  //Vanos a desarrollar una prueba unitaria para verificar con V o F las pruebas ejecutadas

  app.get('/api/diagnostico/sesiones', async(req, res, next)=>{
    try{
      const sesiones = await todasLasSesiones(almacen);
      const lista = Object.entries(sesiones || {}).map(([id, s])=>({
        sesion : cortoId(id),
        esLaTuya : id === req.sessionID,
        usuario : s.usuario ? s.usuario.usuario : 'Sin iniciar sesion',
        visitas : s.visitas || 0,
        expira : s.cookie && s.cookie.expires,
      }));
      res.json({
        almacen: config.almacen,
        sesiones : lista
      });
    }catch(error){
      next(error);
    }
  });

  app.use(express.static(path.join(__dirname, 'public')));
  app.use((error, req, res, next)=>{
    console.error(error);
    res.status(500).json({error : 'Error del servidor'})
  })
  app.use('/api', (req, res)=>{
    res.status(404).json({error : 'Ruta no encontrada'})
  });

//Definir los datos del JWT

  const SECRETO_JWT = config.jwtSecreto || process.env.JWT_SECRET || 'secreto-jwt-solo-para-esta-demo';
  //Crear una funcion para poder verificar y firmar que el token sea autentico sino a volar
  function firmarToken(usuario){
    return jwt.sign(
      {
        sub : String(usuario.id), 
        usuario : usuario.usuario,
        nombre : usuario.nombre,
        rol : usuario.rol
      }, SECRETO_JWT,
      {
        algorithm : 'HS256',
        expiresIn : config.jwtExpiraSeg,
        jwtid: crypto.randomUUID(),
      }
    );
  }

  //Funcion para validar quien necesita un token dentro de la aplicacion entre el middleware

  async function requiereJWT(req, res, next) {
    const encabezado = req.headers.authorization || '';
    if(!encabezado.startWith('Bearer ')){
      return res.status(401).json({error : 'Falta un token valido'});
    }
    const token = encabezado.slice('Bearer '.length);
    let datos;
    try{
      datos=jwt.verify(token, SECRETO_JWT, {algorithms : ['HS256']});
    }catch(error){
      if(error === 'TokenExpiredError'){
        return res.status(401).json({error : '401 Token expirado, por favor renuevelo'})
      }
      return res.status(401).json({error: '401 Token Invalido'});
    }

    try{
      if(config.jwtRevocar && (await crearModeloTokens.estaRevocado(datos.jti))){
        return res.status(401).json({error : 'Token revocado'});
      }
    }catch(error){
      return next(error);
    }
    req.jwt = datos;
    next();
  }


  //403 El token es valido pero no el rol
  async function requiereRolJWT(rol) {
    return (req, res, next)=>{
      if(req.jwt.rol !== rol){
        return res.status(403).json({error: `Eres ${req.jwt.usuario} pero para esta ruta solo accede ${rol}`});
      }
      next();
    };
  }

  app.post('/api/jwt/login', async(req, res, next)=>{
    try{
      const {usuario, contrasena} = req.body ||{};
      const datos = await usuarios.verificar(usuario, contrasena);
      if(!datos) return res.status(401).json({error: 'Usuario o contraseña incorrectos'});
      res.json({token : firmarToken(datos), 
        usuario : datos})
    }catch(error){
      next(error);
    }
  })

  app.get('/api/jwt/perfil', requiereJWT, (req, res)=>{
    res.json({
      mensaje : `Hola ${req.jwt.nombre}`,
      rol : req.jwt.rol,
      expiraEnSegundos : Math.max(0, req.jwt.exp - Math.floor(Date.now()/1000)),
    })
  })

  app.get('/api/jwt/admin/reporte', requiereJWT, requiereRol('admin'), (req, res)=>{
    res.json({reporte : 'Talleres : 3'});
  })

  app.post('/api/jwt/refresh', requiereJWT, (req, res)=>{
    const { sub, usuario, nombre, rol} = req.jwt
    res.json({token: firmarToken({id: sub, usuario, nombre, rol})});
  });

  app.post('/api/jwt/logout', requiereJWT, async(req, res, next)=>{
    try{
      if(config.jwtRevocar){
        await crearModeloTokens.revocar(req.jwt.jti, req.jwt.usuario, req.jwt.exp);
        return res.json({mensaje: 'Token revocado en el servidor, se registrara en la lista negra'});
      }
      res.json({mensaje: 'El servidor no guarda nada'});
    }catch(error){
      next(error);
    }
  })

  return app;
}
module.exports = {crearApp, NOMBRE_COOKIE}

//tarea 1 deberan de realizar una infografia sobre la autenticacion con el uso de jwt y como se implementa para el domingo

//tarea 2 con el uso del archivo que se les va a a proveer deberan de completar y realizar las pruebas al ejercicio de sesiones en el archivo llamado xxx para implementar en el archivo demo.js, se revisara la siguiente clase