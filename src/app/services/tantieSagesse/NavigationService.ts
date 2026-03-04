/**
 * TANTIE SAGESSE — NavigationService
 *
 * Singleton qui stocke la fonction `navigate` de React Router.
 * Nécessaire car TantieProvider est monté AU-DESSUS de RouterProvider
 * dans App.tsx — useNavigate() ne peut donc pas être appelé directement
 * dans TantieContext.
 *
 * Pattern :
 *   1. AppLayout (à l'intérieur du Router) appelle setNavigate(navigate)
 *   2. TantieContext appelle NavigationService.navigate(route)
 */

type NavigateFn = (to: string) => void;

let _navigate: NavigateFn | null = null;

export const NavigationService = {
  setNavigate(fn: NavigateFn): void {
    _navigate = fn;
  },

  navigate(to: string): void {
    if (_navigate) {
      _navigate(to);
    } else {
      // Fallback si le service n'est pas encore initialisé
      console.warn('[NavigationService] navigate appelé avant initialisation — route:', to);
    }
  },
};
