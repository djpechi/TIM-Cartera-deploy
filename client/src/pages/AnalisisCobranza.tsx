import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Clock, DollarSign } from "lucide-react";



const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
};

export default function AnalisisCobranza() {
  const { data: dashboardData } = trpc.dashboard.stats.useQuery();
  const { data: evolucion, isLoading: loadingEvolucion } = trpc.analisis.evolucionCobranza.useQuery();
  const { data: topDeudores, isLoading: loadingTop } = trpc.analisis.topDeudores.useQuery({ limit: 10 });


  // Procesar datos de evolución para el gráfico de líneas
  const evolucionData = evolucion ? (() => {
    const mesesMap = new Map<string, { mes: string; pagadas: number; pendientes: number }>();
    
    evolucion.forEach((item: any) => {
      if (!mesesMap.has(item.mes)) {
        mesesMap.set(item.mes, { mes: item.mes, pagadas: 0, pendientes: 0 });
      }
      const mesData = mesesMap.get(item.mes)!;
      if (item.estadoPago === 'pagado') {
        mesData.pagadas = Number(item.monto);
      } else {
        mesData.pendientes = Number(item.monto);
      }
    });

    return Array.from(mesesMap.values());
  })() : [];

  // Usar datos del dashboard para totales
  const totalPendiente = dashboardData?.totalCarteraPendiente || 0;
  const totalFacturas = dashboardData?.facturasPendientes || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análisis de Cobranza</h1>
        <p className="text-muted-foreground">
          Visualización de tendencias y distribución de cartera vencida
        </p>
      </div>

      {/* Cards de resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card key="total-pendiente">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendiente)}</div>
            <p className="text-xs text-muted-foreground">
              Saldo total por cobrar
            </p>
          </CardContent>
        </Card>

        <Card key="facturas-pendientes">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFacturas}</div>
            <p className="text-xs text-muted-foreground">
              Total de facturas sin pagar
            </p>
          </CardContent>
        </Card>

        <Card key="clientes-morosos">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Morosos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topDeudores?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Con saldo pendiente
            </p>
          </CardContent>
        </Card>

        <Card key="promedio-atraso">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Atraso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topDeudores && topDeudores.length > 0
                ? Math.round(
                    topDeudores.reduce((sum, d) => sum + Number(d.diasPromedioAtraso || 0), 0) /
                      topDeudores.length
                  )
                : 0}{' '}
              días
            </div>
            <p className="text-xs text-muted-foreground">
              Días promedio de atraso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de evolución temporal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Cobranza</CardTitle>
          <CardDescription>
            Comparación mensual de facturas pagadas vs pendientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingEvolucion ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Cargando datos...</p>
            </div>
          ) : evolucionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolucionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="pagadas" stroke="#10b981" name="Pagadas" strokeWidth={2} />
                <Line type="monotone" dataKey="pendientes" stroke="#ef4444" name="Pendientes" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de top deudores */}
      <Card>
          <CardHeader>
            <CardTitle>Top 10 Clientes con Mayor Deuda</CardTitle>
            <CardDescription>
              Ranking de clientes por saldo pendiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Cargando datos...</p>
              </div>
            ) : topDeudores && topDeudores.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topDeudores} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="cliente" width={150} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="totalDeuda" fill="#ef4444" name="Deuda Total" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
