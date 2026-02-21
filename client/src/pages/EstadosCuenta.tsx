import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EstadosCuenta() {
  const [tipoSeleccion, setTipoSeleccion] = useState<'cliente' | 'grupo' | 'masivo'>('cliente');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [tasaInteresMoratorio, setTasaInteresMoratorio] = useState<number>(0);
  const [clientesSeleccionados, setClientesSeleccionados] = useState<number[]>([]);
  const [showValidacionModal, setShowValidacionModal] = useState(false);

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

  const generarPDFsMasivos = trpc.estadosCuenta.generarPDFsMasivos.useMutation({
    onSuccess: (data) => {
      // Convertir base64 a blob y descargar ZIP
      const byteCharacters = atob(data.zip);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Estados de cuenta generados', {
        description: `Se han generado ${clientesSeleccionados.length} estados de cuenta en formato ZIP.`,
      });
      
      // Limpiar selección
      setClientesSeleccionados([]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  })

  const handleGenerarPDF = () => {
    if (tipoSeleccion === 'cliente' && clienteSeleccionado) {
      generarPDFCliente.mutate({ 
        clienteId: parseInt(clienteSeleccionado),
        tasaInteresMoratorio 
      });
    } else if (tipoSeleccion === 'grupo' && grupoSeleccionado) {
      generarPDFGrupo.mutate({ 
        grupoId: parseInt(grupoSeleccionado),
        tasaInteresMoratorio 
      });
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
  const isGenerating = generarPDFCliente.isPending || generarPDFGrupo.isPending || generarPDFsMasivos.isPending;

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
            <Tabs value={tipoSeleccion} onValueChange={(v) => setTipoSeleccion(v as 'cliente' | 'grupo' | 'masivo')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cliente">Por Cliente</TabsTrigger>
                <TabsTrigger value="grupo">Por Grupo</TabsTrigger>
                <TabsTrigger value="masivo">Exportación Masiva</TabsTrigger>
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

              <TabsContent value="masivo" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Tasa de Interés Moratorio (%)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={tasaInteresMoratorio}
                        onChange={(e) => setTasaInteresMoratorio(parseFloat(e.target.value) || 0)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Ej: 2.5"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (clientesSeleccionados.length === 0) {
                          toast.error('Selecciona al menos un cliente');
                          return;
                        }
                        generarPDFsMasivos.mutate({ 
                          clienteIds: clientesSeleccionados,
                          tasaInteresMoratorio 
                        });
                      }}
                      disabled={clientesSeleccionados.length === 0 || generarPDFsMasivos.isPending}
                      size="lg"
                    >
                      {generarPDFsMasivos.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generando ZIP...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Exportar Seleccionados ({clientesSeleccionados.length})
                        </>
                      )}
                    </Button>
                  </div>

                  {clientes && clientes.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">Seleccionar clientes para exportación:</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (clientesSeleccionados.length === clientes.length) {
                              setClientesSeleccionados([]);
                            } else {
                              setClientesSeleccionados(clientes.map(c => c.id));
                            }
                          }}
                        >
                          {clientesSeleccionados.length === clientes.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                        </Button>
                      </div>
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {clientes.map((cliente) => (
                          <label key={cliente.id} className="flex items-center gap-3 cursor-pointer hover:bg-accent p-3 rounded-md transition-colors">
                            <input
                              type="checkbox"
                              checked={clientesSeleccionados.includes(cliente.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setClientesSeleccionados([...clientesSeleccionados, cliente.id]);
                                } else {
                                  setClientesSeleccionados(clientesSeleccionados.filter(id => id !== cliente.id));
                                }
                              }}
                              className="h-4 w-4"
                            />
                            <span className="text-sm flex-1">{cliente.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!clientes || clientes.length === 0) && !loadingClientes && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p>No hay clientes con deuda pendiente</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {estadoActual && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Intereses</CardTitle>
                <CardDescription>
                  Configura la tasa de interés moratorio para el cálculo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Tasa de Interés Moratorio (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={tasaInteresMoratorio}
                      onChange={(e) => setTasaInteresMoratorio(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Ej: 3.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ingresa 0 para no aplicar intereses moratorios
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  {(() => {
                    // Calcular intereses con tasa editable
                    const subtotal = estadoActual.facturas.reduce((sum: number, f: any) => {
                      return sum + Number(f.saldoPendiente || 0);
                    }, 0);
                    
                    const interesesCalculados = estadoActual.facturas.reduce((sum: number, f: any) => {
                      const saldo = Number(f.saldoPendiente || 0);
                      const diasAtraso = Number(f.diasAtraso || 0);
                      const intereses = saldo * (tasaInteresMoratorio / 100) * (diasAtraso / 30);
                      return sum + intereses;
                    }, 0);
                    
                    const totalGeneral = subtotal + interesesCalculados;
                    
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Facturas Pendientes</p>
                            <p className="text-2xl font-bold">{estadoActual.facturas.length}</p>
                          </div>
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Subtotal</p>
                            <p className="text-2xl font-bold">{formatCurrency(subtotal)}</p>
                          </div>
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Intereses Moratorios ({tasaInteresMoratorio}%)</p>
                            <p className="text-2xl font-bold">{formatCurrency(interesesCalculados)}</p>
                          </div>
                        </div>

                        <div className="border rounded-lg p-4 bg-primary/5">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total a Pagar</span>
                            <span className="text-2xl font-bold text-primary">
                              {formatCurrency(totalGeneral)}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  

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
                            const saldoPendiente = Number(factura.saldoPendiente || 0);
                            const diasAtraso = Number(factura.diasAtraso || 0);
                            const intereses = saldoPendiente * (tasaInteresMoratorio / 100) * (diasAtraso / 30);

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
                                <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(saldoPendiente)}</td>
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
                      onClick={() => setShowValidacionModal(true)}
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

      {/* Modal de Validación */}
      <Dialog open={showValidacionModal} onOpenChange={setShowValidacionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Validación de Estado de Cuenta
            </DialogTitle>
            <DialogDescription>
              Verifica que la información sea correcta antes de generar el PDF
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cliente/Grupo:</p>
                <p className="font-semibold">
                  {tipoSeleccion === 'cliente'
                    ? estadoActual && 'cliente' in estadoActual
                      ? estadoActual.cliente.nombre
                      : 'N/A'
                    : estadoActual && 'grupo' in estadoActual
                    ? estadoActual.grupo.nombre
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Facturas Pendientes:</p>
                <p className="text-2xl font-bold text-primary">
                  {estadoActual?.facturas.length || 0}
                </p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total a Pagar:</span>
                <span className="text-xl font-bold">
                  {estadoActual
                    ? formatCurrency(
                        estadoActual.facturas.reduce((sum: number, f: any) => {
                          const saldo = Number(f.saldoPendiente || 0);
                          const diasAtraso = Number(f.diasAtraso || 0);
                          const intereses = saldo * (tasaInteresMoratorio / 100) * (diasAtraso / 30);
                          return sum + saldo + intereses;
                        }, 0)
                      )
                    : '$0.00'}
                </span>
              </div>
            </div>
            {estadoActual && estadoActual.facturas.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ No hay facturas pendientes para este {tipoSeleccion}. El PDF estará vacío.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidacionModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setShowValidacionModal(false);
                handleGenerarPDF();
              }}
              disabled={!estadoActual || estadoActual.facturas.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Generar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
