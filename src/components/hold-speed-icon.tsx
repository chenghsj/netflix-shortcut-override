import type { ComponentProps } from 'react'

export function HoldSpeedIcon(props: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4 5v14l9-7-9-7zM11 5v14l9-7-9-7z"
        stroke="currentColor"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
    </svg>
  )
}
