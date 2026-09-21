import OnboardingFlow from './OnboardingFlow'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
          <h1 className="text-3xl font-bold text-blue-600">Flexischools</h1>
          <p className="mt-1 text-gray-600">Partner onboarding</p>
        </div>
      </header>
      <main>
        <OnboardingFlow />
      </main>
    </div>
  )
}

export default App
