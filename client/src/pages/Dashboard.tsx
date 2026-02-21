import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, FileText, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatearMoneda } from "@/../../shared/formatoMoneda";

export default function Dashboard() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: facturasPendientes, isLoading: facturasLoading } = trpc.dashboard.facturasPendientes.useQuery();
  const { data: historial, isLoading: historialLoading } = trpc.dashboard.historialCargas.useQuery();
  const { data: facturasFaltantes, isLoading: faltantesLoading } = trpc.dashboard.facturasFaltantes.useQuery();

  const formatCurrency = (value: number) => {
    return formatearMoneda(value, user?.formatoMoneda || "completo");
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

      {/* Facturas Faltantes */}
      {facturasFaltantes && facturasFaltantes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Facturas Faltantes Detectadas
                </CardTitle>
                <CardDescription>
                  Estas facturas están en el archivo de pendientes pero no se encontraron en la base de datos
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Exportar a Excel
                  const data = facturasFaltantes.map(f => ({
                    Folio: f.folio,
                    Saldo: f.saldo,
                    Fecha: f.fecha ? new Date(f.fecha).toLocaleDateString('es-MX') : '',
                    'Fecha Vencimiento': f.fechaVencimiento ? new Date(f.fechaVencimiento).toLocaleDateString('es-MX') : '',
                    'Archivo Origen': f.archivoOrigen,
                    'Detectado': new Date(f.detectadoEn).toLocaleDateString('es-MX')
                  }));
                  
                  const csv = [
                    Object.keys(data[0]).join(','),
                    ...data.map(row => Object.values(row).join(','))
                  ].join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `facturas_faltantes_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
              >
                Exportar Lista
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {faltantesLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg border bg-white">
                  <div className="grid grid-cols-5 gap-4 p-3 font-medium text-sm border-b bg-muted/50">
                    <div>Folio</div>
                    <div className="text-right">Saldo</div>
                    <div>Fecha</div>
                    <div>Vencimiento</div>
                    <div>Detectado</div>
                  </div>
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {facturasFaltantes.map((faltante) => (
                      <div key={faltante.id} className="grid grid-cols-5 gap-4 p-3 text-sm">
                        <div className="font-medium">{faltante.folio}</div>
                        <div className="text-right font-medium text-amber-700">
                          {formatCurrency(Number(faltante.saldo))}
                        </div>
                        <div className="text-muted-foreground">
                          {faltante.fecha ? new Date(faltante.fecha).toLocaleDateString('es-MX') : '-'}
                        </div>
                        <div className="text-muted-foreground">
                          {faltante.fechaVencimiento ? new Date(faltante.fechaVencimiento).toLocaleDateString('es-MX') : '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(faltante.detectadoEn)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  💡 <strong>Acción requerida:</strong> Carga estas facturas desde los archivos TT (Tim Transp) o TV (Tim Value) antes de volver a cargar el archivo de pendientes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
