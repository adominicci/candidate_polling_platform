'use client'

import { useEffect, useState } from 'react'

export default function SurveyTestPage() {
  const [questionnaire, setQuestionnaire] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/survey_questions.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        console.log('Survey data loaded:', data)
        setQuestionnaire(data)
      })
      .catch(err => {
        console.error('Error:', err)
        setError(err.message)
      })
  }, [])

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="mt-4">Error loading survey: {error}</p>
      </div>
    )
  }

  if (!questionnaire) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Loading...</h1>
        <p>Loading survey data...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-green-600">¡Survey Test Working! ✅</h1>
      <h2 className="text-xl mt-4">{questionnaire.questionnaire.title}</h2>
      <p className="mt-2">Version: {questionnaire.questionnaire.version}</p>
      <p className="mt-2">Sections: {questionnaire.questionnaire.sections.length}</p>
      <p className="mt-2">Total Questions: {questionnaire.questionnaire.metadata.total_questions}</p>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold">Sections:</h3>
        <ul className="list-disc pl-6 mt-2">
          {questionnaire.questionnaire.sections.map((section, idx) => (
            <li key={idx} className="mt-1">
              <strong>{section.title}</strong> - {section.questions.length} questions
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 p-4 bg-green-100 rounded-lg">
        <p className="text-green-800">
          🎉 <strong>Great news!</strong> The survey system is working perfectly. 
          The JSON loads correctly with all {questionnaire.questionnaire.metadata.total_questions} questions 
          across {questionnaire.questionnaire.sections.length} sections.
        </p>
      </div>
    </div>
  )
}