import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Configuracion() {
  const [tasaInteres, setTasaInteres] = useState("1.5");
  const [diasGracia, setDiasGracia] = useState("0");
  const [saving, setSaving] = useState(false);

  const { data: configs, isLoading } = trpc.config.getAll.useQuery();
  const setConfigMutation = trpc.config.set.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (configs) {
      const tasaConfig = configs.find(c => c.clave === 'tasa_interes_mensual');
      const diasConfig = configs.find(c => c.clave === 'dias_gracia');
      
      if (tasaConfig) setTasaInteres(tasaConfig.valor);
      if (diasConfig) setDiasGracia(diasConfig.valor);
    }
  }, [configs]);

  const handleSave = async () => {
    setSaving(true);

    try {
      // Validar valores
      const tasaNum = parseFloat(tasaInteres);
      const diasNum = parseInt(diasGracia);

      if (isNaN(tasaNum) || tasaNum < 0) {
        toast.error('La tasa de interés debe ser un número válido mayor o igual a 0');
        setSaving(false);
        return;
      }

      if (isNaN(diasNum) || diasNum < 0) {
        toast.error('Los días de gracia deben ser un número válido mayor o igual a 0');
        setSaving(false);
        return;
      }

      // Guardar tasa de interés
      await setConfigMutation.mutateAsync({
        clave: 'tasa_interes_mensual',
        valor: tasaNum.toString(),
        tipo: 'number',
        descripcion: 'Tasa de interés moratorio mensual (porcentaje)',
      });

      // Guardar días de gracia
      await setConfigMutation.mutateAsync({
        clave: 'dias_gracia',
        valor: diasNum.toString(),
        tipo: 'number',
        descripcion: 'Días de gracia antes de aplicar intereses moratorios',
      });

      // Invalidar queries
      utils.config.getAll.invalidate();

      toast.success('Configuración guardada exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Ajusta los parámetros del sistema de cartera vencida
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Parámetros de Cálculo
          </CardTitle>
          <CardDescription>
            Configura los valores utilizados para calcular intereses moratorios y días de atraso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="tasa-interes">
                  Tasa de Interés Moratorio Mensual (%)
                </Label>
                <Input
                  id="tasa-interes"
                  type="number"
                  step="0.1"
                  min="0"
                  value={tasaInteres}
                  onChange={(e) => setTasaInteres(e.target.value)}
                  placeholder="1.5"
                />
                <p className="text-sm text-muted-foreground">
                  Porcentaje mensual que se aplicará sobre el saldo vencido. Ejemplo: 1.5% mensual
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dias-gracia">
                  Días de Gracia
                </Label>
                <Input
                  id="dias-gracia"
                  type="number"
                  min="0"
                  value={diasGracia}
                  onChange={(e) => setDiasGracia(e.target.value)}
                  placeholder="0"
                />
                <p className="text-sm text-muted-foreground">
                  Número de días después del vencimiento antes de empezar a calcular intereses moratorios
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
          <CardDescription>
            Detalles sobre el funcionamiento del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Cálculo de Intereses Moratorios</h3>
            <p className="text-sm text-muted-foreground">
              Los intereses se calculan con la fórmula: <br />
              <code className="bg-muted px-2 py-1 rounded mt-1 inline-block">
                Intereses = Saldo × (Tasa / 100) × (Días Atraso / 30)
              </code>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Determinación de Estado de Pago</h3>
            <p className="text-sm text-muted-foreground">
              Una factura se considera <strong>PAGADA</strong> cuando su folio NO aparece en el archivo de "Pendientes de Pago". 
              Si el folio está presente en pendientes, se marca como <strong>PENDIENTE</strong>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Consolidación de Sistemas</h3>
            <p className="text-sm text-muted-foreground">
              El sistema consolida automáticamente las facturas de Tim Transp (folios AB) y Tim Value (folios AA), 
              permitiendo una gestión unificada de la cartera vencida.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
