export const haptics = {
  light:   () => navigator.vibrate?.(8),
  medium:  () => navigator.vibrate?.(18),
  success: () => navigator.vibrate?.([10, 40, 10]),
  warning: () => navigator.vibrate?.(30),
}
