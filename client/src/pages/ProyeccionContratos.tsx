import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Calendar, Building2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function ProyeccionContratos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: contratos, isLoading } = trpc.proyeccionContratos.list.useQuery({
    estatus: "activo",
    empresa: "todas",
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proyección de Contratos</h1>
          <p className="text-muted-foreground mt-2">
            Gestión manual de contratos de arrendamiento con proyección financiera
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => toast.info("Formulario de creación próximamente")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Contrato
          </Button>
        )}
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Activos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contratos?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total de contratos vigentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tim Transp</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contratos?.filter((c) => c.empresa === "tim_transp").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Contratos TT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tim Value</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contratos?.filter((c) => c.empresa === "tim_value").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Contratos TV</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de contratos */}
      <Card>
        <CardHeader>
          <CardTitle>Contratos Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {!contratos || contratos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay contratos registrados</p>
              <p className="text-sm mt-2">
                {isAdmin
                  ? "Crea tu primer contrato de proyección haciendo clic en el botón 'Nuevo Contrato'"
                  : "Contacta a un administrador para crear contratos"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {contratos.map((contrato) => (
                <div
                  key={contrato.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{contrato.numeroContrato}</h3>
                      <Badge variant={contrato.empresa === "tim_transp" ? "default" : "secondary"}>
                        {contrato.empresa === "tim_transp" ? "TT" : "TV"}
                      </Badge>
                      <Badge variant="outline">
                        {contrato.tipoContrato === "arrendamiento_puro"
                          ? "Arrendamiento Puro"
                          : contrato.tipoContrato === "arrendamiento_financiero"
                          ? "Arrendamiento Financiero"
                          : "Crédito Simple"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{contrato.clienteNombre}</span>
                      {contrato.vendedorNombre && (
                        <span className="flex items-center gap-1">
                          Vendedor: {contrato.vendedorNombre}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(contrato.fechaInicio).toLocaleDateString()}
                      </span>
                      <span>{contrato.plazo} meses</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Vista de detalle próximamente")}
                  >
                    Ver Detalle
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
