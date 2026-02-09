import { ShieldX, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AccessDenied() {
  const handleLogout = () => {
    // Limpiar sesión y redirigir
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
          <CardDescription>
            Tu cuenta no tiene autorización para acceder a este sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>Solo usuarios autorizados pueden acceder</strong>
              <p className="mt-2">
                Este sistema está restringido únicamente a usuarios con correos electrónicos de los siguientes dominios:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code className="bg-muted px-2 py-0.5 rounded">@leasingtim.mx</code></li>
                <li><code className="bg-muted px-2 py-0.5 rounded">@bpads.mx</code></li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm">¿Qué puedo hacer?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Verifica que estés usando tu correo corporativo</li>
                <li>• Contacta al administrador del sistema si necesitas acceso</li>
                <li>• Cierra sesión e intenta con otra cuenta autorizada</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleLogout} 
                variant="default"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Si crees que esto es un error, contacta al administrador del sistema</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
