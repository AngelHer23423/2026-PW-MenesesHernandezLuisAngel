import { Main } from "next/document";
import Link from "next/link";

export default function Home(){
    return(
        <main>
            <h1>Ejemplo de miniproyecto con Next</h1>
            <p>
                <Linnk href="./practica1" >Ir a /Practica/1 como ruta dinamica</Linnk>
            </p>
        </main>
    );
}