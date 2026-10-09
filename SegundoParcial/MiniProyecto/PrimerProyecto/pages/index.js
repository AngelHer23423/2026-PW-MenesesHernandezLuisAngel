
import Link from "next/link";

export default function Home(){
    return(
        <main>
            <h1>Ejemplo de miniproyecto con Next</h1>
            <p>
                <Link href="./practica/1" >Ir a /Practica/1 como ruta dinamica</Link>
            </p>
        </main>
    );
}