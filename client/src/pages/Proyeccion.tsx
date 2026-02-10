import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, AlertTriangle, Calendar, DollarSign, Building2, Users } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, addMonths, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

export default function Proyeccion() {
  const [mesesProyeccion, setMesesProyeccion] = useState(6);
  const [empresaFiltro, setEmpresaFiltro] = useState<"todas" | "tim_transp" | "tim_value">("todas");
  const [modalContratosOpen, setModalContratosOpen] = useState(false);

  // Calcular rango de fechas
  const fechaInicio = useMemo(() => {
    return startOfMonth(new Date());
  }, []);

  const fechaFin = useMemo(() => {
    return addMonths(fechaInicio, mesesProyeccion);
  }, [fechaInicio, mesesProyeccion]);

  // Queries
  const { data: proyeccionConsolidada, isLoading: loadingConsolidada } = trpc.proyeccion.proyeccionConsolidada.useQuery({
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),
  });

  const { data: proyeccionPorEmpresa, isLoading: loadingEmpresa } = trpc.proyeccion.proyeccionPorEmpresa.useQuery({
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),
  });

  const { data: proyeccionPorGrupo, isLoading: loadingGrupo } = trpc.proyeccion.proyeccionPorGrupo.useQuery({
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),
  });

  const { data: contratosProximosAVencer } = trpc.proyeccion.contratosProximosAVencer.useQuery({ limite: 10 });
  const { data: contratosActivos } = trpc.proyeccion.contratosActivos.useQuery();

  // Calcular totales
  const totalProyectado = useMemo(() => {
    if (!proyeccionConsolidada) return 0;
    return proyeccionConsolidada.reduce((sum, p) => sum + Number(p.totalProyectado), 0);
  }, [proyeccionConsolidada]);

  const totalContratos = contratosActivos?.length || 0;
  const contratosVenciendo = contratosProximosAVencer?.length || 0;

  // Formatear datos para gráficos
  const datosGraficoConsolidado = useMemo(() => {
    if (!proyeccionConsolidada) return [];
    return proyeccionConsolidada.map(p => ({
      mes: format(new Date(p.mes), "MMM yyyy", { locale: es }),
      proyectado: Number(p.totalProyectado),
      real: Number(p.totalReal),
      contratos: Number(p.cantidadContratos),
    }));
  }, [proyeccionConsolidada]);

  const datosGraficoEmpresa = useMemo(() => {
    if (!proyeccionPorEmpresa) return [];
    
    const grouped = proyeccionPorEmpresa.reduce((acc, p) => {
      const mes = format(new Date(p.mes), "MMM yyyy", { locale: es });
      if (!acc[mes]) {
        acc[mes] = { mes, tim_transp: 0, tim_value: 0 };
      }
      if (p.empresa === "tim_transp") {
        acc[mes].tim_transp = Number(p.totalProyectado);
      } else {
        acc[mes].tim_value = Number(p.totalProyectado);
      }
      return acc;
    }, {} as Record<string, { mes: string; tim_transp: number; tim_value: number }>);

    return Object.values(grouped);
  }, [proyeccionPorEmpresa]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value);
  };

  const calcularRentasPendientes = (rentaActual: number, totalRentas: number) => {
    return totalRentas - rentaActual;
  };

  if (loadingConsolidada || loadingEmpresa || loadingGrupo) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando proyección...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proyección de Facturación</h1>
          <p className="text-muted-foreground mt-1">
            Proyección de ingresos basada en contratos de arrendamiento activos
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={mesesProyeccion.toString()} onValueChange={(v) => setMesesProyeccion(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Próximos 3 meses</SelectItem>
              <SelectItem value="6">Próximos 6 meses</SelectItem>
              <SelectItem value="12">Próximos 12 meses</SelectItem>
              <SelectItem value="24">Próximos 24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proyectado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalProyectado)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximos {mesesProyeccion} meses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Activos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContratos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Generando ingresos recurrentes
            </p>
          </CardContent>
        </Card>

        <Dialog open={modalContratosOpen} onOpenChange={setModalContratosOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-accent transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Próximos a Vencer</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{contratosVenciendo}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  3 o menos rentas pendientes
                </p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contratos Próximos a Vencer</DialogTitle>
              <DialogDescription>
                Contratos con 3 o menos rentas pendientes - Requieren atención para renovación
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {contratosProximosAVencer && contratosProximosAVencer.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="text-right">Renta Actual</TableHead>
                      <TableHead className="text-right">Total Rentas</TableHead>
                      <TableHead className="text-right">Pendientes</TableHead>
                      <TableHead className="text-right">Monto Mensual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratosProximosAVencer.map((contrato) => {
                      const pendientes = calcularRentasPendientes(contrato.rentaActual, contrato.totalRentas);
                      return (
                        <TableRow key={contrato.id}>
                          <TableCell className="font-medium">
                            EXP:{contrato.numeroContrato}
                          </TableCell>
                          <TableCell>{contrato.nombreCliente}</TableCell>
                          <TableCell>
                            <Badge variant={contrato.empresa === 'tim_transp' ? 'default' : 'secondary'}>
                              {contrato.empresa === 'tim_transp' ? 'Tim Transp' : 'Tim Value'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{contrato.rentaActual}</TableCell>
                          <TableCell className="text-right">{contrato.totalRentas}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={pendientes <= 1 ? 'destructive' : 'outline'}>
                              {pendientes} {pendientes === 1 ? 'renta' : 'rentas'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(contrato.montoMensual))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay contratos próximos a vencer
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Mensual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalProyectado / mesesProyeccion)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ingreso proyectado por mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Visualización */}
      <Tabs defaultValue="consolidado" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consolidado">Consolidado</TabsTrigger>
          <TabsTrigger value="empresa">Por Empresa</TabsTrigger>
          <TabsTrigger value="grupo">Por Grupo</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
        </TabsList>

        {/* Tab Consolidado */}
        <TabsContent value="consolidado" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proyección Mensual Consolidada</CardTitle>
              <CardDescription>
                Ingresos proyectados vs reales por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={datosGraficoConsolidado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="proyectado"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Proyectado"
                  />
                  <Line
                    type="monotone"
                    dataKey="real"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Real"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cantidad de Contratos por Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={datosGraficoConsolidado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="contratos" fill="#8b5cf6" name="Contratos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Por Empresa */}
        <TabsContent value="empresa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proyección por Empresa</CardTitle>
              <CardDescription>
                Comparativo de ingresos proyectados entre Tim Transp y Tim Value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={datosGraficoEmpresa}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="tim_transp" fill="#3b82f6" name="Tim Transp" />
                  <Bar dataKey="tim_value" fill="#10b981" name="Tim Value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Por Grupo */}
        <TabsContent value="grupo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proyección por Grupo de Clientes</CardTitle>
              <CardDescription>
                Ingresos proyectados agrupados por grupos corporativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Contratos</TableHead>
                    <TableHead className="text-right">Proyectado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proyeccionPorGrupo?.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {p.grupoNombre || "Sin grupo"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(p.mes), "MMMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">{p.cantidadContratos}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Number(p.totalProyectado))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Contratos */}
        <TabsContent value="contratos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contratos Próximos a Vencer</CardTitle>
              <CardDescription>
                Contratos con 3 o menos rentas pendientes - Requieren atención para renovación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-right">Renta Actual</TableHead>
                    <TableHead className="text-right">Pendientes</TableHead>
                    <TableHead className="text-right">Monto Mensual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosProximosAVencer?.map((contrato) => {
                    const pendientes = calcularRentasPendientes(contrato.rentaActual, contrato.totalRentas);
                    return (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-medium">
                          EXP:{contrato.numeroContrato}
                        </TableCell>
                        <TableCell>{contrato.nombreCliente}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contrato.descripcionActivo}
                        </TableCell>
                        <TableCell>
                          <Badge variant={contrato.empresa === "tim_transp" ? "default" : "secondary"}>
                            {contrato.empresa === "tim_transp" ? "Tim Transp" : "Tim Value"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {contrato.rentaActual} de {contrato.totalRentas}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={pendientes <= 1 ? "destructive" : "outline"}>
                            {pendientes}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(Number(contrato.montoMensual))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
