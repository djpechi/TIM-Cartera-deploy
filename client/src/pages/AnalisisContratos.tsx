import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, FileText, TrendingUp } from 'lucide-react';
import { formatearMoneda, FormatoMoneda } from '../../../shared/formatoMoneda';

export default function AnalisisContratos() {
  const { data: me } = trpc.auth.me.useQuery();
  const formatoUsuario: FormatoMoneda = (me?.formatoMoneda as FormatoMoneda) || 'completo';

  // Estado para búsqueda por contrato
  const [numeroContrato, setNumeroContrato] = useState('');
  const [contratoConsultado, setContratoConsultado] = useState('');

  // Estado para búsqueda por cliente
  const [clienteId, setClienteId] = useState<number | null>(null);

  // Queries
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: facturasContrato, isLoading: loadingFacturas } = trpc.analisis.facturasPorContrato.useQuery(
    { numeroContrato: contratoConsultado },
    { enabled: contratoConsultado.length > 0 }
  );
  const { data: contratosCliente, isLoading: loadingContratos } = trpc.analisis.contratosPorCliente.useQuery(
    { clienteId: clienteId! },
    { enabled: clienteId !== null }
  );

  const handleBuscarContrato = () => {
    if (numeroContrato.trim()) {
      setContratoConsultado(numeroContrato.trim().toUpperCase());
    }
  };

  // Extraer "X de Y" de la descripción y calcular proyección
  const calcularProyeccion = (descripcion: string | null, importeTotal: string) => {
    if (!descripcion) return null;
    
    // Buscar patrón "X de Y" en la descripción
    const match = descripcion.match(/(\d+)\s+de\s+(\d+)/i);
    if (!match) return null;
    
    const pagoActual = parseInt(match[1]);
    const pagosTotales = parseInt(match[2]);
    const pagosFaltantes = pagosTotales - pagoActual;
    const precioMensual = parseFloat(importeTotal);
    const deudaProyectada = pagosFaltantes * precioMensual;
    
    return {
      pagoActual,
      pagosTotales,
      pagosFaltantes,
      precioMensual,
      deudaProyectada
    };
  };

  // Calcular proyección para el contrato consultado
  const proyeccionContrato = facturasContrato && facturasContrato.length > 0
    ? calcularProyeccion(facturasContrato[0].descripcion, facturasContrato[0].importeTotal)
    : null;

  const totalAdeudadoContrato = proyeccionContrato
    ? proyeccionContrato.deudaProyectada
    : facturasContrato?.reduce((sum, f) => sum + parseFloat(f.saldoPendiente || '0'), 0) || 0;

  // Generar meses proyectados
  const generarMesesProyectados = (pagoActual: number, pagosFaltantes: number) => {
    const meses = [];
    const fechaBase = new Date();
    
    for (let i = 0; i < pagosFaltantes; i++) {
      const fecha = new Date(fechaBase);
      fecha.setMonth(fecha.getMonth() + i + 1);
      meses.push({
        mes: fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' }),
        numeroPago: pagoActual + i + 1
      });
    }
    
    return meses;
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Análisis de Contratos</h1>
        <p className="text-muted-foreground">
          Consulta el estado de deuda por número de contrato o por cliente
        </p>
      </div>

      <Tabs defaultValue="contrato" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="contrato">
            <FileText className="h-4 w-4 mr-2" />
            Por Número de Contrato
          </TabsTrigger>
          <TabsTrigger value="cliente">
            <TrendingUp className="h-4 w-4 mr-2" />
            Por Cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contrato" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Search className="h-5 w-5 inline mr-2" />
                Buscar por Número de Contrato
              </CardTitle>
              <CardDescription>
                Ingresa el número de contrato para ver la proyección de pagos pendientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Ej: 0047"
                  value={numeroContrato}
                  onChange={(e) => setNumeroContrato(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarContrato()}
                  className="max-w-xs"
                />
                <Button onClick={handleBuscarContrato} disabled={!numeroContrato.trim()}>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>

          {contratoConsultado && (
            <>
              {loadingFacturas ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Cargando...
                  </CardContent>
                </Card>
              ) : facturasContrato && facturasContrato.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Contrato</CardDescription>
                        <CardTitle className="text-2xl">{contratoConsultado}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Cliente</CardDescription>
                        <CardTitle className="text-xl">{facturasContrato[0].nombreCliente}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Total Adeudado</CardDescription>
                        <CardTitle className="text-2xl text-destructive">
                          {formatearMoneda(totalAdeudadoContrato, formatoUsuario)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  {proyeccionContrato ? (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle>Información del Contrato</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Pago Actual</p>
                              <p className="text-2xl font-bold">{proyeccionContrato.pagoActual} de {proyeccionContrato.pagosTotales}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Pagos Faltantes</p>
                              <p className="text-2xl font-bold text-destructive">{proyeccionContrato.pagosFaltantes}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Precio Mensual</p>
                              <p className="text-2xl font-bold">{formatearMoneda(proyeccionContrato.precioMensual, formatoUsuario)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Deuda Proyectada</p>
                              <p className="text-2xl font-bold text-destructive">{formatearMoneda(proyeccionContrato.deudaProyectada, formatoUsuario)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Proyección de Pagos Mensuales</CardTitle>
                          <CardDescription>
                            Desglose de los {proyeccionContrato.pagosFaltantes} pagos pendientes
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Mes</TableHead>
                                <TableHead>Número de Pago</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {generarMesesProyectados(proyeccionContrato.pagoActual, proyeccionContrato.pagosFaltantes).map((mes, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{mes.mes}</TableCell>
                                  <TableCell>{mes.numeroPago} de {proyeccionContrato.pagosTotales}</TableCell>
                                  <TableCell className="text-right">
                                    {formatearMoneda(proyeccionContrato.precioMensual, formatoUsuario)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Facturas Pendientes</CardTitle>
                        <CardDescription>
                          Este contrato no tiene proyección de pagos (no se encontró formato "X de Y")
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Folio</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead className="text-right">Saldo Pendiente</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {facturasContrato.map((factura: any) => (
                              <TableRow key={factura.folio}>
                                <TableCell className="font-medium">{factura.folio}</TableCell>
                                <TableCell>
                                  {factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-MX') : '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatearMoneda(parseFloat(factura.saldoPendiente || '0'), formatoUsuario)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No se encontraron facturas pendientes para el contrato {contratoConsultado}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="cliente" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Search className="h-5 w-5 inline mr-2" />
                Buscar por Cliente
              </CardTitle>
              <CardDescription>
                Selecciona un cliente para ver todos sus contratos y saldos pendientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={clienteId?.toString() || ''}
                onValueChange={(value) => setClienteId(parseInt(value))}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((cliente: any) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {clienteId && (
            <>
              {loadingContratos ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Cargando...
                  </CardContent>
                </Card>
              ) : contratosCliente && contratosCliente.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Contratos del Cliente</CardTitle>
                    <CardDescription>
                      Facturas sin contrato se agrupan como "Otros"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número de Contrato</TableHead>
                          <TableHead className="text-right">Pagos Faltantes</TableHead>
                          <TableHead className="text-right">Deuda Proyectada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratosCliente.map((contrato: any, idx: number) => {
                          const proyeccion = calcularProyeccion(contrato.ultimaDescripcion, contrato.ultimoImporte);
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {contrato.numeroContrato || (
                                  <span className="text-muted-foreground italic">Otros</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {proyeccion ? (
                                  <span className="font-medium">{proyeccion.pagosFaltantes}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium text-destructive">
                                {formatearMoneda(
                                  proyeccion ? proyeccion.deudaProyectada : parseFloat(contrato.totalAdeudado || '0'),
                                  formatoUsuario
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No se encontraron contratos pendientes para este cliente
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
