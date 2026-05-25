export function Spinner({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div
        className="rounded-full border-2 border-accent border-t-transparent animate-spin"
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  )
}
