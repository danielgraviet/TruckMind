import { AnimatePresence } from 'framer-motion'
import PersonaAvatar from './PersonaAvatar.jsx'

export default function PersonaGrid({ personas, personaStates }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <AnimatePresence>
        {personas.map((persona, index) => (
          <PersonaAvatar
            key={persona.id}
            persona={persona}
            state={personaStates[persona.id]}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
