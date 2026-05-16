import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToMobileBreakpoint,
    getIsMobileSnapshot,
    getServerSnapshot
  )
}

const subscribeToMobileBreakpoint = (callback: () => void) => {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

  mql.addEventListener("change", callback)

  return () => mql.removeEventListener("change", callback)
}

const getIsMobileSnapshot = () => {
  return window.innerWidth < MOBILE_BREAKPOINT
}

const getServerSnapshot = () => {
  return false
}
