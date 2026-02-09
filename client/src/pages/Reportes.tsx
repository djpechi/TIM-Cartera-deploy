import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Reportes() {
  const { data: carteraVencida, isLoading: loadingCartera } = trpc.reportes.carteraVencida.useQuery();
  const { data: evolucion, isLoading: loadingEvolucion } = trpc.reportes.evolucionTemporal.useQuery({ meses: 6 });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const exportCarteraToCSV = () => {
    if (!carteraVencida || carteraVencida.length === 0) return;

    const headers = [
      "Cliente",
      "Facturas",
      "Total Saldo",
      "Total Intereses",
      "Total con Intereses",
    ];

    const rows = carteraVencida.map((item: any) => [
      item.cliente,
      item.facturas.length,
      item.totalSaldo,
      item.totalIntereses,
      item.totalConIntereses,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cartera_vencida_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportEvolucionToCSV = () => {
    if (!evolucion || evolucion.length === 0) return;

    const headers = [
      "Mes",
      "Total Facturado",
      "Total Pendiente",
      "Total Pagado",
    ];

    const rows = evolucion.map((item: any) => [
      item.mes,
      item.totalFacturado,
      item.totalPendiente,
      item.totalPagado,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evolucion_temporal_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground mt-2">
          Análisis y reportes consolidados de cartera vencida
        </p>
      </div>

      {/* Cartera Vencida por Cliente */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cartera Vencida por Cliente</CardTitle>
              <CardDescription>
                Resumen de saldos pendientes agrupados por cliente
              </CardDescription>
            </div>
            <Button onClick={exportCarteraToCSV} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCartera ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !carteraVencida || carteraVencida.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay cartera vencida registrada</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Facturas</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Intereses</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carteraVencida.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.cliente}</TableCell>
                      <TableCell className="text-center">{item.facturas.length}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.totalSaldo)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        {formatCurrency(item.totalIntereses)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.totalConIntereses)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-center">
                      {carteraVencida.reduce((sum: number, item: any) => sum + item.facturas.length, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        carteraVencida.reduce((sum: number, item: any) => sum + item.totalSaldo, 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(
                        carteraVencida.reduce((sum: number, item: any) => sum + item.totalIntereses, 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        carteraVencida.reduce((sum: number, item: any) => sum + item.totalConIntereses, 0)
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evolución Temporal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Evolución Temporal</CardTitle>
              <CardDescription>
                Análisis mensual de facturación y cobranza (últimos 6 meses)
              </CardDescription>
            </div>
            <Button onClick={exportEvolucionToCSV} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEvolucion ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !evolucion || evolucion.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay datos de evolución temporal</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Total Facturado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">% Cobranza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evolucion.map((item: any, idx: number) => {
                    const porcentajeCobranza = item.totalFacturado > 0
                      ? ((item.totalPagado / item.totalFacturado) * 100).toFixed(1)
                      : '0.0';
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.mes}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalFacturado)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(item.totalPendiente)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(item.totalPagado)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={
                            parseFloat(porcentajeCobranza) >= 80
                              ? 'text-green-600 font-semibold'
                              : parseFloat(porcentajeCobranza) >= 60
                              ? 'text-orange-600'
                              : 'text-red-600'
                          }>
                            {porcentajeCobranza}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
