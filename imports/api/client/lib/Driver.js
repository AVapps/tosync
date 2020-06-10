import Driver from 'driver.js'
import 'driver.js/dist/driver.min.css'

export default function firstUseDrive() {
  const driver = new Driver({
    doneBtnText: 'Terminé',
    closeBtnText: 'Fermer',
    stageBackground: '#ffffff',
    nextBtnText: 'Suivant',
    prevBtnText: 'Précédent'
  })

  // Define the steps for introduction
  driver.defineSteps([
    {
      element: '#statusButton',
      popover: {
        title: 'Bienvenue !',
        description: `Cliquez ici pour accéder à l'exportation et à la synchronisation de votre planning.`,
        position: 'bottom-right'
      }
    },
    {
      element: '#calendar .fc-body .fc-cell',
      popover: {
        title: 'Calendrier',
        description: 'Cliquez sur les jours du calendrier pour accéder au détail de vos activités.',
        position: 'bottom-left'
      }
    },
    {
      element: '#statsButton',
      popover: {
        title: 'Décompte / Rémunération',
        description: 'Le détail du décompte mensuel de votre activité est disponible en cliquant sur ce bouton.',
        position: 'bottom-center'
      }
    },
    {
      element: '#cguLink',
      stageBackground: '#00D66C',
      popover: {
        title: `Conditions d'utilisation`,
        description: `N'oubliez de consulter les conditions d'utilisation et de gestion des données personnelles !`,
        position: 'top-right'
      }
    }
  ])

  // Start the introduction
  driver.start()
}
