import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Facturas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [sistemaFilter, setSistemaFilter] = useState<string>("all");

  const { data: facturas, isLoading } = trpc.facturas.list.useQuery();

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(value));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const filteredFacturas = facturas?.filter((factura) => {
    const matchesSearch =
      factura.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.nombreCliente.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado =
      estadoFilter === "all" || factura.estadoPago === estadoFilter;
    
    const matchesSistema =
      sistemaFilter === "all" || factura.sistema === sistemaFilter;

    return matchesSearch && matchesEstado && matchesSistema;
  });

  const exportToCSV = () => {
    if (!filteredFacturas || filteredFacturas.length === 0) return;

    const headers = [
      "Folio",
      "Sistema",
      "Cliente",
      "Fecha",
      "Vencimiento",
      "Importe",
      "Días Atraso",
      "Intereses",
      "Total con Intereses",
      "Estado",
    ];

    const rows = filteredFacturas.map((f) => [
      f.folio,
      f.sistema === 'tim_transp' ? 'Tim Transp' : 'Tim Value',
      f.nombreCliente,
      formatDate(f.fecha),
      f.fechaVencimiento ? formatDate(f.fechaVencimiento) : '',
      f.importeTotal,
      f.diasAtraso || 0,
      f.interesesMoratorios || 0,
      f.totalConIntereses || f.importeTotal,
      f.estadoPago === 'pendiente' ? 'Pendiente' : 'Pagado',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground mt-2">
            Gestión y consulta de facturas de ambos sistemas
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Busca y filtra facturas por diferentes criterios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sistemaFilter} onValueChange={setSistemaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los sistemas</SelectItem>
                <SelectItem value="tim_transp">Tim Transp</SelectItem>
                <SelectItem value="tim_value">Tim Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Listado de Facturas
            {filteredFacturas && (
              <span className="text-muted-foreground font-normal ml-2">
                ({filteredFacturas.length} registros)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !filteredFacturas || filteredFacturas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron facturas</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-center">Días Atraso</TableHead>
                    <TableHead className="text-right">Total + Intereses</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFacturas.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-medium">{factura.folio}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {factura.sistema === 'tim_transp' ? 'Tim Transp' : 'Tim Value'}
                        </Badge>
                      </TableCell>
                      <TableCell>{factura.nombreCliente}</TableCell>
                      <TableCell>{formatDate(factura.fecha)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(factura.importeTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        {factura.diasAtraso && factura.diasAtraso > 0 ? (
                          <Badge variant="destructive">{factura.diasAtraso} días</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(factura.totalConIntereses || factura.importeTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={factura.estadoPago === 'pendiente' ? 'secondary' : 'default'}
                          className={
                            factura.estadoPago === 'pendiente'
                              ? 'status-pending'
                              : 'status-paid'
                          }
                        >
                          {factura.estadoPago === 'pendiente' ? 'Pendiente' : 'Pagado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
