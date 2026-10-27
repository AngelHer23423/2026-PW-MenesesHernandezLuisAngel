import Link from 'next/link';

export default function Home() {
    return (
        <main>
            <h1>Ejemplo de miniproyecto con Next</h1>

            <p>
                Sistema de talleres desarrollado con Next.js y consumo de API.
            </p>

            <div style={{
                display: 'flex',
                gap: '16px',
                marginTop: '24px'
            }}>
            <Link href="/talleres">Ver talleres</Link>
            <Link href="/perfil">Mi perfil</Link>
            <Link href="/practica/1">Ruta dinámica de ejemplo</Link>
        </div>
        </main>
    );
}