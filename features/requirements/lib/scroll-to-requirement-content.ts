export function scrollToRequirementContent(element: Element | null) {
  element?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: no-preference)")
      .matches
      ? "smooth"
      : "instant",
    block: "center",
  });
}
