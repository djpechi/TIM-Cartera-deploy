import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, FileText, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: facturasPendientes, isLoading: facturasLoading } = trpc.dashboard.facturasPendientes.useQuery();
  const { data: historial, isLoading: historialLoading } = trpc.dashboard.historialCargas.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const topFacturas = facturasPendientes?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Resumen general del sistema de gestión de cartera vencida
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Cartera Pendiente
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(Number(stats?.totalCarteraPendiente || 0))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Todas las facturas pendientes
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Vencidas &gt;8 días: {formatCurrency(Number(stats?.carteraVencidaMayor8Dias || 0))}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes con Atraso
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.clientesConAtraso || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clientes con pagos vencidos
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Facturas Pendientes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.facturasPendientes || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de facturas sin pagar
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Últimas Cargas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.ultimasCargasCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Archivos procesados
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Facturas con Mayor Atraso */}
        <Card>
          <CardHeader>
            <CardTitle>Facturas con Mayor Atraso</CardTitle>
            <CardDescription>
              Top 5 facturas con más días vencidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {facturasLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topFacturas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay facturas pendientes
              </div>
            ) : (
              <div className="space-y-3">
                {topFacturas.map((factura) => (
                  <div
                    key={factura.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{factura.folio}</span>
                        <Badge variant="outline" className="status-overdue">
                          {factura.diasAtraso} días
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {factura.nombreCliente}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(Number(factura.importeTotal))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {factura.diasAtraso || 0} días
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href="/facturas">
                <Button variant="outline" className="w-full">
                  Ver Todas las Facturas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Historial de Cargas Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Cargas</CardTitle>
            <CardDescription>
              Últimos archivos procesados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historialLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !historial || historial.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay cargas registradas</p>
                <Link href="/upload">
                  <Button className="mt-4">
                    Cargar Primer Archivo
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {historial.slice(0, 5).map((carga) => (
                  <div
                    key={carga.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {carga.nombreArchivo}
                        </span>
                        <Badge
                          variant={
                            carga.estatus === 'completado'
                              ? 'default'
                              : carga.estatus === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {carga.estatus}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(carga.createdAt)}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-green-600">
                        {carga.registrosExitosos} exitosos
                      </p>
                      {(carga.registrosError ?? 0) > 0 && (
                        <p className="text-red-600">
                          {carga.registrosError} errores
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href="/upload">
                <Button variant="outline" className="w-full">
                  Cargar Nuevo Archivo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Accede rápidamente a las funciones principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/upload">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <FileText className="h-6 w-6" />
                <span>Cargar Archivos XLSX</span>
              </Button>
            </Link>
            <Link href="/reportes">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>Ver Reportes</span>
              </Button>
            </Link>
            <Link href="/configuracion">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <DollarSign className="h-6 w-6" />
                <span>Configurar Sistema</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
