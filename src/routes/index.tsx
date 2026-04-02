import { createFileRoute } from '@tanstack/react-router'
import { UserButton, Show, SignInButton, SignUpButton } from '@clerk/tanstack-react-start'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div>
      <h1>Index Route</h1>
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
    </div>
  )
}