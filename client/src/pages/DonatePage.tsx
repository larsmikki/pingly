import { Button, Surface } from '@/components/ui'

const values = [
  { label: '100% free forever', className: 'text-success bg-success/15 border-success/20' },
  { label: 'No ads or tracking', className: 'text-warning bg-warning/15 border-warning/20' },
  { label: 'Your data, your device', className: 'text-accent bg-accent/15 border-accent/20' },
]

const donationLinks = [
  { title: 'Buy Me a Coffee', sub: 'One-time donation, any amount', url: 'https://buymeacoffee.com/larsmikki', label: 'Open Buy Me a Coffee' },
  { title: 'PayPal', sub: 'Quick donation through PayPal', url: 'https://paypal.me/larsmikki', label: 'Open PayPal' },
]

export default function DonatePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-text">Support Pingr</h1>
        <p className="text-sm mt-0.5 text-text2">
          I build privacy-first, self-hosted tools with no subscriptions, no ads, and no tracking. Your data stays yours.
        </p>
      </div>

      <Surface className="p-6 mb-5">
        <h2 className="text-base font-bold mb-1 text-text">What you get</h2>
        <p className="text-xs mb-5 text-text2">Pingr is free, open source, and self-hosted.</p>
        <div className="flex items-center gap-3 flex-wrap">
          {values.map(({ label, className }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${className}`}>
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Surface>

      <Surface className="p-6 mb-5">
        <h2 className="text-base font-bold mb-1 text-text">Donate</h2>
        <p className="text-xs mb-5 text-text2">One-time donations through Buy Me a Coffee or PayPal.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {donationLinks.map(({ title, sub, url, label }) => (
            <div key={title} className="flex flex-col text-center gap-4 rounded-xl p-6 bg-surface2 border border-border">
              <div>
                <h3 className="text-base font-bold leading-snug mb-1 text-text">{title}</h3>
                <p className="text-xs text-text2">{sub}</p>
              </div>
              <Button variant="primary" size="lg" fullWidth onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
                {label}
              </Button>
            </div>
          ))}
        </div>
      </Surface>

      <Surface className="p-6 mb-0">
        <h2 className="text-base font-bold mb-1 text-text">Thank you</h2>
        <p className="text-xs text-text2">Every bit of support helps keep Pingr free for everyone.</p>
      </Surface>
    </div>
  )
}
