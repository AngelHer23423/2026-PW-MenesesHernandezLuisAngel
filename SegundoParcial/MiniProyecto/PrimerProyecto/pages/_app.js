import Menu from'../components/Menu'
import '../styles/style.css';
export default function App ({component}, {pageProps}){
    return(
        <>
        <Menu/>
        <Component {...pageProps}/>
        </>
    );
}