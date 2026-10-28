// A tiny app-wide pop-up message, e.g. "You're in! 🎉" after joining.
// Call showToast() from anywhere; <ToastHost /> in the root layout shows it.

type Listener = (message: string) => void;

let listener: Listener | null = null;

export function showToast(message: string) {
  listener?.(message);
}

export function setToastListener(next: Listener | null) {
  listener = next;
}
