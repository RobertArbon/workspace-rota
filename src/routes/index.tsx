import { createFileRoute } from '@tanstack/react-router'
import { Show, SignInButton, SignUpButton } from '@clerk/tanstack-react-start'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div>
      <h1>Home Page </h1>
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
    </div>
  )
}