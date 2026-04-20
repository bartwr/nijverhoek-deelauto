export function registerServiceWorker() {
	if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker
				.register('/sw.js')
				.then((registration) => {
					console.log('SW registered: ', registration)

					// If an updated worker is already waiting, notify immediately.
					if (registration.waiting) {
						window.dispatchEvent(new Event('pwa-update-available'))
					}

					// Notify UI when a fresh worker finished installing.
					registration.addEventListener('updatefound', () => {
						const newWorker = registration.installing
						if (newWorker) {
							newWorker.addEventListener('statechange', () => {
								if (
									newWorker.state === 'installed' &&
									navigator.serviceWorker.controller
								) {
									window.dispatchEvent(new Event('pwa-update-available'))
								}
							})
						}
					})
				})
				.catch((registrationError) => {
					console.log('SW registration failed: ', registrationError)
				})
		})
	}
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister()
      })
      .catch((error) => {
        console.error(error.message)
      })
  }
}
