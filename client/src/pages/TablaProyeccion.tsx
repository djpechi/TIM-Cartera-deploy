import { useState, Fragment } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function TablaProyeccion() {
  const currentYear = new Date().getFullYear();
  const [anioSeleccionado, setAnioSeleccionado] = useState(currentYear);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<'todas' | 'tim_transp' | 'tim_value'>('todas');
  const [vistaConsolidada, setVistaConsolidada] = useState(false);
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<number>>(new Set());
  const [clientesExpandidos, setClientesExpandidos] = useState<Set<number>>(new Set());

  const { data: proyeccionData, isLoading } = trpc.proyeccion.proyeccionMatricial.useQuery({
    anio: anioSeleccionado,
    empresa: empresaSeleccionada,
  });

  const { data: grupos } = trpc.grupos.list.useQuery();
  const { data: clientes } = trpc.clientes.list.useQuery();

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Función para verificar si un año tiene operaciones
  const tieneOperaciones = (montosAnuales: number[]) => {
    return montosAnuales.some(m => m > 0);
  };

  // Función para obtener solo los meses con operaciones
  const getMesesConOperaciones = () => {
    if (!proyeccionData) return [];
    
    const mesesActivos = new Set<number>();
    Object.values(proyeccionData.datos as any).forEach((contratoData: any) => {
      Object.keys(contratoData).forEach(mesNum => {
        if (contratoData[mesNum] > 0) {
          mesesActivos.add(parseInt(mesNum));
        }
      });
    });

    return Array.from(mesesActivos).sort((a, b) => a - b);
  };

  const mesesActivos = getMesesConOperaciones();

  // Organizar datos por grupo → cliente → contratos
  const organizarPorJerarquia = () => {
    if (!proyeccionData) return [];

    const estructura: any[] = [];
    const gruposMap = new Map<string, any>();

    // Procesar cada contrato y construir jerarquía
    proyeccionData.contratos.forEach((contrato: any) => {
      // Si el contrato no tiene operaciones en el año, no lo incluimos
      const tieneOperaciones = mesesActivos.some(mes => {
        const monto = (proyeccionData.datos as any)?.[contrato.id]?.[mes] || 0;
        return monto > 0;
      });
      
      if (!tieneOperaciones) return; // Skip contratos sin operaciones

      const clienteNombre = contrato.nombreCliente;
      const clienteId = contrato.clienteId;
      
      // Si no tiene grupo, usar el nombre del cliente como grupo
      const grupoNombre = contrato.grupoNombre || clienteNombre;
      const grupoKey = contrato.grupoNombre ? `grupo_${contrato.grupoId}` : `cliente_${clienteId}`;

      // Crear grupo si no existe
      if (!gruposMap.has(grupoKey)) {
        gruposMap.set(grupoKey, {
          tipo: contrato.grupoNombre ? 'grupo' : 'sin_grupo',
          id: contrato.grupoId || clienteId,
          nombre: grupoNombre,
          clientesMap: new Map<number, any>()
        });
      }

      const grupo = gruposMap.get(grupoKey)!;

      // Crear cliente si no existe en el grupo
      if (!grupo.clientesMap.has(clienteId)) {
        grupo.clientesMap.set(clienteId, {
          tipo: 'cliente',
          id: clienteId,
          nombre: clienteNombre,
          contratos: []
        });
      }

      // Agregar contrato al cliente
      grupo.clientesMap.get(clienteId)!.contratos.push(contrato);
    });

    // Convertir Maps a arrays
    gruposMap.forEach(grupo => {
      estructura.push({
        ...grupo,
        clientes: Array.from(grupo.clientesMap.values())
      });
      delete grupo.clientesMap;
    });

    return estructura;
  };

  const jerarquia = organizarPorJerarquia();

  const toggleGrupo = (grupoId: number) => {
    const newSet = new Set(gruposExpandidos);
    if (newSet.has(grupoId)) {
      newSet.delete(grupoId);
    } else {
      newSet.add(grupoId);
    }
    setGruposExpandidos(newSet);
  };

  const toggleCliente = (clienteId: number) => {
    const newSet = new Set(clientesExpandidos);
    if (newSet.has(clienteId)) {
      newSet.delete(clienteId);
    } else {
      newSet.add(clienteId);
    }
    setClientesExpandidos(newSet);
  };

  // Calcular totales consolidados
  const calcularTotalesGrupo = (grupo: any) => {
    const totales: Record<number, number> = {};
    mesesActivos.forEach(mes => { totales[mes] = 0; });

    grupo.clientes.forEach((cliente: any) => {
      cliente.contratos.forEach((contrato: any) => {
        mesesActivos.forEach(mes => {
          const monto = (proyeccionData?.datos as any)?.[contrato.id]?.[mes] || 0;
          totales[mes] += monto;
        });
      });
    });

    return totales;
  };

  const calcularTotalesCliente = (cliente: any) => {
    const totales: Record<number, number> = {};
    mesesActivos.forEach(mes => { totales[mes] = 0; });

    cliente.contratos.forEach((contrato: any) => {
      mesesActivos.forEach(mes => {
        const monto = (proyeccionData?.datos as any)?.[contrato.id]?.[mes] || 0;
        totales[mes] += monto;
      });
    });

    return totales;
  };

  const exportarCSV = () => {
    if (!proyeccionData || proyeccionData.contratos.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = ["Grupo", "Cliente", "Contrato", ...mesesActivos.map(m => meses[m - 1]), "Total"];
    const rows: string[][] = [];

    jerarquia.forEach(grupo => {
      grupo.clientes.forEach((cliente: any) => {
        cliente.contratos.forEach((contrato: any) => {
          const montosM = mesesActivos.map(mes => 
            (proyeccionData.datos as any)?.[contrato.id]?.[mes] || 0
          );
          const total = proyeccionData.totalesPorContrato?.[contrato.id] || 0;

          rows.push([
            grupo.nombre,
            cliente.nombre,
            contrato.numeroContrato,
            ...montosM.map(m => m.toFixed(2)),
            total.toFixed(2)
          ]);
        });
      });
    });

    const totalesRow = [
      "",
      "",
      "TOTAL",
      ...mesesActivos.map(mes => 
        (proyeccionData.totalesPorMes?.[mes] || 0).toFixed(2)
      ),
      Object.values(proyeccionData.totalesPorContrato || {}).reduce((sum, val) => sum + val, 0).toFixed(2)
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
      totalesRow.join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `proyeccion_${anioSeleccionado}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Tabla exportada exitosamente");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tabla de Proyección</h1>
          <p className="text-muted-foreground">
            Vista matricial de proyección de ingresos organizada por grupo, cliente y contrato
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Proyección Anual</CardTitle>
                <CardDescription>
                  Visualiza la proyección de ingresos en formato jerárquico
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarCSV}
                  disabled={isLoading || !proyeccionData || proyeccionData.contratos.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 flex-wrap items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Año:</label>
                  <Select
                    value={anioSeleccionado.toString()}
                    onValueChange={(value) => setAnioSeleccionado(parseInt(value))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => currentYear + i - 2).map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Empresa:</label>
                  <Select
                    value={empresaSeleccionada}
                    onValueChange={(value: any) => setEmpresaSeleccionada(value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="tim_transp">Tim Transp</SelectItem>
                      <SelectItem value="tim_value">Tim Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Switch
                    id="vista-consolidada"
                    checked={vistaConsolidada}
                    onCheckedChange={setVistaConsolidada}
                  />
                  <Label htmlFor="vista-consolidada" className="text-sm font-medium cursor-pointer">
                    Vista Consolidada
                  </Label>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : proyeccionData && proyeccionData.contratos.length > 0 && mesesActivos.length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-muted z-10 border-r min-w-[300px]">
                          {vistaConsolidada ? 'Grupo / Cliente' : 'Grupo / Cliente / Contrato'}
                        </th>
                        {mesesActivos.map((mesNum) => (
                          <th
                            key={mesNum}
                            className="px-3 py-2 text-right font-semibold border-r min-w-[100px]"
                          >
                            {meses[mesNum - 1]}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right font-semibold bg-muted/50">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {jerarquia.map((grupo, gIdx) => {
                        const totalesGrupo = calcularTotalesGrupo(grupo);
                        const totalAnualGrupo = Object.values(totalesGrupo).reduce((sum, val) => sum + val, 0);
                        const grupoExpandido = gruposExpandidos.has(grupo.id);

                        return (
                          <Fragment key={`grupo-${grupo.id}`}>
                            {/* Fila de Grupo */}
                            <tr className="bg-blue-50 font-semibold border-t-2 hover:bg-blue-100 cursor-pointer"
                                onClick={() => !vistaConsolidada && toggleGrupo(grupo.id)}>
                              <td className="px-3 py-2 sticky left-0 bg-blue-50 hover:bg-blue-100 z-10 border-r">
                                <div className="flex items-center gap-2">
                                  {!vistaConsolidada && (
                                    grupoExpandido ? 
                                      <ChevronDown className="h-4 w-4" /> : 
                                      <ChevronRight className="h-4 w-4" />
                                  )}
                                  <span>{grupo.nombre}</span>
                                </div>
                              </td>
                              {mesesActivos.map((mesNum) => (
                                <td key={mesNum} className="px-3 py-2 text-right border-r">
                                  {formatCurrency(totalesGrupo[mesNum] || 0)}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right bg-blue-100">
                                {formatCurrency(totalAnualGrupo)}
                              </td>
                            </tr>

                            {/* Filas de Clientes y Contratos */}
                            {!vistaConsolidada && grupoExpandido && grupo.clientes.map((cliente: any) => {
                              const totalesCliente = calcularTotalesCliente(cliente);
                              const totalAnualCliente = Object.values(totalesCliente).reduce((sum, val) => sum + val, 0);
                              const clienteExpandido = clientesExpandidos.has(cliente.id);

                              return (
                                <Fragment key={`cliente-${cliente.id}`}>
                                  {/* Fila de Cliente */}
                                  <tr className="bg-green-50 font-medium hover:bg-green-100 cursor-pointer"
                                      onClick={() => toggleCliente(cliente.id)}>
                                    <td className="px-3 py-2 sticky left-0 bg-green-50 hover:bg-green-100 z-10 border-r">
                                      <div className="flex items-center gap-2 pl-6">
                                        {clienteExpandido ? 
                                          <ChevronDown className="h-4 w-4" /> : 
                                          <ChevronRight className="h-4 w-4" />
                                        }
                                        <span>{cliente.nombre}</span>
                                      </div>
                                    </td>
                                    {mesesActivos.map((mesNum) => (
                                      <td key={mesNum} className="px-3 py-2 text-right border-r">
                                        {formatCurrency(totalesCliente[mesNum] || 0)}
                                      </td>
                                    ))}
                                    <td className="px-3 py-2 text-right bg-green-100">
                                      {formatCurrency(totalAnualCliente)}
                                    </td>
                                  </tr>

                                  {/* Filas de Contratos */}
                                  {clienteExpandido && cliente.contratos.map((contrato: any, cIdx: number) => {
                                    const montosM = mesesActivos.map(mes => 
                                      (proyeccionData.datos as any)?.[contrato.id]?.[mes] || 0
                                    );
                                    const total = proyeccionData.totalesPorContrato?.[contrato.id] || 0;

                                    return (
                                      <tr
                                        key={contrato.id}
                                        className={cIdx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                                      >
                                        <td className="px-3 py-2 sticky left-0 bg-inherit z-10 border-r">
                                          <div className="pl-12 flex items-center gap-2">
                                            <span className="text-muted-foreground">📄</span>
                                            <span>{contrato.numeroContrato}</span>
                                            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                              contrato.empresa === 'tim_transp' 
                                                ? 'bg-blue-100 text-blue-700' 
                                                : 'bg-green-100 text-green-700'
                                            }`}>
                                              {contrato.empresa === 'tim_transp' ? 'TT' : 'TV'}
                                            </span>
                                          </div>
                                        </td>
                                        {montosM.map((monto, idx) => (
                                          <td
                                            key={idx}
                                            className={`px-3 py-2 text-right border-r ${
                                              monto > 0 ? 'text-foreground' : 'text-muted-foreground'
                                            }`}
                                          >
                                            {monto > 0 ? formatCurrency(monto) : '-'}
                                          </td>
                                        ))}
                                        <td className="px-3 py-2 text-right font-medium bg-muted/30">
                                          {formatCurrency(total)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </Fragment>
                              );
                            })}
                          </Fragment>
                        );
                      })}

                      {/* Fila de Totales */}
                      <tr className="bg-primary/10 font-bold border-t-2 border-primary">
                        <td className="px-3 py-3 sticky left-0 bg-primary/10 z-10 border-r">
                          TOTAL GENERAL
                        </td>
                        {mesesActivos.map((mesNum) => {
                          const total = proyeccionData.totalesPorMes?.[mesNum] || 0;
                          return (
                            <td
                              key={mesNum}
                              className="px-3 py-3 text-right border-r"
                            >
                              {formatCurrency(total)}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-right bg-primary/20">
                          {formatCurrency(
                            Object.values(proyeccionData.totalesPorContrato || {}).reduce((sum, val) => sum + val, 0)
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No hay contratos activos con operaciones para el año seleccionado</p>
                  <p className="text-sm mt-2">
                    Intenta seleccionar un año diferente o verifica que existan contratos activos con proyecciones
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
