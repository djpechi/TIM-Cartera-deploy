import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EstadosCuenta() {
  const [tipoSeleccion, setTipoSeleccion] = useState<'cliente' | 'grupo'>('cliente');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');

  const { data: clientes, isLoading: loadingClientes } = trpc.estadosCuenta.clientesConDeuda.useQuery();
  const { data: grupos, isLoading: loadingGrupos } = trpc.estadosCuenta.gruposConDeuda.useQuery();

  const { data: estadoCliente, isLoading: loadingEstadoCliente } = trpc.estadosCuenta.cliente.useQuery(
    { clienteId: parseInt(clienteSeleccionado) },
    { enabled: !!clienteSeleccionado && tipoSeleccion === 'cliente' }
  );

  const { data: estadoGrupo, isLoading: loadingEstadoGrupo } = trpc.estadosCuenta.grupo.useQuery(
    { grupoId: parseInt(grupoSeleccionado) },
    { enabled: !!grupoSeleccionado && tipoSeleccion === 'grupo' }
  );

  const generarPDFCliente = trpc.estadosCuenta.generarPDFCliente.useMutation({
    onSuccess: (data) => {
      // Convertir base64 a blob y descargar
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('PDF generado', {
        description: 'El estado de cuenta se ha descargado correctamente.',
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generarPDFGrupo = trpc.estadosCuenta.generarPDFGrupo.useMutation({
    onSuccess: (data) => {
      // Convertir base64 a blob y descargar
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('PDF generado', {
        description: 'El estado de cuenta consolidado se ha descargado correctamente.',
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGenerarPDF = () => {
    if (tipoSeleccion === 'cliente' && clienteSeleccionado) {
      generarPDFCliente.mutate({ clienteId: parseInt(clienteSeleccionado) });
    } else if (tipoSeleccion === 'grupo' && grupoSeleccionado) {
      generarPDFGrupo.mutate({ grupoId: parseInt(grupoSeleccionado) });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  };

  const estadoActual = tipoSeleccion === 'cliente' ? estadoCliente : estadoGrupo;
  const isLoading = tipoSeleccion === 'cliente' ? loadingEstadoCliente : loadingEstadoGrupo;
  const isGenerating = generarPDFCliente.isPending || generarPDFGrupo.isPending;

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Estados de Cuenta</h1>
        <p className="text-muted-foreground mt-2">
          Genera estados de cuenta en PDF con las facturas pendientes por cliente o grupo
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Cliente o Grupo</CardTitle>
            <CardDescription>
              Elige si deseas generar el estado de cuenta para un cliente individual o un grupo consolidado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tipoSeleccion} onValueChange={(v) => setTipoSeleccion(v as 'cliente' | 'grupo')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cliente">Por Cliente</TabsTrigger>
                <TabsTrigger value="grupo">Por Grupo</TabsTrigger>
              </TabsList>

              <TabsContent value="cliente" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Seleccionar Cliente</label>
                  <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingClientes ? (
                        <SelectItem value="loading" disabled>
                          Cargando...
                        </SelectItem>
                      ) : (
                        clientes?.map((cliente) => (
                          <SelectItem key={cliente.id} value={String(cliente.id)}>
                            {cliente.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="grupo" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Seleccionar Grupo</label>
                  <Select value={grupoSeleccionado} onValueChange={setGrupoSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un grupo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingGrupos ? (
                        <SelectItem value="loading" disabled>
                          Cargando...
                        </SelectItem>
                      ) : (
                        grupos?.map((grupo) => (
                          <SelectItem key={grupo.id} value={String(grupo.id)}>
                            {grupo.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {estadoActual && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Vista Previa del Estado de Cuenta
                </CardTitle>
                <CardDescription>
                  {tipoSeleccion === 'cliente'
                    ? `Cliente: ${'cliente' in estadoActual ? estadoActual.cliente.nombre : ''}`
                    : `Grupo: ${'grupo' in estadoActual ? estadoActual.grupo.nombre : ''}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Facturas Pendientes</p>
                      <p className="text-2xl font-bold">{estadoActual.facturas.length}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Subtotal</p>
                      <p className="text-2xl font-bold">{formatCurrency(estadoActual.totalPendiente)}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Intereses Moratorios</p>
                      <p className="text-2xl font-bold">{formatCurrency(estadoActual.totalIntereses)}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-primary/5">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total a Pagar</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(estadoActual.totalGeneral)}
                      </span>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Contrato</th>
                            {tipoSeleccion === 'grupo' && (
                              <th className="px-4 py-3 text-left text-sm font-medium">Cliente</th>
                            )}
                            <th className="px-4 py-3 text-left text-sm font-medium">Folio</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Sistema</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Importe</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Intereses</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Días Atraso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {estadoActual.facturas.map((factura: any, index: number) => {
                            const importe = Number(factura.importeTotal || 0);
                            const intereses = Number(factura.interesesMoratorios || 0);

                            return (
                              <tr key={index} className="hover:bg-muted/50">
                                <td className="px-4 py-3 text-sm">{factura.numeroContrato || 'N/A'}</td>
                                {tipoSeleccion === 'grupo' && (
                                  <td className="px-4 py-3 text-sm">{factura.clienteNombre}</td>
                                )}
                                <td className="px-4 py-3 text-sm font-medium">{factura.folio}</td>
                                <td className="px-4 py-3 text-sm">{formatDate(factura.fecha)}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                    {factura.sistema === 'tim_transp' ? 'TT' : 'TV'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(importe)}</td>
                                <td className="px-4 py-3 text-sm text-right">{formatCurrency(intereses)}</td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span
                                    className={
                                      (factura.diasAtraso || 0) > 60
                                        ? 'text-destructive font-semibold'
                                        : ''
                                    }
                                  >
                                    {factura.diasAtraso || 0}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleGenerarPDF}
                      disabled={isGenerating}
                      size="lg"
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generando PDF...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Descargar Estado de Cuenta (PDF)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!estadoActual && !isLoading && (tipoSeleccion === 'cliente' ? clienteSeleccionado : grupoSeleccionado) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron facturas pendientes para este {tipoSeleccion}</p>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando estado de cuenta...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
