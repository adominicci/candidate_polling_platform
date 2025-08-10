import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/layout/container'
import { ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function UnauthorizedPage() {
  return (
    <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Container size="sm">
        <div className="w-full max-w-md mx-auto text-center">
          {/* Icon */}
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>

          {/* Error Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">
                Acceso No Autorizado
              </CardTitle>
              <CardDescription>
                No tienes permisos para acceder a esta página
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Tu rol de usuario no permite el acceso a este recurso. 
                Si crees que esto es un error, contacta al administrador del sistema.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/dashboard">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Volver al Dashboard
                  </Link>
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Para reportar problemas de acceso, contacta:
                </p>
                <p className="text-xs">
                  <a 
                    href="mailto:support@ppd.pr" 
                    className="text-primary-600 hover:text-primary-500"
                  >
                    support@ppd.pr
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </main>
  )
}