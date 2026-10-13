const express = require('express');

const app = express();

app.use(express.json());
const PORT = 4000;

//ejemplo de una peticion por medio de ruta principal
app.get('/saludo', (req, res)=>{
    res.json({mensaje: 'Hola esta es una prueba en GET'});
})
//Metodos get querys
app.post('/eco', (req, res)=>{
    const {texto} = req.body;
    if(!texto){
        return res.status(400).json({error: 'El texto es obligatorio'})
    }
    res.status(201).json({eco:texto});
})

app.listen(PORT, ()=>{
    console.log(`servudir escuchando en el puerto : ${PORT}`)
})