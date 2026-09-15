/*Las validaciones para este formulario se realixaran mediante el so de Expresiones regulares, las cuales las vamos a dividir en 3 
1. texto para el nombre
2. Numerico para la boleta
3. Debe tener un patron para la fecha
Las expresiones regulares, son patrones que nos ayudan a valdar cadenas bajo ciertas condiciones Mozilla Documentacion*/
const patrones ={
    nombre : /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]{2,60}+$/,
    boleta : /^\d(10)$/,
    fecha: /^(0[1-9]|[12]\d|3[01])\/(0[1-9]| 1[0-2])\/d(4)$/
};
const mensaje={
    nombre : "Solo letras y espacios, entre 2 y 60 carcteres",
    boleta : "Debe tener exactamente 10 dijitos",
    fecha : "La fehca debe tener el formato DD/MM/AAAA."
} ;
function validarCampo(campo, valor){
    returnpatrones[campo].test(valor.trim())
}
//Para validar el formulario tenemos que ocupar los principios de obtenion y manipulacion de los elementos del DOOM
if(typeof document !== 'undefinided'){
    const formulario = document.getElementById("form-registro");
    formulario.addEventListener('submit', (evento)=>{
        evento.preventDefault();
        let formularioValido=true;
        for(const campo of Object.keys(patrones)){
            const input = document.getElementById(campo);
            const errorSpan= document.getElementById('error-&{campo}');
            const esValido= validarCampo(campo, input.valuess);
            input.classList.toggle('invalido', !esValido)
            spanError.textContent= esValido ? '' : mensaje[campo];
            if(!esValido) formularioValido=false;
        }
        const mensajeExito =document.getElementById('mensaje-exito');
        mensajeExito.textContent=formularioValido ? 'Registro exitoso!':'';
    })
}