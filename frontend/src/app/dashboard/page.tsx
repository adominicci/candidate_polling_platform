import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Dashboard PPD
              </h1>
              <p className="text-gray-600 mb-6">
                Panel de control principal - En desarrollo
              </p>
              
              {/* Test Survey Link */}
              <div className="mt-8 space-y-4">
                <Link 
                  href="/survey/test"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  🧪 Test Simple - Click This First
                </Link>
                <p className="text-sm text-gray-500">
                  Prueba básica para verificar que todo funciona
                </p>
                
                <br />
                
                <Link 
                  href="/survey/demo"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  🎯 Demo Formulario de Encuesta
                </Link>
                <p className="text-sm text-gray-500">
                  Versión demo sin autenticación - Acceso completo al sistema de encuestas
                </p>
                
                <div className="mt-4">
                  <Link 
                    href="/survey/ppd_voter_consultation_v1"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    🔒 Formulario Protegido
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    Versión con autenticación completa (requiere login)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}