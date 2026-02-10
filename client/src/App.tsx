import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Facturas from "./pages/Facturas";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import AccessDenied from "./pages/AccessDenied";
import Usuarios from "./pages/Usuarios";
import GestionClientes from "./pages/GestionClientes";
import Proyeccion from "./pages/Proyeccion";
import TablaProyeccion from "./pages/TablaProyeccion";
import EstadosCuenta from "./pages/EstadosCuenta";
import AnalisisCobranza from "./pages/AnalisisCobranza";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/upload" component={Upload} />
        <Route path="/facturas" component={Facturas} />
        <Route path="/proyeccion" component={Proyeccion} />
        <Route path="/tabla-proyeccion" component={TablaProyeccion} />
        <Route path="/estados-cuenta" component={EstadosCuenta} />
        <Route path="/analisis-cobranza" component={AnalisisCobranza} />
        <Route path="/reportes" component={Reportes} />
        <Route path="/gestion-clientes" component={GestionClientes} />
        <Route path="/configuracion" component={Configuracion} />
        <Route path="/usuarios" component={Usuarios} />
        <Route path="/access-denied" component={AccessDenied} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
