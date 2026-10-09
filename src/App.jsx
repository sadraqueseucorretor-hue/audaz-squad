import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Empreendimento from './pages/Empreendimento.jsx';
import Visualizador from './pages/Visualizador.jsx';

// Carregadas só quando abertas: o painel admin traz a biblioteca do Firebase (login/edição),
// que os corretores não precisam baixar — a página inicial abre bem mais rápido.
const TabelaValores = lazy(() => import('./pages/TabelaValores.jsx'));
const AdminGate = lazy(() => import('./pages/admin/AdminGate.jsx'));
const AdminLista = lazy(() => import('./pages/admin/AdminLista.jsx'));
const AdminEditor = lazy(() => import('./pages/admin/AdminEditor.jsx'));
const AdminMarca = lazy(() => import('./pages/admin/AdminMarca.jsx'));
const AdminTabela = lazy(() => import('./pages/admin/AdminTabela.jsx'));

const Carregando = () => (
  <div className="carregando-pagina" aria-live="polite">
    <span className="visor__spinner" /> Carregando…
  </div>
);

// HashRouter (#/rota) funciona em qualquer hospedagem estática sem configurar redirects.
// Se publicar em Vercel/Netlify com rewrite, pode trocar por BrowserRouter.
export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/empreendimento/:slug" element={<Empreendimento />} />
          <Route path="/tabela-valores" element={<TabelaValores />} />
          <Route path="/empreendimento/:slug/ver/:tipo/:indice" element={<Visualizador />} />
          <Route path="/admin" element={<AdminGate />}>
            <Route index element={<AdminLista />} />
            <Route path="novo" element={<AdminEditor />} />
            <Route path="editar/:slug" element={<AdminEditor />} />
            <Route path="marca" element={<AdminMarca />} />
            <Route path="tabela" element={<AdminTabela />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
