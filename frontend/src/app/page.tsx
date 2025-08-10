import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center">
      <Container size="sm">
        <div className="text-center mb-8">
          {/* PPD Logo placeholder - replace with actual logo when available */}
          <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-white">PPD</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Consulta Electoral
          </h1>
          <p className="text-gray-600">
            Plataforma Interna PPD • Acceso para Miembros del Equipo
          </p>
        </div>

        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
            <CardDescription>
              Accede a la plataforma de inteligencia electoral
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        {/* Team roles context */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">
            Roles del sistema:
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
            <span className="bg-gray-100 px-2 py-1 rounded">Administradores</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Gerentes de Campaña</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Analistas de Datos</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Voluntarios de Campo</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} Partido Popular Democrático</p>
          <p>Plataforma de Inteligencia Electoral</p>
        </div>
      </Container>
    </div>
  );
}
